import mammoth from 'mammoth';
import { getEnv } from '../config/env.js';
import { ApiError } from '../utils/errors.js';

export type ExtractedPage = { pageNumber: number | null; text: string };

function cleanText(value: string): string {
  return value.normalize('NFKC').replace(/\u0000/g, '').replace(/[\t\f\v ]+/g, ' ').replace(/ *\n */g, '\n').trim();
}

function assertTextLimit(text: string): void {
  if (!text.trim()) throw new ApiError(422, 'NO_EXTRACTABLE_TEXT', 'No readable text could be extracted from this file');
  if (text.length > getEnv().MAX_DOCUMENT_CHARS) throw new ApiError(413, 'DOCUMENT_TEXT_TOO_LARGE', 'The extracted document text exceeds the configured limit');
}

export async function extractDocumentText(extension: '.pdf' | '.docx' | '.txt', bytes: Buffer): Promise<{ pages: ExtractedPage[]; pageCount: number | null; fullText: string }> {
  if (extension === '.txt') {
    let text: string;
    try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
    catch { throw new ApiError(400, 'INVALID_TEXT_ENCODING', 'TXT files must be valid UTF-8'); }
    text = cleanText(text);
    assertTextLimit(text);
    return { pages: [{ pageNumber: null, text }], pageCount: null, fullText: text };
  }

  if (extension === '.docx') {
    try {
      const result = await mammoth.extractRawText({ buffer: bytes });
      const text = cleanText(result.value);
      assertTextLimit(text);
      return { pages: [{ pageNumber: null, text }], pageCount: null, fullText: text };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(400, 'CORRUPTED_DOCX', 'The DOCX document is corrupted or cannot be parsed');
    }
  }

  let pdf: { numPages: number; getPage(page: number): Promise<{ getTextContent(): Promise<{ items: Array<{ str?: string }> }>; cleanup(): void }>; destroy(): Promise<void> } | undefined;
  try {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const loading = pdfjs.getDocument({ data: new Uint8Array(bytes), isEvalSupported: false, useSystemFonts: true });
    pdf = await loading.promise as unknown as NonNullable<typeof pdf>;
    if (pdf.numPages < 1 || pdf.numPages > 2000) throw new ApiError(413, 'PDF_PAGE_LIMIT', 'The PDF must contain between 1 and 2,000 pages');
    const pages: ExtractedPage[] = [];
    let total = 0;
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = cleanText(content.items.map((item) => item.str ?? '').join(' '));
      page.cleanup();
      total += text.length;
      if (total > getEnv().MAX_DOCUMENT_CHARS) throw new ApiError(413, 'DOCUMENT_TEXT_TOO_LARGE', 'The extracted document text exceeds the configured limit');
      if (text) pages.push({ pageNumber, text });
    }
    const fullText = pages.map((page) => page.text).join('\n\n');
    assertTextLimit(fullText);
    return { pages, pageCount: pdf.numPages, fullText };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(400, 'CORRUPTED_PDF', 'The PDF is corrupted, encrypted, or cannot be parsed');
  } finally {
    await pdf?.destroy().catch(() => undefined);
  }
}
