import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { requireAuth, requireAdmin } from '../middleware/requireAuth.js';
import { ApiError } from '../utils/errors.js';
import { asyncHandler, pathParam, validateRequest } from '../utils/http.js';
import { z } from 'zod';
import { adminQuery } from '../validators/learningSchemas.js';
import { documentListSelect } from '../repositories/documentRepository.js';

export const adminRoutes = Router();
adminRoutes.use(requireAuth, requireAdmin);
const userIdParams = z.object({ id: z.uuid() }).strict();

adminRoutes.get('/dashboard', asyncHandler(async (_req, res) => {
  const [users, activeUsers, documents, quizzes, completedAttempts, activities, jobs] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { activities: { some: { occurredAt: { gte: new Date(Date.now() - 30 * 86_400_000) } } } } }),
    prisma.document.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.quiz.count(),
    prisma.quizAttempt.count({ where: { status: 'COMPLETED' } }),
    prisma.learningActivity.count(),
    prisma.backgroundJob.groupBy({ by: ['status'], _count: { _all: true } })
  ]);
  res.json({ success: true, data: { users, activeUsersLast30Days: activeUsers, documents: Object.fromEntries(documents.map((row) => [row.status, row._count._all])), quizzes, completedAttempts, learningActivities: activities, jobs: Object.fromEntries(jobs.map((row) => [row.status, row._count._all])) } });
}));

adminRoutes.get('/users', validateRequest({ query: adminQuery }), asyncHandler(async (req, res) => {
  const query = res.locals.validatedRequest.query as { cursor?: string; limit: number; search?: string };
  const rows = await prisma.user.findMany({ where: query.search ? { OR: [
    { name: { contains: query.search, mode: 'insensitive' } }, { email: { contains: query.search, mode: 'insensitive' } }
  ] } : {}, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: query.limit + 1, ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}), select: {
    id: true, name: true, email: true, role: true, onboardingComplete: true, createdAt: true,
    university: { select: { name: true } }, course: { select: { name: true } }, semester: { select: { name: true } },
    _count: { select: { documents: true, quizzes: true, quizAttempts: true, activities: true } }
  } });
  const hasMore = rows.length > query.limit; const items = hasMore ? rows.slice(0, query.limit) : rows;
  res.json({ success: true, data: { items, nextCursor: hasMore ? items.at(-1)?.id ?? null : null } });
}));

adminRoutes.get('/users/:id', validateRequest({ params: userIdParams }), asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: pathParam(req) }, select: {
    id: true, name: true, email: true, avatar: true, role: true, createdAt: true, updatedAt: true, onboardingComplete: true,
    university: { select: { name: true } }, course: { select: { name: true } }, semester: { select: { name: true } }, subjects: { select: { id: true, name: true } },
    _count: { select: { documents: true, quizzes: true, quizAttempts: true, flashcards: true, studySessions: true, activities: true } },
    activities: { orderBy: { occurredAt: 'desc' }, take: 10, select: { type: true, occurredAt: true, durationMinutes: true } }
  } });
  if (!user) throw new ApiError(404, 'USER_NOT_FOUND', 'User not found');
  res.json({ success: true, data: user });
}));

adminRoutes.delete('/users/:id', validateRequest({ params: userIdParams }), asyncHandler(async (req, res) => {
  if (pathParam(req) === req.auth!.userId) throw new ApiError(400, 'CANNOT_DELETE_SELF', 'Administrators cannot delete their own account through this endpoint');
  const result = await prisma.user.deleteMany({ where: { id: pathParam(req) } });
  if (!result.count) throw new ApiError(404, 'USER_NOT_FOUND', 'User not found');
  res.status(204).end();
}));

adminRoutes.get('/documents', validateRequest({ query: adminQuery }), asyncHandler(async (req, res) => {
  const query = res.locals.validatedRequest.query as { cursor?: string; limit: number; status?: string };
  const validStatuses = ['UPLOADING', 'PROCESSING', 'READY', 'FAILED'] as const;
  const status = validStatuses.includes(query.status as typeof validStatuses[number]) ? query.status as typeof validStatuses[number] : undefined;
  const rows = await prisma.document.findMany({ where: status ? { status } : {}, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: query.limit + 1, ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}), select: { ...documentListSelect, owner: { select: { id: true, name: true, email: true } } } });
  const hasMore = rows.length > query.limit; const items = hasMore ? rows.slice(0, query.limit) : rows;
  res.json({ success: true, data: { items, nextCursor: hasMore ? items.at(-1)?.id ?? null : null } });
}));

adminRoutes.get('/analytics', asyncHandler(async (_req, res) => {
  const [dailyActivities, masteryRows, courseCounts, usage] = await Promise.all([
    prisma.learningActivity.groupBy({ by: ['type'], _count: { _all: true } }),
    prisma.studentMastery.aggregate({ _avg: { masteryScore: true }, _count: { _all: true } }),
    prisma.course.groupBy({ by: ['name'], _count: { _all: true }, orderBy: { _count: { name: 'desc' } }, take: 20 }),
    prisma.aIUsage.groupBy({ by: ['operation', 'model'], _count: { _all: true }, _sum: { inputTokens: true, outputTokens: true } })
  ]);
  res.json({ success: true, data: { activityCounts: Object.fromEntries(dailyActivities.map((row) => [row.type, row._count._all])), averageRecordedMastery: masteryRows._avg.masteryScore, assessedTopicCount: masteryRows._count._all, courseCounts, aiUsage: usage } });
}));
