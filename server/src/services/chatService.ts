import { prisma } from '../config/prisma.js';
import { generateTutorResponse } from '../ai/geminiService.js';
import { retrieveRelevantChunks } from '../rag/retrievalService.js';
import { ApiError } from '../utils/errors.js';

export async function listChats(userId: string, input: { cursor?: string; limit: number }) {
  const rows = await prisma.chat.findMany({
    where: { ownerId: userId }, orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }], take: input.limit + 1,
    ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
    select: { id: true, title: true, createdAt: true, updatedAt: true, subject: { select: { id: true, name: true } }, topic: { select: { id: true, name: true, canonicalPath: true } }, _count: { select: { messages: true } } }
  });
  const hasMore = rows.length > input.limit;
  const items = hasMore ? rows.slice(0, input.limit) : rows;
  return { items, nextCursor: hasMore ? items.at(-1)?.id ?? null : null };
}

export async function getChat(userId: string, id: string) {
  const chat = await prisma.chat.findFirst({ where: { id, ownerId: userId }, select: {
    id: true, title: true, createdAt: true, updatedAt: true,
    subject: { select: { id: true, name: true } }, topic: { select: { id: true, name: true, canonicalPath: true } },
    messages: { orderBy: { createdAt: 'asc' }, take: 200, select: { id: true, role: true, content: true, citations: true, createdAt: true } }
  } });
  if (!chat) throw new ApiError(404, 'CHAT_NOT_FOUND', 'Chat not found');
  return chat;
}

async function resolveSources(userId: string, input: { subjectId?: string; topicId?: string; documentId?: string }) {
  let subjectId = input.subjectId;
  let topicId = input.topicId;
  if (topicId) {
    const topic = await prisma.topic.findFirst({ where: { id: topicId, ownerId: userId }, select: { id: true, subjectId: true } });
    if (!topic) throw new ApiError(404, 'TOPIC_NOT_FOUND', 'Topic not found');
    if (subjectId && subjectId !== topic.subjectId) throw new ApiError(400, 'SOURCE_SCOPE_MISMATCH', 'The selected topic does not belong to the selected subject');
    subjectId = topic.subjectId;
  }
  if (subjectId) {
    const subject = await prisma.subject.findFirst({ where: { id: subjectId, ownerId: userId }, select: { id: true } });
    if (!subject) throw new ApiError(404, 'SUBJECT_NOT_FOUND', 'Subject not found');
  }
  if (input.documentId) {
    const document = await prisma.document.findFirst({ where: { id: input.documentId, ownerId: userId, status: 'READY' }, select: { id: true, subjectId: true } });
    if (!document) throw new ApiError(404, 'READY_DOCUMENT_NOT_FOUND', 'A ready document was not found');
    if (subjectId && document.subjectId && subjectId !== document.subjectId) throw new ApiError(400, 'SOURCE_SCOPE_MISMATCH', 'The selected document does not belong to the selected subject');
    subjectId ??= document.subjectId ?? undefined;
  }
  return { ...(subjectId ? { subjectId } : {}), ...(topicId ? { topicId } : {}) };
}

export async function sendTutorMessage(userId: string, input: { chatId?: string; question: string; subjectId?: string; topicId?: string; documentId?: string }) {
  const scope = await resolveSources(userId, input);
  let chat;
  if (input.chatId) {
    chat = await prisma.chat.findFirst({ where: { id: input.chatId, ownerId: userId } });
    if (!chat) throw new ApiError(404, 'CHAT_NOT_FOUND', 'Chat not found');
    if ((scope.subjectId && chat.subjectId && scope.subjectId !== chat.subjectId) || (scope.topicId && chat.topicId && scope.topicId !== chat.topicId)) {
      throw new ApiError(400, 'CHAT_SCOPE_MISMATCH', 'The selected learning context does not match this chat');
    }
    chat = await prisma.chat.update({ where: { id: chat.id }, data: {
      subjectId: chat.subjectId ?? scope.subjectId ?? null,
      topicId: chat.topicId ?? scope.topicId ?? null,
      documentId: chat.documentId ?? input.documentId ?? null
    } });
  } else {
    chat = await prisma.chat.create({ data: {
      ownerId: userId, subjectId: scope.subjectId ?? null, topicId: scope.topicId ?? null,
      documentId: input.documentId ?? null, title: input.question.slice(0, 120)
    } });
  }
  const history = await prisma.chatMessage.findMany({ where: { chatId: chat.id }, orderBy: { createdAt: 'desc' }, take: 12, select: { role: true, content: true } });
  const sourceFilter = await resolveSources(userId, {
    ...(chat.subjectId ? { subjectId: chat.subjectId } : {}),
    ...(chat.topicId ? { topicId: chat.topicId } : {}),
    ...(chat.documentId ? { documentId: chat.documentId } : {})
  });
  const sources = await retrieveRelevantChunks({
    userId, query: input.question,
    ...(sourceFilter.subjectId ? { subjectId: sourceFilter.subjectId } : {}),
    ...(chat.documentId ? { documentId: chat.documentId } : {}),
    limit: 8
  });
  const [student, mastery] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true, university: { select: { name: true } }, course: { select: { name: true } }, semester: { select: { name: true } }, settings: { select: { aiResponseStyle: true } } } }),
    sourceFilter.topicId ? prisma.studentMastery.findFirst({ where: { userId, topicId: sourceFilter.topicId }, select: { masteryScore: true, confidence: true, attemptCount: true } }) : Promise.resolve(null)
  ]);
  await prisma.chatMessage.create({ data: { chatId: chat.id, role: 'USER', content: input.question } });
  let response;
  try {
    response = await generateTutorResponse(userId, {
      question: input.question,
      student: { ...student, topicMastery: mastery, responseStyle: student?.settings?.aiResponseStyle ?? 'guided' },
      history: history.reverse().map((message) => ({ role: message.role.toLowerCase() as 'user' | 'assistant', content: message.content })),
      sources: sources.map((source) => ({ id: source.chunkId, documentName: source.documentName, pageNumber: source.pageNumber, content: source.content }))
    });
  } catch (error) {
    throw error;
  }
  const citations = sources.map((source) => ({ chunkId: source.chunkId, documentId: source.documentId, documentName: source.documentName, pageNumber: source.pageNumber, similarity: source.similarity }));
  const message = await prisma.chatMessage.create({ data: { chatId: chat.id, role: 'ASSISTANT', content: response.answer, citations } });
  await prisma.learningActivity.create({ data: { userId, subjectId: chat.subjectId, topicId: chat.topicId, type: 'TUTOR_MESSAGE', metadata: { chatId: chat.id, sourceCount: citations.length } } });
  return { chatId: chat.id, message: { id: message.id, role: message.role, content: message.content, citations: message.citations, createdAt: message.createdAt }, followUpQuestion: response.followUpQuestion, learningAction: response.learningAction };
}

export async function deleteChat(userId: string, id: string): Promise<void> {
  const deleted = await prisma.chat.deleteMany({ where: { id, ownerId: userId } });
  if (!deleted.count) throw new ApiError(404, 'CHAT_NOT_FOUND', 'Chat not found');
}
