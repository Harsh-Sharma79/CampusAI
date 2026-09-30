import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { Router } from 'express';
import multer from 'multer';
import { prisma } from '../config/prisma.js';
import { requireAuth, requireStudent } from '../middleware/requireAuth.js';
import { findOwnedDocument, listOwnedDocuments } from '../repositories/documentRepository.js';
import { enqueueBackgroundJob } from '../jobs/queueService.js';
import { storageService } from '../storage/storageService.js';
import { safeOriginalFileName, validateUploadedDocument } from '../services/documentValidationService.js';
import { ApiError } from '../utils/errors.js';
import { asyncHandler, pathParam, validateRequest } from '../utils/http.js';
import { documentIdParams, documentListQuery, documentUploadFields } from '../validators/documentSchemas.js';

export const documentRoutes = Router();
const parsedLimit = Number(process.env.MAX_UPLOAD_MB ?? 25);
const uploadLimitBytes = Number.isFinite(parsedLimit) ? Math.min(100, Math.max(1, parsedLimit)) * 1024 * 1024 : 25 * 1024 * 1024;
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: uploadLimitBytes, files: 1, fields: 8, parts: 9 } });

documentRoutes.use(requireAuth, requireStudent);

documentRoutes.post('/upload', upload.single('file'), validateRequest({ body: documentUploadFields }), asyncHandler(async (req, res) => {
  const file = req.file;
  if (!file) throw new ApiError(400, 'FILE_REQUIRED', 'Upload one PDF, DOCX, or TXT file');
  const input = req.body as { subjectId?: string; topicId?: string; documentType: 'SYLLABUS' | 'NOTES' | 'PREVIOUS_YEAR_PAPER' | 'OTHER' };
  const userId = req.auth!.userId;
  let subjectId = input.subjectId ?? null;
  if (input.topicId) {
    const topic = await prisma.topic.findFirst({ where: { id: input.topicId, ownerId: userId }, select: { id: true, subjectId: true } });
    if (!topic) throw new ApiError(404, 'TOPIC_NOT_FOUND', 'Topic not found');
    if (subjectId && topic.subjectId !== subjectId) throw new ApiError(400, 'SOURCE_SCOPE_MISMATCH', 'The selected topic does not belong to the selected subject');
    subjectId = topic.subjectId;
  }
  if (subjectId && !await prisma.subject.findFirst({ where: { id: subjectId, ownerId: userId }, select: { id: true } })) {
    throw new ApiError(404, 'SUBJECT_NOT_FOUND', 'Subject not found');
  }
  const fileName = safeOriginalFileName(file.originalname);
  const extension = validateUploadedDocument({ originalname: fileName, mimetype: file.mimetype, size: file.size, buffer: file.buffer });
  const storageKey = `${userId}/${randomUUID()}${extname(fileName).toLowerCase()}`;
  await storageService.put(storageKey, file.buffer, file.mimetype);
  try {
    const document = await prisma.document.create({ data: {
      ownerId: userId, subjectId, topicId: input.topicId ?? null,
      fileName, storageKey, mimeType: file.mimetype, fileSize: file.size,
      checksum: await (async () => { const { createHash } = await import('node:crypto'); return createHash('sha256').update(file.buffer).digest('hex'); })(),
      documentType: input.documentType, status: 'UPLOADING'
    }, select: { id: true, fileName: true, documentType: true, status: true, createdAt: true, subject: { select: { id: true, name: true } } } });
    await prisma.learningActivity.create({ data: { userId, subjectId, type: 'DOCUMENT_UPLOADED', metadata: { documentId: document.id, documentType: input.documentType } } });
    const job = await enqueueBackgroundJob({ userId, type: 'PROCESS_DOCUMENT', payload: { documentId: document.id } });
    res.status(202).json({ success: true, data: { document, jobId: job.id, processingStatus: 'UPLOADING' } });
  } catch (error) {
    await storageService.delete(storageKey).catch(() => undefined);
    throw error;
  }
}));

documentRoutes.get('/', validateRequest({ query: documentListQuery }), asyncHandler(async (req, res) => {
  const query = res.locals.validatedRequest.query as { cursor?: string; limit: number; status?: 'UPLOADING' | 'PROCESSING' | 'READY' | 'FAILED' };
  const data = await listOwnedDocuments(req.auth!.userId, query);
  res.json({ success: true, data });
}));

documentRoutes.get('/:id/download', validateRequest({ params: documentIdParams }), asyncHandler(async (req, res) => {
  const document = await prisma.document.findFirst({ where: { id: pathParam(req), ownerId: req.auth!.userId }, select: { fileName: true, mimeType: true, storageKey: true } });
  if (!document) throw new ApiError(404, 'DOCUMENT_NOT_FOUND', 'Document not found');
  const bytes = await storageService.get(document.storageKey);
  const encodedName = encodeURIComponent(document.fileName).replace(/[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
  res.setHeader('Content-Type', document.mimeType);
  res.setHeader('Content-Length', bytes.byteLength);
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedName}`);
  res.setHeader('Cache-Control', 'private, no-store');
  res.send(bytes);
}));

documentRoutes.get('/:id', validateRequest({ params: documentIdParams }), asyncHandler(async (req, res) => {
  const document = await findOwnedDocument(req.auth!.userId, pathParam(req));
  if (!document) throw new ApiError(404, 'DOCUMENT_NOT_FOUND', 'Document not found');
  const [topicLinks, chunks, job] = await Promise.all([
    prisma.documentTopic.findMany({ where: { documentId: document.id }, orderBy: { topic: { canonicalPath: 'asc' } }, select: { evidencePages: true, topic: { select: { id: true, name: true, canonicalPath: true, description: true, mastery: { where: { userId: req.auth!.userId }, select: { masteryScore: true, confidence: true } } } } } }),
    prisma.documentChunk.findMany({ where: { documentId: document.id }, orderBy: { chunkIndex: 'asc' }, take: 20, select: { id: true, chunkIndex: true, pageNumber: true, content: true } }),
    prisma.backgroundJob.findFirst({ where: { userId: req.auth!.userId, payload: { path: ['documentId'], equals: document.id }, type: { in: ['PROCESS_DOCUMENT', 'GENERATE_EMBEDDINGS', 'ANALYZE_DOCUMENT'] } }, orderBy: { createdAt: 'desc' }, select: { id: true, status: true, type: true, lastError: true } })
  ]);
  res.json({ success: true, data: { ...document, processingJob: job, topics: topicLinks, sourceChunks: chunks } });
}));

documentRoutes.delete('/:id', validateRequest({ params: documentIdParams }), asyncHandler(async (req, res) => {
  const document = await prisma.document.findFirst({ where: { id: pathParam(req), ownerId: req.auth!.userId }, select: { id: true, storageKey: true } });
  if (!document) throw new ApiError(404, 'DOCUMENT_NOT_FOUND', 'Document not found');
  await storageService.delete(document.storageKey);
  await prisma.document.delete({ where: { id: document.id } });
  res.status(204).end();
}));
