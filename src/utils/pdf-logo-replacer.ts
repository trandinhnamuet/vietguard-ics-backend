import { PDFDocument, PDFName, PDFDict } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '@nestjs/common';

const logger = new Logger('PdfLogoReplacer');

/**
 * Replaces the VNeID logo (XObject /X2 on the first page) with our own logo.
 *
 * The external API PDF always has:
 *   - First-page Resources: { XObject: { X1: <background>, X2: <logo> } }
 *   - X2 is a 500×88 PNG displayed at ~141.73×24.94 pt via a `cm` transform.
 *
 * We embed our logo.png and point X2 at the new image so the position/size
 * of the display area stays identical.
 *
 * Falls back to the original buffer on any error so the report is never lost.
 */
export async function replaceFirstPageLogo(pdfBuffer: Buffer): Promise<Buffer> {
  try {
    const logoPath = path.join(process.cwd(), 'public', 'logo.png');

    if (!fs.existsSync(logoPath)) {
      logger.warn('logo.png not found at public/logo.png – skipping logo replacement');
      return pdfBuffer;
    }

    const logoPngBuffer = fs.readFileSync(logoPath);

    const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });

    // Embed new logo PNG (pdf-lib handles RGBA transparency / SMask automatically)
    const newLogo = await pdfDoc.embedPng(logoPngBuffer);

    const pages = pdfDoc.getPages();
    if (pages.length === 0) {
      logger.warn('PDF has no pages – skipping logo replacement');
      return pdfBuffer;
    }

    const firstPage = pages[0];

    // Access the page Resources dictionary
    const resources = firstPage.node.Resources();
    if (!resources) {
      logger.warn('First page has no Resources dictionary – skipping logo replacement');
      return pdfBuffer;
    }

    // Access the XObject sub-dictionary
    const xObjKey = PDFName.of('XObject');
    const xObjValue = resources.get(xObjKey);
    if (!xObjValue) {
      logger.warn('No XObject dictionary found on first page – skipping logo replacement');
      return pdfBuffer;
    }

    const xObjectDict = pdfDoc.context.lookup(xObjValue, PDFDict);
    if (!xObjectDict) {
      logger.warn('Could not resolve XObject dictionary – skipping logo replacement');
      return pdfBuffer;
    }

    // Replace /X2 (the VNeID logo) with our new logo
    const x2Key = PDFName.of('X2');
    if (!xObjectDict.has(x2Key)) {
      logger.warn('XObject /X2 not found on first page – skipping logo replacement');
      return pdfBuffer;
    }

    xObjectDict.set(x2Key, newLogo.ref);

    logger.log('Successfully replaced /X2 logo on first page');

    const modifiedBytes = await pdfDoc.save();
    return Buffer.from(modifiedBytes);
  } catch (err: any) {
    logger.error('Failed to replace logo in PDF, returning original:', err?.message);
    return pdfBuffer;
  }
}
