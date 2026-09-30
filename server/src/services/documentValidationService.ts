import { extname } from 'node:path';
import { ApiError } from '../utils/errors.js';

const MIME_BY_EXTENSION: Record<string, string[]> = {
  '.pdf': ['application/pdf'],
  '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  '.txt': ['text/plain']
};

export function validateUploadedDocument(file: { originalname: string; mimetype: string; size: number; buffer: Buffer }): '.pdf' | '.docx' | '.txt' {
  const extension = extname(file.originalname).toLowerCase();
  if (!(extension in MIME_BY_EXTENSION)) throw new ApiError(415, 'UNSUPPORTED_FILE_TYPE', 'Only PDF, DOCX, and TXT files are supported');
  if (!MIME_BY_EXTENSION[extension]!.includes(file.mimetype.toLowerCase())) {
    throw new ApiError(415, 'MIME_EXTENSION_MISMATCH', 'The file type does not match its extension');
  }
  if (file.size <= 0 || file.size !== file.buffer.byteLength) throw new ApiError(400, 'INVALID_FILE_SIZE', 'The uploaded file is empty or invalid');
  if (extension === '.pdf' && !file.buffer.subarray(0, 1024).includes(Buffer.from('%PDF-'))) {
    throw new ApiError(400, 'INVALID_PDF_SIGNATURE', 'The file does not have a valid PDF signature');
  }
  if (extension === '.docx' && (file.buffer.length < 4 || file.buffer.readUInt32LE(0) !== 0x04034b50)) {
    throw new ApiError(400, 'INVALID_DOCX_SIGNATURE', 'The file does not have a valid DOCX signature');
  }
  if (extension === '.txt') {
    try { new TextDecoder('utf-8', { fatal: true }).decode(file.buffer); }
    catch { throw new ApiError(400, 'INVALID_TEXT_ENCODING', 'TXT files must be valid UTF-8'); }
  }
  return extension as '.pdf' | '.docx' | '.txt';
}

export function safeOriginalFileName(value: string): string {
  const normalized = value.normalize('NFKC').replace(/[\u0000-\u001f\u007f]/g, '').trim();
  const baseName = normalized.split(/[\\/]/).at(-1)?.slice(0, 255);
  if (!baseName) throw new ApiError(400, 'INVALID_FILE_NAME', 'The file name is invalid');
  return baseName;
}
