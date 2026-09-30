import { prisma } from '../config/prisma.js';
import { generateFlashcards } from '../ai/geminiService.js';
import { retrieveRelevantChunks } from '../rag/retrievalService.js';
import { refreshTopicMastery } from './masteryService.js';
import { enqueueBackgroundJob } from '../jobs/queueService.js';
import { ApiError } from '../utils/errors.js';

export type FlashcardGenerationInput = { subjectId?: string; topicId?: string; documentId?: string; count: number };

async function resolveScope(userId: string, input: FlashcardGenerationInput) {
  let subjectId = input.subjectId;
  let topic: { id: string; name: string; canonicalPath: string; description: string | null; subjectId: string } | null = null;
  if (input.topicId) {
    topic = await prisma.topic.findFirst({ where: { id: input.topicId, ownerId: userId }, select: { id: true, name: true, canonicalPath: true, description: true, subjectId: true } });
    if (!topic) throw new ApiError(404, 'TOPIC_NOT_FOUND', 'Topic not found');
    if (subjectId && subjectId !== topic.subjectId) throw new ApiError(400, 'SOURCE_SCOPE_MISMATCH', 'The selected topic does not belong to the selected subject');
    subjectId = topic.subjectId;
  }
  if (subjectId && !await prisma.subject.findFirst({ where: { id: subjectId, ownerId: userId }, select: { id: true } })) throw new ApiError(404, 'SUBJECT_NOT_FOUND', 'Subject not found');
  if (input.documentId) {
    const document = await prisma.document.findFirst({ where: { id: input.documentId, ownerId: userId, status: 'READY' }, select: { id: true, subjectId: true } });
    if (!document) throw new ApiError(404, 'READY_DOCUMENT_NOT_FOUND', 'A ready document was not found');
    if (subjectId && document.subjectId && document.subjectId !== subjectId) throw new ApiError(400, 'SOURCE_SCOPE_MISMATCH', 'The selected document does not belong to the selected subject');
    subjectId ??= document.subjectId ?? undefined;
  }
  const query = topic?.canonicalPath ?? (subjectId ? (await prisma.subject.findUnique({ where: { id: subjectId }, select: { name: true } }))?.name : null) ?? 'course material';
  return { subjectId, topic, query };
}

export async function generateFlashcardsForUser(userId: string, input: FlashcardGenerationInput) {
  const scope = await resolveScope(userId, input);
  const sources = await retrieveRelevantChunks({ userId, query: scope.query, ...(scope.subjectId ? { subjectId: scope.subjectId } : {}), ...(input.documentId ? { documentId: input.documentId } : {}), limit: 16 });
  if (!sources.length) throw new ApiError(422, 'NO_SOURCE_MATERIAL', 'No processed study material is available for this topic yet');
  const context = [scope.topic ? `TOPIC: ${scope.topic.canonicalPath}\n${scope.topic.description ?? ''}` : '', ...sources.map((source) => `[${source.documentName}; page ${source.pageNumber ?? 'unknown'}]\n${source.content}`)].filter(Boolean).join('\n\n');
  const draft = await generateFlashcards(userId, context, input.count);
  const validPages = new Set(input.documentId ? sources.filter((source) => source.documentId === input.documentId).map((source) => source.pageNumber).filter((page): page is number => page !== null) : []);
  const topicByPath = new Map((await prisma.topic.findMany({ where: { ownerId: userId, ...(scope.subjectId ? { subjectId: scope.subjectId } : {}) }, select: { id: true, canonicalPath: true } })).map((topic) => [topic.canonicalPath, topic.id]));
  const generated = await prisma.$transaction(async (tx) => {
    const deck = await tx.flashcardDeck.create({ data: { ownerId: userId, title: draft.title } });
    const created = [];
    for (const card of draft.cards) {
      const topicId = scope.topic?.id ?? topicByPath.get(card.topicPath) ?? null;
      const sourcePage = input.documentId && card.sourcePage !== null && validPages.has(card.sourcePage) ? card.sourcePage : null;
      created.push(await tx.flashcard.create({ data: {
        ownerId: userId, deckId: deck.id, topicId, documentId: input.documentId ?? null, pageNumber: sourcePage,
        front: card.front, back: card.back, state: 'NEW', nextReviewAt: new Date()
      }, select: { id: true, deckId: true, topicId: true, documentId: true, pageNumber: true, front: true, back: true, state: true, nextReviewAt: true, createdAt: true } }));
    }
    return { deck, cards: created };
  });
  return { id: generated.deck.id, title: generated.deck.title, cards: generated.cards };
}

