import { PDFDocument, PDFName, PDFDict, PDFRawStream, PDFArray } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import { promisify } from 'util';
import { Logger } from '@nestjs/common';

const inflate = promisify(zlib.inflate);
const deflate = promisify(zlib.deflate);

const logger = new Logger('PdfLogoReplacer');

/**
 * Đọc chiều rộng & chiều cao (pixel) từ header của file PNG.
 * Theo chuẩn PNG: 8 byte signature, tiếp theo là chunk IHDR chứa
 *   width  (4 byte big-endian) tại offset 16
 *   height (4 byte big-endian) tại offset 20
 */
function getPngDimensions(buf: Buffer): { width: number; height: number } {
  return {
    width: buf.readUInt32BE(16),
    height: buf.readUInt32BE(20),
  };
}

/**
 * Thay thế logo VNeID (XObject /X2 trên trang đầu) bằng logo của chúng ta.
 *
 * Chiều RỘNG hiển thị giữ nguyên bằng logo cũ (~141.73 pt).
 * Chiều CAO được tính lại để giữ đúng tỉ lệ chiều rộng/chiều cao của logo.png,
 * tránh méo hình.
 *
 * Cơ chế: PDF content stream chứa lệnh `cm` (concat matrix) dạng:
 *   141.73228455 0 0 -24.94488144 0 24.94488144 cm /X2 Do
 * Hàm này giải nén stream, thay giá trị height (-24.94 / 24.94) bằng giá trị
 * mới tính từ tỉ lệ ảnh, rồi nén lại.
 *
 * Trả về buffer gốc nếu có lỗi để đảm bảo báo cáo không bao giờ bị mất.
 */
export async function replaceFirstPageLogo(pdfBuffer: Buffer): Promise<Buffer> {
  try {
    const logoPath = path.join(process.cwd(), 'public', 'logo.png');
    if (!fs.existsSync(logoPath)) {
      logger.warn('logo.png not found at public/logo.png – skipping logo replacement');
      return pdfBuffer;
    }

    const logoPngBuffer = fs.readFileSync(logoPath);
    const { width: logoW, height: logoH } = getPngDimensions(logoPngBuffer);
    logger.log(`Logo PNG dimensions: ${logoW}×${logoH} px`);

    const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
    const newLogo = await pdfDoc.embedPng(logoPngBuffer);

    const pages = pdfDoc.getPages();
    if (pages.length === 0) {
      logger.warn('PDF has no pages – skipping logo replacement');
      return pdfBuffer;
    }
    const firstPage = pages[0];

    // ── Bước 1: Thay /X2 trong Resources của trang 1 ─────────────────────────
    const resources = firstPage.node.Resources();
    if (!resources) {
      logger.warn('First page has no Resources dictionary – skipping');
      return pdfBuffer;
    }
    const xObjValue = resources.get(PDFName.of('XObject'));
    if (!xObjValue) {
      logger.warn('No XObject dictionary on first page – skipping');
      return pdfBuffer;
    }
    const xObjectDict = pdfDoc.context.lookup(xObjValue, PDFDict);
    if (!xObjectDict || !xObjectDict.has(PDFName.of('X2'))) {
      logger.warn('XObject /X2 not found on first page – skipping');
      return pdfBuffer;
    }
    xObjectDict.set(PDFName.of('X2'), newLogo.ref);

    // ── Bước 2: Sửa ma trận cm trong content stream để giữ tỉ lệ ──────────────
    // Chiều rộng hiển thị giữ nguyên; chiều cao tính lại từ tỉ lệ logo.png
    const displayWidth  = 141.73228455;           // pt – giữ nguyên
    const origHeight    = 24.94488144;            // pt – chiều cao logo cũ
    const displayHeight = displayWidth * logoH / logoW; // pt – chiều cao mới
    logger.log(
      `Display size: ${displayWidth.toFixed(2)}×${displayHeight.toFixed(2)} pt` +
      ` (was ×${origHeight.toFixed(2)} pt)`,
    );

    // Tìm content stream chứa lệnh /X2 Do
    const contentsVal = firstPage.node.get(PDFName.of('Contents'));
    if (contentsVal) {
      const contentsResolved = pdfDoc.context.lookup(contentsVal);

      // Content có thể là stream đơn hoặc mảng các stream
      let rawStream: PDFRawStream | null = null;

      if (contentsResolved instanceof PDFRawStream) {
        rawStream = contentsResolved;
      } else if (contentsResolved instanceof PDFArray) {
        for (let i = 0; i < contentsResolved.size(); i++) {
          const entry = pdfDoc.context.lookup(contentsResolved.get(i));
          if (!(entry instanceof PDFRawStream)) continue;

          // Kiểm tra stream này có chứa /X2 Do không
          const filter = entry.dict.get(PDFName.of('Filter'));
          let bytes = Buffer.from(entry.contents);
          if (filter?.toString() === '/FlateDecode') {
            try { bytes = await inflate(bytes); } catch { /* thử stream tiếp */ }
          }
          if (bytes.toString('binary').includes('/X2 Do')) {
            rawStream = entry;
            break;
          }
        }
      }

      if (rawStream) {
        const filterVal = rawStream.dict.get(PDFName.of('Filter'));
        const isCompressed = filterVal?.toString() === '/FlateDecode';
        let bytes = Buffer.from(rawStream.contents);
        if (isCompressed) bytes = await inflate(bytes);

        let text = bytes.toString('binary');

        // Tìm và thay ma trận cm của /X2
        // Dạng: 141.73228455 0 0 -24.94488144 0 24.94488144 cm /X2 Do
        const cmRegex =
          /141\.73228455\s+0\s+0\s+-24\.94488144\s+0\s+24\.94488144\s+cm\s+\/X2\s+Do/;

        if (cmRegex.test(text)) {
          text = text.replace(
            cmRegex,
            `141.73228455 0 0 -${displayHeight} -50 ${displayHeight - 70} cm /X2 Do`,
          );
          logger.log('Content stream cm matrix patched for /X2 (aspect ratio preserved)');
        } else {
          logger.warn(
            'cm matrix pattern for /X2 not found in content stream – ' +
            'logo image may still appear stretched',
          );
        }

        const newBytes = isCompressed
          ? await deflate(Buffer.from(text, 'binary'))
          : Buffer.from(text, 'binary');

        // contents là readonly về kiểu nhưng có thể ghi ở runtime
        (rawStream as { contents: Uint8Array }).contents = new Uint8Array(newBytes);
        // Cập nhật Length (thay ref gián tiếp bằng integer trực tiếp)
        rawStream.dict.set(PDFName.of('Length'), pdfDoc.context.obj(newBytes.length));
      } else {
        logger.warn('Could not locate page 1 content stream – logo may appear stretched');
      }
    }

    logger.log('PDF logo replacement complete');
    const result = await pdfDoc.save();
    return Buffer.from(result);
  } catch (err: any) {
    logger.error('Failed to replace logo in PDF, returning original:', err?.message);
    return pdfBuffer;
  }
}
