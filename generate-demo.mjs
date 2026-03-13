import { PDFDocument, PDFName, PDFDict, PDFRawStream, PDFArray } from 'pdf-lib';
import fs from 'fs';
import zlib from 'zlib';
import { promisify } from 'util';
const inflate = promisify(zlib.inflate);
const deflate = promisify(zlib.deflate);

function getPng(buf) { return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) }; }

/** Tắt/bật thay hình nền trang đầu */
const REPLACE_BACKGROUND = true;

async function run() {
  const inPath = 'vneid-before.pdf';
  const outPath = 'vneid-demo.pdf';

  if (!fs.existsSync(inPath)) {
    console.error('Input PDF not found:', inPath);
    process.exit(1);
  }

  const pdfDoc = await PDFDocument.load(fs.readFileSync(inPath), { ignoreEncryption: true });

  // Embed logo if exists
  const logoPath = 'public/logo.png';
  let newLogo = null;
  let logoW = 0, logoH = 0;
  if (fs.existsSync(logoPath)) {
    const logoBuf = fs.readFileSync(logoPath);
    ({ w: logoW, h: logoH } = getPng(logoBuf));
    newLogo = await pdfDoc.embedPng(logoBuf);
    console.log('Embedded logo:', logoW, 'x', logoH);
  } else console.log('No logo found at', logoPath);

  // Embed background if exists (accept PNG or JPG)
  const bgCandidates = ['public/background.png', 'public/background.jpg', 'public/background.jpeg'];
  let bgFile = null;
  for (const p of bgCandidates) {
    if (REPLACE_BACKGROUND && fs.existsSync(p)) { bgFile = p; break; }
  }
  let newBg = null;
  let bgW = 0, bgH = 0;
  if (bgFile) {
    const bgBuf = fs.readFileSync(bgFile);
    if (bgFile.toLowerCase().endsWith('.jpg') || bgFile.toLowerCase().endsWith('.jpeg')) {
      newBg = await pdfDoc.embedJpg(bgBuf);
      bgW = newBg.width; bgH = newBg.height;
      console.log('Embedded background (jpg):', bgW, 'x', bgH, 'from', bgFile);
    } else {
      newBg = await pdfDoc.embedPng(bgBuf);
      bgW = newBg.width; bgH = newBg.height;
      console.log('Embedded background (png):', bgW, 'x', bgH, 'from', bgFile);
    }
  } else {
    console.log('No background found at public/background.{png,jpg,jpeg}');
  }

  const firstPage = pdfDoc.getPages()[0];
  const resources = firstPage.node.Resources();
  const xObjValue = resources.get(PDFName.of('XObject'));
  const xObjectDict = pdfDoc.context.lookup(xObjValue, PDFDict);

  if (newBg && xObjectDict.has(PDFName.of('X1'))) {
    // Preserve original X1, assign empty Form to /X1, and put real background under /XBG
    const origRef = xObjectDict.get(PDFName.of('X1'));
    if (origRef) xObjectDict.set(PDFName.of('X1_OLD'), origRef);
    try {
      const emptyBytes = await deflate(Buffer.from('q Q', 'binary'));
      const emptyStream = pdfDoc.context.flateStream(new Uint8Array(emptyBytes), {
        Type: 'XObject', Subtype: 'Form', BBox: pdfDoc.context.obj([0, 0, 1, 1]), FormType: 1,
      });
      const emptyRef = pdfDoc.context.register(emptyStream);
      xObjectDict.set(PDFName.of('X1'), emptyRef);
    } catch (e) {
      xObjectDict.delete(PDFName.of('X1'));
    }
    xObjectDict.set(PDFName.of('XBG'), newBg.ref);
    // add ExtGState
    const extGSKey = PDFName.of('ExtGState');
    let extGSDict;
    const existing = resources.get(extGSKey);
    if (existing) extGSDict = pdfDoc.context.lookup(existing);
    else { extGSDict = pdfDoc.context.obj({}); resources.set(extGSKey, extGSDict); }
    extGSDict.set(PDFName.of('GS_BG50'), pdfDoc.context.obj({ Type: 'ExtGState', ca: 0.1, CA: 0.1 }));
    console.log('Assigned background to /XBG, neutralized /X1, added /GS_BG50 (10% opacity)');
  }

  if (newLogo && xObjectDict.has(PDFName.of('X2'))) {
    xObjectDict.set(PDFName.of('X2'), newLogo.ref);
    console.log('Replaced X2 with logo');
  }

  // Patch content stream for X1 and X2
  const contentsResolved = pdfDoc.context.lookup(firstPage.node.get(PDFName.of('Contents')));
  let rawStream = null;
  if (contentsResolved instanceof PDFRawStream) rawStream = contentsResolved;
  else if (contentsResolved instanceof PDFArray) {
    for (let i = 0; i < contentsResolved.size(); i++) {
      const e = pdfDoc.context.lookup(contentsResolved.get(i));
      if (e instanceof PDFRawStream) {
        const filter = e.dict.get(PDFName.of('Filter'))?.toString();
        let bytes = Buffer.from(e.contents);
        if (filter === '/FlateDecode') {
          try { bytes = await inflate(bytes); } catch {}
        }
        if (bytes.toString('binary').includes('/X1 Do') || bytes.toString('binary').includes('/X2 Do')) { rawStream = e; break; }
      }
    }
  }

  if (rawStream) {
    const isZ = rawStream.dict.get(PDFName.of('Filter'))?.toString() === '/FlateDecode';
    let bytes = Buffer.from(rawStream.contents);
    if (isZ) bytes = await inflate(bytes);
    let text = bytes.toString('binary');
    // Insert pre-content stream that draws /XBG at bottom with vertical shift -300
    if (newBg) {
      const pageWidth = firstPage.getWidth();
      // Scale background to page height so bottom aligns with page bottom
      const pageHeight = firstPage.getHeight();
      const bgDisplayHFull = pageHeight;
      const displayW = bgDisplayHFull * bgW / bgH;
      const verticalShift = -50;
      const ty = verticalShift;
      const preContent = `q\n1 0 0 1 0 0 cm\n/GS_BG50 gs ${displayW.toFixed(2)} 0 0 ${bgDisplayHFull.toFixed(2)} 0 ${ty.toFixed(2)} cm /XBG Do\nQ\n`;
      const preStream = pdfDoc.context.flateStream(Buffer.from(preContent, 'binary'));
      const preRef = pdfDoc.context.register(preStream);
      const contents = firstPage.node.get(PDFName.of('Contents'));
      const resolved = pdfDoc.context.lookup(contents);
      if (resolved instanceof PDFRawStream) {
        const arr = pdfDoc.context.obj([preRef, contents]);
        firstPage.node.set(PDFName.of('Contents'), arr);
      } else if (resolved instanceof PDFArray) {
        const items = [preRef];
        for (let i = 0; i < resolved.size(); i++) items.push(contents.get(i));
        firstPage.node.set(PDFName.of('Contents'), pdfDoc.context.obj(items));
      }
    }

    if (newLogo) {
      const logoDisplayW = 141.73228455;
      const logoDisplayH = logoDisplayW * logoH / logoW;
      const x2Regex = /141\.73228455\s+0\s+0\s+-24\.94488144\s+0\s+24\.94488144\s+cm\s+\/X2\s+Do/;
      // Move logo left by 30pt and up by 70pt relative to previous offsets
      const logoOffsetX = -10 - 30; // -40
      const logoOffsetY = logoDisplayH - 20 - 55; // move up 70pt
      if (x2Regex.test(text)) text = text.replace(x2Regex, `${logoDisplayW} 0 0 -${logoDisplayH} ${logoOffsetX} ${logoOffsetY} cm /X2 Do`);
    }

    const newBytes = isZ ? await deflate(Buffer.from(text, 'binary')) : Buffer.from(text, 'binary');
    rawStream['contents'] = new Uint8Array(newBytes);
    rawStream.dict.set(PDFName.of('Length'), pdfDoc.context.obj(newBytes.length));
  }

  // Bước 3: Sửa Scanned Time (UTC+8 Đài Loan → UTC+7 Việt Nam, -1 giờ)
  // PDF dùng TJ với kerning: [(Scann)1(e)-1(d)1( Time: ...)...] TJ -> cần ghép các phần lại
  {
    const allContentsObj = pdfDoc.context.lookup(firstPage.node.get(PDFName.of('Contents')));
    const allStreams = [];
    if (allContentsObj instanceof PDFRawStream) allStreams.push(allContentsObj);
    else if (allContentsObj instanceof PDFArray) {
      for (let i = 0; i < allContentsObj.size(); i++) {
        const e = pdfDoc.context.lookup(allContentsObj.get(i));
        if (e instanceof PDFRawStream) allStreams.push(e);
      }
    }
    console.log(`[ScannedTime] Kiểm tra ${allStreams.length} content stream`);

    for (const stream of allStreams) {
      const isZ = stream.dict.get(PDFName.of('Filter'))?.toString() === '/FlateDecode';
      let bytes = Buffer.from(stream.contents);
      if (isZ) { try { bytes = await inflate(bytes); } catch { continue; } }
      let text = bytes.toString('binary');

      if (!text.includes('Scann')) continue;

      // Match TJ array chứa "Scann" (bất kể cách split)
      const tjRegex = /\[([^[\]]*Scann[^[\]]*)]\s*TJ/g;
      const fixed = text.replace(tjRegex, (fullMatch, tjContent) => {
        const parts = [];
        const partRe = /\(([^)]*)\)/g;
        let pm;
        while ((pm = partRe.exec(tjContent)) !== null) parts.push(pm[1]);
        const fullText = parts.join('');
        console.log(`[ScannedTime] TJ text được ghép: ${JSON.stringify(fullText)}`);

        const dtM = /(\d{4}-\d{2}-\d{2}) (\d{2}):(\d{2}):(\d{2})/.exec(fullText);
        if (!dtM) {
          console.log(`[ScannedTime] Không tìm thấy datetime trong: ${JSON.stringify(fullText)}`);
          return fullMatch;
        }

        let hour = parseInt(dtM[2], 10) - 1;
        let dateStr = dtM[1];
        if (hour < 0) {
          hour = 23;
          const d = new Date(dateStr + 'T00:00:00Z');
          d.setUTCDate(d.getUTCDate() - 1);
          dateStr = d.toISOString().slice(0, 10);
        }
        const newFullText = fullText.replace(
          dtM[0],
          `${dateStr} ${String(hour).padStart(2, '0')}:${dtM[3]}:${dtM[4]}`,
        );
        console.log(`[ScannedTime] Sửa: "${dtM[0]}" → "${dateStr} ${String(hour).padStart(2, '0')}:${dtM[3]}:${dtM[4]}"`);
        return `(${newFullText}) Tj`;
      });

      if (fixed !== text) {
        const nb = isZ ? await deflate(Buffer.from(fixed, 'binary')) : Buffer.from(fixed, 'binary');
        stream['contents'] = new Uint8Array(nb);
        stream.dict.set(PDFName.of('Length'), pdfDoc.context.obj(nb.length));
        console.log('[ScannedTime] ✓ Đã sửa thành giờ Việt Nam (UTC+7)');
      } else {
        console.log('[ScannedTime] Không tìm thấy TJ chứa "Scann" trong stream');
      }
    }
  }

  const out = Buffer.from(await pdfDoc.save());
  fs.writeFileSync(outPath, out);
  console.log('Wrote demo PDF:', outPath, 'size', (out.length/1024).toFixed(1), 'KB');
}

run().catch(e => { console.error('ERROR:', e); process.exit(1); });