export async function enqueueFlashcardGeneration(userId: string, input: FlashcardGenerationInput) {
  const job = await enqueueBackgroundJob({ userId, type: 'GENERATE_FLASHCARDS', payload: input });
  return { jobId: job.id, status: job.status };
}

export async function listFlashcards(userId: string, input: { cursor?: string; limit: number; dueOnly: boolean; topicId?: string }) {
  const now = new Date();
  const rows = await prisma.flashcard.findMany({ where: {
    ownerId: userId, state: { not: 'SUSPENDED' }, ...(input.topicId ? { topicId: input.topicId } : {}), ...(input.dueOnly ? { nextReviewAt: { lte: now } } : {})
  }, orderBy: [{ nextReviewAt: 'asc' }, { id: 'asc' }], take: input.limit + 1,
  ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
  select: { id: true, deckId: true, topicId: true, documentId: true, pageNumber: true, front: true, back: true, state: true, intervalDays: true, easeFactor: true, reviewCount: true, nextReviewAt: true, lastReviewedAt: true, createdAt: true, deck: { select: { title: true } }, topic: { select: { name: true, canonicalPath: true } } } });
  const hasMore = rows.length > input.limit; const items = hasMore ? rows.slice(0, input.limit) : rows;
  return { items, nextCursor: hasMore ? items.at(-1)?.id ?? null : null };
}

export async function getFlashcardDeck(userId: string, id: string) {
  const deck = await prisma.flashcardDeck.findFirst({ where: { id, ownerId: userId }, select: {
    id: true, title: true, createdAt: true,
    cards: { where: { ownerId: userId }, orderBy: { createdAt: 'asc' }, select: { id: true, topicId: true, documentId: true, pageNumber: true, front: true, back: true, state: true, nextReviewAt: true, topic: { select: { name: true, canonicalPath: true } }, document: { select: { fileName: true } } } }
  } });
  if (!deck) throw new ApiError(404, 'FLASHCARD_DECK_NOT_FOUND', 'Flashcard deck not found');
  return deck;
}

export async function reviewFlashcard(userId: string, id: string, input: { known: boolean; responseTimeMs?: number }) {
  const flashcard = await prisma.flashcard.findFirst({ where: { id, ownerId: userId }, select: { id: true, topicId: true, reviewCount: true, intervalDays: true, easeFactor: true, state: true } });
  if (!flashcard) throw new ApiError(404, 'FLASHCARD_NOT_FOUND', 'Flashcard not found');
  if (flashcard.state === 'SUSPENDED') throw new ApiError(409, 'FLASHCARD_SUSPENDED', 'This flashcard is suspended');
  const easeFactor = Math.max(1.3, Math.min(3.0, flashcard.easeFactor + (input.known ? 0.1 : -0.2)));
  const intervalDays = input.known ? (flashcard.reviewCount === 0 ? 1 : Math.max(1, Math.round(flashcard.intervalDays * easeFactor))) : 1;
  const nextReviewAt = new Date(Date.now() + intervalDays * 86_400_000);
  const result = await prisma.$transaction(async (tx) => {
    await tx.flashcardReview.create({ data: { flashcardId: id, known: input.known, ...(input.responseTimeMs === undefined ? {} : { responseTimeMs: input.responseTimeMs }), intervalAfterDays: intervalDays } });
    const updated = await tx.flashcard.update({ where: { id }, data: {
      reviewCount: { increment: 1 }, lastReviewedAt: new Date(), nextReviewAt, intervalDays, easeFactor,
      state: input.known ? 'REVIEW' : 'LEARNING'
    }, select: { id: true, state: true, intervalDays: true, easeFactor: true, reviewCount: true, nextReviewAt: true, lastReviewedAt: true } });
    if (flashcard.topicId) await refreshTopicMastery(tx, userId, flashcard.topicId);
    await tx.learningActivity.create({ data: { userId, topicId: flashcard.topicId, type: 'FLASHCARD_REVIEWED', metadata: { flashcardId: id, known: input.known, intervalDays } } });
    return updated;
  });
  await enqueueBackgroundJob({ userId, type: 'UPDATE_RECOMMENDATIONS', payload: {} });
  return result;
}

export async function deleteFlashcard(userId: string, id: string): Promise<void> {
  const deleted = await prisma.flashcard.deleteMany({ where: { id, ownerId: userId } });
  if (!deleted.count) throw new ApiError(404, 'FLASHCARD_NOT_FOUND', 'Flashcard not found');
}
