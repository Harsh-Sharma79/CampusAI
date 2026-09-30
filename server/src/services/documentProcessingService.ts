import { createHash, randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { getEnv } from '../config/env.js';
import { analyzeDocument, embedText } from '../ai/geminiService.js';
import { storageService } from '../storage/storageService.js';
import { validateUploadedDocument } from './documentValidationService.js';
import { extractDocumentText } from './documentExtractionService.js';
import { chunkPages } from './chunkingService.js';
import { enqueueBackgroundJob } from '../jobs/queueService.js';
import { ApiError } from '../utils/errors.js';

async function getOwnedDocument(userId: string, documentId: string) {
  const document = await prisma.document.findFirst({ where: { id: documentId, ownerId: userId } });
  if (!document) throw new ApiError(404, 'DOCUMENT_NOT_FOUND', 'Document not found');
  return document;
}

export async function processDocumentUpload(userId: string, documentId: string): Promise<void> {
  const document = await getOwnedDocument(userId, documentId);
  await prisma.document.update({ where: { id: documentId }, data: {
    status: 'PROCESSING', processingStartedAt: new Date(), errorCode: null, errorMessage: null
  } });
  const bytes = await storageService.get(document.storageKey);
  const checksum = createHash('sha256').update(bytes).digest('hex');
  if (checksum !== document.checksum) throw new ApiError(422, 'FILE_CHECKSUM_MISMATCH', 'The stored file failed integrity verification');
  const extension = extname(document.fileName).toLowerCase();
  if (!['.pdf', '.docx', '.txt'].includes(extension)) throw new ApiError(415, 'UNSUPPORTED_FILE_TYPE', 'Only PDF, DOCX, and TXT files are supported');
  const fileExtension = validateUploadedDocument({ originalname: document.fileName, mimetype: document.mimeType, size: bytes.length, buffer: bytes });
  const extracted = await extractDocumentText(fileExtension, bytes);
  const chunks = chunkPages(extracted.pages);
  if (chunks.length === 0) throw new ApiError(422, 'NO_EXTRACTABLE_TEXT', 'No readable text could be extracted from this file');

  await prisma.$transaction(async (tx) => {
    await tx.documentChunk.deleteMany({ where: { documentId } });
    await tx.documentChunk.createMany({ data: chunks.map((chunk) => ({
      id: randomUUID(), documentId, chunkIndex: chunk.chunkIndex, content: chunk.content,
      pageNumber: chunk.pageNumber, tokenCount: chunk.tokenCount
    })) });
    await tx.document.update({ where: { id: documentId }, data: { pageCount: extracted.pageCount, title: document.title ?? document.fileName } });
  });
  await enqueueBackgroundJob({ userId, type: 'GENERATE_EMBEDDINGS', payload: { documentId } });
}

export async function embedDocumentChunks(userId: string, documentId: string): Promise<void> {
  const document = await getOwnedDocument(userId, documentId);
  if (document.status !== 'PROCESSING') throw new ApiError(409, 'DOCUMENT_NOT_PROCESSING', 'Document is not currently processing');
  const chunks = await prisma.documentChunk.findMany({ where: { documentId }, orderBy: { chunkIndex: 'asc' }, select: { id: true, content: true } });
  if (!chunks.length) throw new ApiError(422, 'DOCUMENT_CHUNKS_MISSING', 'Document text has not been chunked');
  const model = getEnv().GEMINI_EMBEDDING_MODEL;
  for (let index = 0; index < chunks.length; index += 4) {
    const group = chunks.slice(index, index + 4);
    const vectors = await Promise.all(group.map((chunk) => embedText(userId, chunk.content, 'document')));
    await Promise.all(group.map((chunk, groupIndex) => {
      const vectorLiteral = `[${vectors[groupIndex]!.map((value) => Number(value).toString()).join(',')}]`;
      return prisma.$executeRaw(Prisma.sql`
        UPDATE "DocumentChunk"
           SET "embedding" = ${vectorLiteral}::vector,
               "embeddingModel" = ${model},
               "embeddingDimensions" = ${vectors[groupIndex]!.length}
         WHERE "id" = ${chunk.id}::uuid
      `);
    }));
  }
  await enqueueBackgroundJob({ userId, type: 'ANALYZE_DOCUMENT', payload: { documentId } });
}

async function getOrCreateSubject(userId: string, preferredSubjectId: string | null, subjectName: string) {
  if (preferredSubjectId) {
    const selected = await prisma.subject.findFirst({ where: { id: preferredSubjectId, ownerId: userId } });
    if (selected) return selected;
  }
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { courseId: true } });
  const ownedCourse = user?.courseId ? await prisma.course.findFirst({ where: { id: user.courseId, ownerId: userId }, select: { id: true } }) : null;
  const courseId = ownedCourse?.id ?? null;
  const existing = await prisma.subject.findFirst({ where: { ownerId: userId, courseId, name: subjectName } });
  if (existing) return existing;
  try { return await prisma.subject.create({ data: { ownerId: userId, courseId, name: subjectName } }); }
  catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const raced = await prisma.subject.findFirst({ where: { ownerId: userId, courseId, name: subjectName } });
      if (raced) return raced;
    }
    throw error;
  }
}

