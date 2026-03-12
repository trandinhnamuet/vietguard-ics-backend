import { PDFDocument, PDFName, PDFRawStream, PDFArray } from 'pdf-lib';
import fs from 'fs';
import zlib from 'zlib';
import { promisify } from 'util';
const inflate = promisify(zlib.inflate);

const path = 'vneid-demo.pdf';
const pdfBuf = fs.readFileSync(path);
const pdfDoc = await PDFDocument.load(pdfBuf, { ignoreEncryption: true });
const firstPage = pdfDoc.getPages()[0];
function isFlate(stream) {
  try { return stream.dict.get(PDFName.of('Filter'))?.toString() === '/FlateDecode'; } catch { return false; }
}

// Print Resources XObject entries
try {
  const res = firstPage.node.Resources();
  if (res) {
    const xObjVal = res.get(PDFName.of('XObject'));
    console.log('Page Resources XObject:', !!xObjVal ? xObjVal.toString() : 'none');
    if (xObjVal) {
      const xObjDict = pdfDoc.context.lookup(xObjVal);
      console.log('XObject dict keys:');
      try {
        const keys = xObjDict.keys ? xObjDict.keys() : Object.keys(xObjDict.dict || {});
        console.log(keys);
      } catch (e) {
        console.log('Could not list keys', e.message || e);
      }
    }
  } else {
    console.log('No Resources on page');
  }
} catch (e) {
  console.log('Error reading Resources:', e.message || e);
}

const contentsVal = firstPage.node.get(PDFName.of('Contents'));
if (!contentsVal) {
  console.log('No Contents on page 1');
  process.exit(0);
}

const streams = [];
const resolved = pdfDoc.context.lookup(contentsVal);
if (resolved instanceof PDFRawStream) streams.push({ stream: resolved, ref: contentsVal });
else if (resolved instanceof PDFArray) {
  for (let i = 0; i < resolved.size(); i++) {
    const ref = contentsVal.get(i);
    const e = pdfDoc.context.lookup(ref);
    if (e instanceof PDFRawStream) streams.push({ stream: e, ref });
  }
}

for (let i = 0; i < streams.length; i++) {
  const { stream, ref } = streams[i];
  const compressed = isFlate(stream);
  let bytes = Buffer.from(stream.contents);
  if (compressed) {
    try { bytes = await inflate(bytes); } catch (e) { /* ignore */ }
  }
  const text = bytes.toString('binary');
  console.log(`--- Stream ${i} (compressed=${compressed}) length=${bytes.length} ---`);

  const foundBg = text.match(/\/GS_BG50 gs|\/X1 Do/g);
  if (foundBg) {
    console.log('Found tokens:', foundBg);
  }

  // Print all /X1 Do matches with 120 bytes of context
  const regex = /[-0-9\.\s]+cm\s+\/X1\s+Do/g;
  let m;
  let count = 0;
  while ((m = regex.exec(text)) !== null) {
    count++;
    const idx = m.index;
    const start = Math.max(0, idx - 120);
    const end = Math.min(text.length, idx + m[0].length + 40);
    const snippet = text.substring(start, end).replace(/\r?\n/g, '\\n');
    console.log(`Match ${count}:`, m[0].trim());
    console.log('Context:', snippet);
  }

  // always show the uncompressed stream text head for diagnosis
  const head = text.substring(0, 600).replace(/\r?\n/g, '\\n');
  console.log('Stream text head (first 600 chars):', head);
}
