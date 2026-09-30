import type { ExtractedPage } from './documentExtractionService.js';

export type TextChunk = { chunkIndex: number; content: string; pageNumber: number | null; tokenCount: number };

const TARGET_CHARS = 4_800;
const OVERLAP_CHARS = 480;

function boundaryAt(text: string, start: number, desiredEnd: number): number {
  if (desiredEnd >= text.length) return text.length;
  const floor = Math.min(desiredEnd, start + Math.floor(TARGET_CHARS * 0.65));
  const candidates = [text.lastIndexOf('\n\n', desiredEnd), text.lastIndexOf('. ', desiredEnd), text.lastIndexOf(' ', desiredEnd)];
  return candidates.find((position) => position >= floor) ?? desiredEnd;
}

export function chunkPages(pages: ExtractedPage[]): TextChunk[] {
  const result: TextChunk[] = [];
  for (const page of pages) {
    const text = page.text.trim();
    if (!text) continue;
    let start = 0;
    while (start < text.length) {
      const end = boundaryAt(text, start, Math.min(start + TARGET_CHARS, text.length));
      const content = text.slice(start, end).trim();
      if (content) result.push({ chunkIndex: result.length, content, pageNumber: page.pageNumber, tokenCount: Math.ceil(content.length / 4) });
      if (end >= text.length) break;
      start = Math.max(start + 1, end - OVERLAP_CHARS);
    }
  }
  return result;
}