function splitCanonicalPath(path: string, finalName: string): string[] {
  const segments = path.split(/[/>›|]+/).map((part) => part.trim()).filter(Boolean).slice(-8);
  if (!segments.length) return [finalName];
  segments[segments.length - 1] = finalName;
  return segments;
}

async function persistKnowledgeMap(userId: string, documentId: string, preferredSubjectId: string | null, analysis: Awaited<ReturnType<typeof analyzeDocument>>) {
  const subject = await getOrCreateSubject(userId, preferredSubjectId, analysis.subjectName);
  const createdTopics: Array<{ id: string; name: string; canonicalPath: string }> = [];
  const topicEvidence: Array<{ topicId: string; evidencePages: number[] }> = [];
  for (const topicDraft of analysis.topics) {
    const names = splitCanonicalPath(topicDraft.canonicalPath, topicDraft.name);
    let parentId: string | null = null;
    let current: { id: string; name: string; canonicalPath: string } | null = null;
    const pathSegments: string[] = [];
    for (let index = 0; index < names.length; index += 1) {
      const name = names[index]!.slice(0, 180);
      pathSegments.push(name);
      const canonicalPath = pathSegments.join('/');
      const existing = await prisma.topic.findFirst({ where: { ownerId: userId, subjectId: subject.id, canonicalPath } });
      current = existing
        ? await prisma.topic.update({ where: { id: existing.id }, data: {
            parentId, name,
            ...(index === names.length - 1 ? { description: topicDraft.description || null, importance: topicDraft.importance } : {})
          }, select: { id: true, name: true, canonicalPath: true } })
        : await prisma.topic.create({ data: {
            ownerId: userId, subjectId: subject.id, parentId, canonicalPath, name,
            description: index === names.length - 1 ? topicDraft.description || null : null,
            importance: index === names.length - 1 ? topicDraft.importance : 3
          }, select: { id: true, name: true, canonicalPath: true } });
      parentId = current.id;
    }
    if (current) {
      createdTopics.push(current);
      topicEvidence.push({ topicId: current.id, evidencePages: topicDraft.evidencePages });
      for (const objective of topicDraft.objectives) {
        const existing = await prisma.learningObjective.findFirst({ where: { topicId: current.id, name: objective.name } });
        if (existing) {
          await prisma.learningObjective.update({ where: { id: existing.id }, data: { description: objective.description || null } });
        } else {
          await prisma.learningObjective.create({ data: { topicId: current.id, name: objective.name, description: objective.description || null } });
        }
      }
    }
  }
  const existingDoc = await getOwnedDocument(userId, documentId);
  for (const evidence of topicEvidence) {
    await prisma.documentTopic.upsert({
      where: { documentId_topicId: { documentId, topicId: evidence.topicId } },
      create: { documentId, topicId: evidence.topicId, evidencePages: evidence.evidencePages },
      update: { evidencePages: evidence.evidencePages }
    });
  }
  await prisma.document.update({ where: { id: documentId }, data: {
    subjectId: subject.id,
    topicId: existingDoc.topicId ?? createdTopics[0]?.id ?? null,
    title: analysis.summary.slice(0, 500),
    status: 'READY', errorCode: null, errorMessage: null, processedAt: new Date()
  } });
  await prisma.learningActivity.create({ data: {
    userId, subjectId: subject.id, topicId: createdTopics[0]?.id ?? null,
    type: 'DOCUMENT_PROCESSED', metadata: { documentId, topicCount: createdTopics.length }
  } });
  await enqueueBackgroundJob({ userId, type: 'UPDATE_RECOMMENDATIONS', payload: {} });
}

export async function analyzeAndPersistDocument(userId: string, documentId: string): Promise<void> {
  const document = await getOwnedDocument(userId, documentId);
  const chunks = await prisma.documentChunk.findMany({ where: { documentId }, orderBy: { chunkIndex: 'asc' }, select: { content: true, pageNumber: true } });
  const material = chunks.map((chunk) => `[PAGE ${chunk.pageNumber ?? 'unknown'}]\n${chunk.content}`).join('\n\n').slice(0, getEnv().GEMINI_MAX_INPUT_CHARS);
  if (!material.trim()) throw new ApiError(422, 'DOCUMENT_TEXT_MISSING', 'Document text is unavailable for analysis');
  const analysis = await analyzeDocument(userId, document.fileName, material);
  await persistKnowledgeMap(userId, documentId, document.subjectId, analysis);
}
