import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/errors.js';

export async function startStudySession(userId: string, input: { topicId?: string; notes?: string }) {
  if (input.topicId && !await prisma.topic.findFirst({ where: { id: input.topicId, ownerId: userId }, select: { id: true } })) throw new ApiError(404, 'TOPIC_NOT_FOUND', 'Topic not found');
  const active = await prisma.studySession.findFirst({ where: { userId, endedAt: null }, select: { id: true } });
  if (active) throw new ApiError(409, 'ACTIVE_SESSION_EXISTS', 'Finish your current focus session before starting another');
  return prisma.studySession.create({ data: { userId, topicId: input.topicId ?? null, notes: input.notes ?? null }, select: { id: true, topicId: true, startedAt: true, endedAt: true, durationMinutes: true, notes: true } });
}

export async function finishStudySession(userId: string, id: string, notes?: string) {
  return prisma.$transaction(async (tx) => {
    const session = await tx.studySession.findFirst({ where: { id, userId }, select: { id: true, topicId: true, startedAt: true, endedAt: true, notes: true } });
    if (!session) throw new ApiError(404, 'SESSION_NOT_FOUND', 'Study session not found');
    if (session.endedAt) throw new ApiError(409, 'SESSION_ALREADY_FINISHED', 'This focus session has already been finished');
    const endedAt = new Date();
    const durationMinutes = Math.max(0, Math.floor((endedAt.getTime() - session.startedAt.getTime()) / 60_000));
    const updated = await tx.studySession.update({ where: { id }, data: { endedAt, durationMinutes, ...(notes !== undefined ? { notes } : {}) }, select: { id: true, topicId: true, startedAt: true, endedAt: true, durationMinutes: true, notes: true } });
    await tx.learningActivity.create({ data: { userId, topicId: session.topicId, durationMinutes, type: 'STUDY_SESSION', occurredAt: endedAt, metadata: { sessionId: id } } });
    return updated;
  });
}

export async function listStudySessions(userId: string, input: { cursor?: string; limit: number; from?: string; to?: string }) {
  const rows = await prisma.studySession.findMany({ where: {
    userId,
    ...(input.from || input.to ? { startedAt: { ...(input.from ? { gte: new Date(input.from) } : {}), ...(input.to ? { lte: new Date(input.to) } : {}) } } : {})
  }, orderBy: [{ startedAt: 'desc' }, { id: 'desc' }], take: input.limit + 1,
  ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
  select: { id: true, startedAt: true, endedAt: true, durationMinutes: true, notes: true, topic: { select: { id: true, name: true, canonicalPath: true } } } });
  const hasMore = rows.length > input.limit; const items = hasMore ? rows.slice(0, input.limit) : rows;
  return { items, nextCursor: hasMore ? items.at(-1)?.id ?? null : null };
}
