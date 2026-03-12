import { PDFDocument, PDFName, PDFDict, PDFRawStream, PDFArray } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import { promisify } from 'util';
import { Logger } from '@nestjs/common';

const inflate = promisify(zlib.inflate);
const deflate = promisify(zlib.deflate);

const logger = new Logger('PdfLogoReplacer');

/** Đọc kích thước pixel từ PNG header (offset 16–20) */
function getPngDimensions(buf: Buffer): { width: number; height: number } {
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

/**
 * Xử lý PDF nhận từ external API trước khi gửi cho người dùng:
 *  - Thay hình nền trang 1 (/X1) bằng public/background.png, giữ tỉ lệ gốc,
 *    và làm mờ 50% bằng cách chèn ExtGState (ca=0.5).
 *  - Thay logo trang 1 (/X2) bằng public/logo.png, giữ tỉ lệ gốc, căn vị trí.
 * Trả về buffer gốc nếu có bất kỳ lỗi nào để báo cáo không bao giờ bị mất.
 */
export async function replaceFirstPageLogo(pdfBuffer: Buffer): Promise<Buffer> {
  try {
    // ── Đọc ảnh từ disk ──────────────────────────────────────────────────────
    const logoPath = path.join(process.cwd(), 'public', 'logo.png');
    if (!fs.existsSync(logoPath)) {
      logger.warn('logo.png not found – skipping');
      return pdfBuffer;
    }
    const logoBuffer = fs.readFileSync(logoPath);
    const { width: logoW, height: logoH } = getPngDimensions(logoBuffer);
    logger.log(`Logo: ${logoW}×${logoH} px`);

    const bgPath = path.join(process.cwd(), 'public', 'background.png');
    const hasBg = fs.existsSync(bgPath);
    let bgBuffer: Buffer | null = null;
    let bgW = 0, bgH = 0;
    if (hasBg) {
      bgBuffer = fs.readFileSync(bgPath);
      ({ width: bgW, height: bgH } = getPngDimensions(bgBuffer));
      logger.log(`Background: ${bgW}×${bgH} px`);
    }

    // ── Load PDF + nhúng ảnh ─────────────────────────────────────────────────
    const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
    const newLogo = await pdfDoc.embedPng(logoBuffer);
    const newBg   = hasBg ? await pdfDoc.embedPng(bgBuffer!) : null;

    const pages = pdfDoc.getPages();
    if (pages.length === 0) return pdfBuffer;
    const firstPage = pages[0];

    // ── Bước 1: Thay XObject trong Resources ────────────────────────────────
    const resources = firstPage.node.Resources();
    if (!resources) return pdfBuffer;

    const xObjValue = resources.get(PDFName.of('XObject'));
    if (!xObjValue) return pdfBuffer;
    const xObjectDict = pdfDoc.context.lookup(xObjValue, PDFDict);
    if (!xObjectDict) return pdfBuffer;

    // Thay /X1 (hình nền)
    if (newBg && xObjectDict.has(PDFName.of('X1'))) {
      // Preserve original X1 under a new name so content's /X1 Do can be
      // made effectively a no-op by assigning an empty Form to /X1.
      const origRef = xObjectDict.get(PDFName.of('X1'));
      if (origRef) {
        xObjectDict.set(PDFName.of('X1_OLD'), origRef);
      }

      // Create an empty Form XObject for /X1 so existing /X1 Do does nothing.
      try {
        const emptyBytes = await deflate(Buffer.from('q Q', 'binary'));
        const emptyStream = pdfDoc.context.flateStream(new Uint8Array(emptyBytes), {
          Type: 'XObject', Subtype: 'Form', BBox: pdfDoc.context.obj([0, 0, 1, 1]), FormType: 1,
        });
        const emptyRef = pdfDoc.context.register(emptyStream);
        xObjectDict.set(PDFName.of('X1'), emptyRef);
      } catch (e) {
        // If creating empty Form fails, fall back to removing X1 reference
        xObjectDict.delete(PDFName.of('X1'));
      }

      // Put the real background under a new name /XBG and draw that from pre-stream
      xObjectDict.set(PDFName.of('XBG'), newBg.ref);
      logger.log('Assigned background.png to /XBG and neutralized /X1 (saved original as /X1_OLD)');

      // Thêm ExtGState cho 50% opacity vào Resources của trang
      // PDF dùng /ca (fill alpha) cho ảnh raster
      const extGSKey = PDFName.of('ExtGState');
      let extGSDict: PDFDict;
      const existingEGS = resources.get(extGSKey);
      if (existingEGS) {
        extGSDict = pdfDoc.context.lookup(existingEGS) as PDFDict;
      } else {
        extGSDict = pdfDoc.context.obj({}) as PDFDict;
        resources.set(extGSKey, extGSDict);
      }
      // /GS_BG50: graphics state với fill và stroke alpha = 0.5
      extGSDict.set(
        PDFName.of('GS_BG50'),
        pdfDoc.context.obj({ Type: 'ExtGState', ca: 0.5, CA: 0.5 }),
      );
      logger.log('Added /GS_BG50 ExtGState (50% opacity)');
    }

    // Thay /X2 (logo)
    if (xObjectDict.has(PDFName.of('X2'))) {
      xObjectDict.set(PDFName.of('X2'), newLogo.ref);
      logger.log('Replaced /X2 with logo.png');
    }

    // ── Bước 2: Patch content stream ────────────────────────────────────────
    // Chiều rộng logo giữ nguyên (141.73 pt), chiều cao tính lại theo tỉ lệ
    const logoDisplayW = 141.73228455;
    const logoDisplayH = logoDisplayW * logoH / logoW;

    // Hình nền: giữ nguyên chiều rộng trang (593.84 pt), chiều cao tính lại
    const bgPageW      = 593.84259033;
    const bgDisplayH   = hasBg ? bgPageW * bgH / bgW : 840;
    if (hasBg) {
      logger.log(`Background display: ${bgPageW.toFixed(2)}×${bgDisplayH.toFixed(2)} pt (was ×840 pt)`);
    }

    const contentsVal = firstPage.node.get(PDFName.of('Contents'));
    if (contentsVal) {
      const contentsResolved = pdfDoc.context.lookup(contentsVal);

      // If Contents is an array, we will iterate and patch every stream that
      // contains /X1 or /X2. This is more robust than only patching the first match.
      const streamsToPatch: Array<{ entryRef: any; entry: PDFRawStream }> = [];
      if (contentsResolved instanceof PDFRawStream) {
        streamsToPatch.push({ entryRef: contentsVal, entry: contentsResolved });
      } else if (contentsResolved instanceof PDFArray) {
        for (let i = 0; i < contentsResolved.size(); i++) {
          const ref = contentsResolved.get(i);
          const entry = pdfDoc.context.lookup(ref);
          if (!(entry instanceof PDFRawStream)) continue;
          const filter = entry.dict.get(PDFName.of('Filter'));
          let bytes = Buffer.from(entry.contents);
          if (filter?.toString() === '/FlateDecode') {
            try { bytes = await inflate(bytes); } catch { /* skip invalid */ }
          }
          const text = bytes.toString('binary');
          if (text.includes('/X1 Do') || text.includes('/X2 Do')) {
            streamsToPatch.push({ entryRef: ref, entry });
          }
        }
      }

      // Insert a new content stream *before* existing contents to draw
      // the background with a reset transform so it's anchored to page bottom.
      if (newBg) {
        try {
          const pageWidth = firstPage.getWidth();
          const bgDisplayHActual = pageWidth * bgH / bgW;
          const verticalShift = 0; // raise background by 150pt (negative moves down)
          // Scale background to page height so bottom aligns with page bottom
          const pageHeight = firstPage.getHeight();
          const bgDisplayHFull = pageHeight;
          const displayW = bgDisplayHFull * bgW / bgH;
          const ty = verticalShift; // place image bottom at verticalShift (negative moves down)
          const preContent = `q\n1 0 0 1 0 0 cm\n/GS_BG50 gs ${displayW} 0 0 ${bgDisplayHFull} 0 ${ty} cm /XBG Do\nQ\n`;
          const preStream = pdfDoc.context.flateStream(Buffer.from(preContent, 'binary'));
          const preRef = pdfDoc.context.register(preStream);

          // Replace Contents: if single stream -> make array [pre, old]
          const contentsVal = firstPage.node.get(PDFName.of('Contents'));
          if (contentsVal) {
            const contentsResolved = pdfDoc.context.lookup(contentsVal);
            if (contentsResolved instanceof PDFRawStream) {
              const arr = pdfDoc.context.obj([preRef, contentsVal]);
              firstPage.node.set(PDFName.of('Contents'), arr);
            } else if (contentsResolved instanceof PDFArray) {
              // Build new array with preRef followed by existing refs
              const items: any[] = [preRef];
              for (let i = 0; i < contentsResolved.size(); i++) {
                items.push(contentsResolved.get(i));
              }
              const newArr = pdfDoc.context.obj(items);
              firstPage.node.set(PDFName.of('Contents'), newArr);
            }
            logger.log('Inserted pre-content stream to anchor background at bottom');
          }
        } catch (e) {
          logger.warn('Failed to insert pre-content stream:', (e as Error).message);
        }
      }

      if (streamsToPatch.length === 0) {
        logger.warn('No content streams found that reference /X1 or /X2');
      }

      // Process every matched stream and apply neutralization and X2 patching
      for (const item of streamsToPatch) {
        const entry = item.entry;
        const isCompressed = entry.dict.get(PDFName.of('Filter'))?.toString() === '/FlateDecode';
        let bytes = Buffer.from(entry.contents);
        if (isCompressed) {
          try { bytes = await inflate(bytes); } catch { /* continue with raw bytes */ }
        }
        let text = bytes.toString('binary');

        // Detect and adjust any "Scanned Time: YYYY-MM-DD HH:MM:SS" timestamps
        // (source is Taiwan time, UTC+8). Subtract 1 hour to convert to Vietnam
        // time (UTC+7). If decrement crosses day boundaries, Date handles it.
        const scannedTimeRegex = /(\(?Scanned Time:\s*)(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})(\)?)/g;
        let scannedReplaced = false;
        text = text.replace(scannedTimeRegex, (_m, prefix, Y, Mo, D, hh, mm, ss, suffix) => {
          const year = parseInt(Y, 10);
          const month = parseInt(Mo, 10) - 1;
          const day = parseInt(D, 10);
          const hour = parseInt(hh, 10);
          const minute = parseInt(mm, 10);
          const second = parseInt(ss, 10);
          const dt = new Date(year, month, day, hour, minute, second);
          dt.setHours(dt.getHours() - 1);
          const pad = (n: number) => n.toString().padStart(2, '0');
          const newDate = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
          const newTime = `${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`;
          scannedReplaced = true;
          return `${prefix}${newDate} ${newTime}${suffix || ''}`;
        });
        if (scannedReplaced) logger.log("Adjusted 'Scanned Time' timestamps to Vietnam time (-1h)");

        // Aggressively remove any variants that draw /X1 to prevent the original
        // content from re-drawing the background. This pattern covers optional
        // preceding graphics-state calls (`/... gs`) and optional `cm` matrices.
        const aggressiveX1Regex = /(?:\/\w+\s+gs\s*)?(?:[-0-9\.\s]+cm\s*)?\/X1\s+Do/gi;
        if (aggressiveX1Regex.test(text)) {
          text = text.replace(aggressiveX1Regex, '');
          logger.log('Aggressively removed /X1 draw variants from stream');
        }
        // Also remove any isolated GS references for our background if present
        const gsBgRegex = /\/GS_BG50\s+gs/gi;
        if (gsBgRegex.test(text)) {
          text = text.replace(gsBgRegex, '');
          logger.log('Removed inline /GS_BG50 gs from stream');
        }

        // Patch /X2: adjust height and keep offsets
        const x2Regex = /141\.73228455\s+0\s+0\s+-24\.94488144\s+0\s+24\.94488144\s+cm\s+\/X2\s+Do/;
        if (x2Regex.test(text)) {
          // Move logo left by 30pt and up by 70pt relative to previous offsets
          const logoOffsetX = -10 - 30; // -40
          // Move logo up 70pt relative to baseline offset
          const logoOffsetY = logoDisplayH - 20 - 70; // move up 70pt
          text = text.replace(
            x2Regex,
            `${logoDisplayW} 0 0 -${logoDisplayH} ${logoOffsetX} ${logoOffsetY} cm /X2 Do`,
          );
          logger.log('Patched /X2 cm matrix (position adjusted)');
        } else {
          logger.warn('/X2 cm pattern not found in content stream');
        }

        const newBytes = isCompressed
          ? await deflate(Buffer.from(text, 'binary'))
          : Buffer.from(text, 'binary');

        (entry as { contents: Uint8Array }).contents = new Uint8Array(newBytes);
        entry.dict.set(PDFName.of('Length'), pdfDoc.context.obj(newBytes.length));
      }
    }

    logger.log('PDF processing complete');
    return Buffer.from(await pdfDoc.save());
  } catch (err: any) {
    logger.error('Failed to process PDF, returning original:', err?.message);
    return pdfBuffer;
  }
}
