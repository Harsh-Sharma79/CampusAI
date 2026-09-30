import { setTimeout as delay } from 'node:timers/promises';
import { Prisma, type BackgroundJob } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { logger } from '../utils/logger.js';
import { ApiError } from '../utils/errors.js';
import { processDocumentUpload, embedDocumentChunks, analyzeAndPersistDocument } from '../services/documentProcessingService.js';
import { generateQuizForUser } from '../services/quizService.js';
import { generateFlashcardsForUser } from '../services/flashcardService.js';
import { getNextRecommendation } from '../services/recommendationService.js';
import { quizGenerateSchema, flashcardGenerateSchema } from '../validators/learningSchemas.js';

function objectPayload(value: Prisma.JsonValue): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

async function requeueExpiredJobs(): Promise<void> {
  const cutoff = new Date(Date.now() - 15 * 60_000);
  const stale = await prisma.backgroundJob.findMany({ where: { status: 'RUNNING', lockedAt: { lt: cutoff } }, select: { id: true, attempts: true, maxAttempts: true } });
  for (const job of stale) {
    await prisma.backgroundJob.updateMany({ where: { id: job.id, status: 'RUNNING', lockedAt: { lt: cutoff } }, data: {
      status: job.attempts >= job.maxAttempts ? 'FAILED' : 'PENDING', lockedAt: null,
      availableAt: new Date(), lastError: 'Worker lease expired before completion'
    } });
  }
}

async function claimJob(): Promise<BackgroundJob | null> {
  const candidate = await prisma.backgroundJob.findFirst({ where: { status: 'PENDING', availableAt: { lte: new Date() } }, orderBy: [{ availableAt: 'asc' }, { createdAt: 'asc' }] });
  if (!candidate) return null;
  const claimed = await prisma.backgroundJob.updateMany({ where: { id: candidate.id, status: 'PENDING' }, data: { status: 'RUNNING', lockedAt: new Date(), attempts: { increment: 1 }, lastError: null } });
  return claimed.count ? prisma.backgroundJob.findUnique({ where: { id: candidate.id } }) : null;
}

async function processJob(job: BackgroundJob): Promise<string | null> {
  const payload = objectPayload(job.payload);
  const userId = job.userId;
  const documentId = typeof payload.documentId === 'string' ? payload.documentId : undefined;
  switch (job.type) {
    case 'PROCESS_DOCUMENT':
      if (!userId || !documentId) throw new ApiError(400, 'INVALID_JOB_PAYLOAD', 'Document-processing job is missing its owner or document');
      await processDocumentUpload(userId, documentId);
      return documentId;
    case 'GENERATE_EMBEDDINGS':
      if (!userId || !documentId) throw new ApiError(400, 'INVALID_JOB_PAYLOAD', 'Embedding job is missing its owner or document');
      await embedDocumentChunks(userId, documentId);
      return documentId;
    case 'ANALYZE_DOCUMENT':
      if (!userId || !documentId) throw new ApiError(400, 'INVALID_JOB_PAYLOAD', 'Analysis job is missing its owner or document');
      await analyzeAndPersistDocument(userId, documentId);
      return documentId;
    case 'GENERATE_QUIZ': {
      if (!userId) throw new ApiError(400, 'INVALID_JOB_PAYLOAD', 'Quiz job is missing its owner');
      const parsed = quizGenerateSchema.parse(payload);
      const input = {
        count: parsed.count, quizType: parsed.quizType,
        ...(parsed.subjectId ? { subjectId: parsed.subjectId } : {}),
        ...(parsed.topicId ? { topicId: parsed.topicId } : {}),
        ...(parsed.documentId ? { documentId: parsed.documentId } : {}),
        ...(parsed.difficulty ? { difficulty: parsed.difficulty } : {})
      };
      const result = await generateQuizForUser(userId, input);
      return result.id;
    }
    case 'GENERATE_FLASHCARDS': {
      if (!userId) throw new ApiError(400, 'INVALID_JOB_PAYLOAD', 'Flashcard job is missing its owner');
      const parsed = flashcardGenerateSchema.parse(payload);
      const input = {
        count: parsed.count,
        ...(parsed.subjectId ? { subjectId: parsed.subjectId } : {}),
        ...(parsed.topicId ? { topicId: parsed.topicId } : {}),
        ...(parsed.documentId ? { documentId: parsed.documentId } : {})
      };
      const result = await generateFlashcardsForUser(userId, input);
      return result.id;
    }
    case 'UPDATE_RECOMMENDATIONS':
      if (!userId) throw new ApiError(400, 'INVALID_JOB_PAYLOAD', 'Recommendation job is missing its owner');
      return (await getNextRecommendation(userId))?.id ?? null;
    default:
      throw new ApiError(400, 'UNSUPPORTED_JOB_TYPE', 'This background job type is not supported');
  }
}

async function failAssociatedDocument(job: BackgroundJob, error: unknown, terminal: boolean): Promise<void> {
  const payload = objectPayload(job.payload);
  const documentId = typeof payload.documentId === 'string' ? payload.documentId : null;
  if (!terminal || !documentId || !['PROCESS_DOCUMENT', 'GENERATE_EMBEDDINGS', 'ANALYZE_DOCUMENT'].includes(job.type)) return;
  const code = error instanceof ApiError ? error.code : 'DOCUMENT_PROCESSING_FAILED';
  const message = error instanceof ApiError ? error.message : 'The document could not be processed. Please retry.';
  await prisma.document.updateMany({ where: { id: documentId, ...(job.userId ? { ownerId: job.userId } : {}) }, data: { status: 'FAILED', errorCode: code, errorMessage: message } });
}

export async function processNextJob(): Promise<boolean> {
  const job = await claimJob();
  if (!job) return false;
  try {
    const resultId = await processJob(job);
    const payload = objectPayload(job.payload);
    await prisma.backgroundJob.update({ where: { id: job.id }, data: {
      status: 'COMPLETED', lockedAt: null,
      payload: { ...payload, ...(resultId ? { resultId } : {}) } as Prisma.InputJsonValue,
      lastError: null
    } });
  } catch (error) {
    const terminal = job.attempts >= job.maxAttempts;
    const errorCode = error instanceof ApiError ? error.code : 'JOB_FAILED';
    const message = error instanceof ApiError ? error.message : 'Background work failed';
    const backoffMs = Math.min(60 * 60_000, 1_000 * 2 ** Math.max(0, job.attempts - 1));
    await prisma.backgroundJob.update({ where: { id: job.id }, data: {
      status: terminal ? 'FAILED' : 'PENDING', lockedAt: null,
      availableAt: terminal ? new Date() : new Date(Date.now() + backoffMs),
      lastError: `${errorCode}: ${message}`.slice(0, 2_000)
    } });
    await failAssociatedDocument(job, error, terminal).catch((persistError) => logger.error({ jobId: job.id, errorName: persistError instanceof Error ? persistError.name : 'unknown' }, 'Could not mark a failed document'));
    logger.warn({ jobId: job.id, type: job.type, attempt: job.attempts, terminal, errorCode }, 'Background job failed');
  }
  return true;
}

export async function runJobWorker(signal: AbortSignal): Promise<void> {
  await requeueExpiredJobs();
  while (!signal.aborted) {
    try {
      const worked = await processNextJob();
      if (!worked) await delay(1_000, undefined, { signal });
    } catch (error) {
      logger.error({ errorName: error instanceof Error ? error.name : 'unknown' }, 'Background worker iteration failed');
      try { await delay(2_000, undefined, { signal }); } catch { /* graceful shutdown */ }
    }
  }
}
