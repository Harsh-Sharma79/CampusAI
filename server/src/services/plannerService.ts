import { prisma } from '../config/prisma.js';
import { generateStudyPlan } from '../ai/geminiService.js';
import { enqueueBackgroundJob } from '../jobs/queueService.js';
import { ApiError } from '../utils/errors.js';

export async function generatePlanForUser(userId: string, input: { startDate?: string; days: number; subjectId?: string }) {
  if (input.subjectId && !await prisma.subject.findFirst({ where: { id: input.subjectId, ownerId: userId }, select: { id: true } })) throw new ApiError(404, 'SUBJECT_NOT_FOUND', 'Subject not found');
  const startDate = input.startDate ? new Date(input.startDate) : new Date();
  const endDate = new Date(startDate.getTime() + input.days * 86_400_000);
  const [user, settings, topics, exams, recentActivities] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true, course: { select: { name: true } }, semester: { select: { name: true } } } }),
    prisma.userSettings.findUnique({ where: { userId }, select: { preferredStudyMinutes: true } }),
    prisma.topic.findMany({ where: { ownerId: userId, ...(input.subjectId ? { subjectId: input.subjectId } : {}) }, orderBy: { importance: 'desc' }, select: {
      id: true, name: true, canonicalPath: true, description: true, importance: true,
      subject: { select: { id: true, name: true } }, mastery: { where: { userId }, select: { masteryScore: true, confidence: true, lastStudiedAt: true, attemptCount: true } },
      documents: { where: { ownerId: userId, status: 'READY' }, select: { id: true, fileName: true, documentType: true }, take: 10 }
    } }),
    prisma.examEvent.findMany({ where: { userId, examAt: { gte: startDate, lte: endDate }, ...(input.subjectId ? { subjectId: input.subjectId } : {}) }, orderBy: { examAt: 'asc' }, select: { title: true, examAt: true, importance: true, subject: { select: { name: true } } } }),
    prisma.learningActivity.findMany({ where: { userId, occurredAt: { gte: new Date(Date.now() - 30 * 86_400_000) } }, orderBy: { occurredAt: 'desc' }, take: 20, select: { type: true, occurredAt: true, topic: { select: { canonicalPath: true } } } })
  ]);
  if (!topics.length && !exams.length) throw new ApiError(422, 'INSUFFICIENT_STUDY_DATA', 'Upload course materials or add an upcoming exam before generating a study plan');
  const availableMinutes = settings?.preferredStudyMinutes ?? 60;
  const context = JSON.stringify({
    student: user, availableStudyMinutesPerDay: availableMinutes,
    requestedWindow: { startDate: startDate.toISOString(), endDate: endDate.toISOString(), days: input.days },
    actualExams: exams,
    actualTopics: topics.map((topic) => ({ id: topic.id, canonicalPath: topic.canonicalPath, name: topic.name, subject: topic.subject.name, importance: topic.importance, mastery: topic.mastery[0] ?? null, readyMaterials: topic.documents })),
    actualRecentActivities: recentActivities
  });
  const draft = await generateStudyPlan(userId, context);
  const topicByPath = new Map(topics.map((topic) => [topic.canonicalPath, topic.id]));
  const allowedTasks = draft.tasks.filter((task) => task.dayOffset < input.days);
  if (!allowedTasks.length) throw new ApiError(502, 'AI_INVALID_PLAN', 'The planner returned no tasks inside the requested date range');
  const tasks = allowedTasks.map((task) => ({
    topicId: task.topicPath ? topicByPath.get(task.topicPath) ?? null : null,
    title: task.title,
    description: task.description || null,
    scheduledFor: new Date(startDate.getTime() + task.dayOffset * 86_400_000),
    recommendedMinutes: Math.min(task.recommendedMinutes, availableMinutes),
    status: 'TODO' as const
  }));
  const plan = await prisma.$transaction(async (tx) => {
    const created = await tx.studyPlan.create({ data: { ownerId: userId, title: draft.title, startDate, endDate } });
    await tx.studyTask.createMany({ data: tasks.map((task) => ({ ...task, planId: created.id })) });
    await tx.learningActivity.create({ data: { userId, type: 'PLAN_GENERATED', metadata: { planId: created.id, taskCount: tasks.length, days: input.days } } });
    return tx.studyPlan.findUnique({ where: { id: created.id }, include: { tasks: { orderBy: [{ scheduledFor: 'asc' }, { id: 'asc' }], include: { topic: { select: { id: true, name: true, canonicalPath: true } } } } } });
  });
  await enqueueBackgroundJob({ userId, type: 'UPDATE_RECOMMENDATIONS', payload: {} });
  return plan;
}

export async function listPlans(userId: string, input: { cursor?: string; limit: number; from?: string; to?: string }) {
  const rows = await prisma.studyPlan.findMany({ where: { ownerId: userId, ...(input.from || input.to ? { startDate: { ...(input.from ? { gte: new Date(input.from) } : {}), ...(input.to ? { lte: new Date(input.to) } : {}) } } : {}) }, orderBy: [{ startDate: 'desc' }, { id: 'desc' }], take: input.limit + 1, ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}), include: { _count: { select: { tasks: true } } } });
  const hasMore = rows.length > input.limit; const items = hasMore ? rows.slice(0, input.limit) : rows;
  return { items, nextCursor: hasMore ? items.at(-1)?.id ?? null : null };
}

export async function getPlan(userId: string, id: string) {
  const plan = await prisma.studyPlan.findFirst({ where: { id, ownerId: userId }, include: {
    tasks: { orderBy: [{ scheduledFor: 'asc' }, { id: 'asc' }], include: { topic: { select: { id: true, name: true, canonicalPath: true } } } }
  } });
  if (!plan) throw new ApiError(404, 'PLAN_NOT_FOUND', 'Study plan not found');
  return plan;
}

export async function createTask(userId: string, planId: string, input: { topicId?: string; title: string; description?: string; scheduledFor: string; recommendedMinutes: number }) {
  const plan = await prisma.studyPlan.findFirst({ where: { id: planId, ownerId: userId }, select: { id: true } });
  if (!plan) throw new ApiError(404, 'PLAN_NOT_FOUND', 'Study plan not found');
  if (input.topicId && !await prisma.topic.findFirst({ where: { id: input.topicId, ownerId: userId }, select: { id: true } })) throw new ApiError(404, 'TOPIC_NOT_FOUND', 'Topic not found');
  return prisma.studyTask.create({ data: { planId, topicId: input.topicId ?? null, title: input.title, description: input.description ?? null, scheduledFor: new Date(input.scheduledFor), recommendedMinutes: input.recommendedMinutes }, include: { topic: { select: { id: true, name: true, canonicalPath: true } } } });
}

export async function updateTask(userId: string, id: string, input: { title?: string; description?: string | null; scheduledFor?: string; recommendedMinutes?: number; status?: 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED' }) {
  const existing = await prisma.studyTask.findFirst({ where: { id, plan: { ownerId: userId } }, select: { id: true, status: true } });
  if (!existing) throw new ApiError(404, 'TASK_NOT_FOUND', 'Study task not found');
  const nextStatus = input.status ?? existing.status;
  const updated = await prisma.studyTask.update({ where: { id }, data: {
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.description !== undefined ? { description: input.description } : {}),
    ...(input.scheduledFor !== undefined ? { scheduledFor: new Date(input.scheduledFor) } : {}),
    ...(input.recommendedMinutes !== undefined ? { recommendedMinutes: input.recommendedMinutes } : {}),
    status: nextStatus,
    ...(nextStatus === 'COMPLETED' ? (existing.status === 'COMPLETED' ? {} : { completedAt: new Date() }) : { completedAt: null })
  }, include: { topic: { select: { id: true, name: true, canonicalPath: true } } } });
  if (nextStatus === 'COMPLETED' && existing.status !== 'COMPLETED') {
    await prisma.learningActivity.create({ data: { userId, topicId: updated.topicId, type: 'STUDY_TASK_COMPLETED', metadata: { taskId: updated.id, planId: updated.planId } } });
    await enqueueBackgroundJob({ userId, type: 'UPDATE_RECOMMENDATIONS', payload: {} });
  }
  return updated;
}

export async function deleteTask(userId: string, id: string): Promise<void> {
  const result = await prisma.studyTask.deleteMany({ where: { id, plan: { ownerId: userId } } });
  if (!result.count) throw new ApiError(404, 'TASK_NOT_FOUND', 'Study task not found');
}

export async function deletePlan(userId: string, id: string): Promise<void> {
  const result = await prisma.studyPlan.deleteMany({ where: { id, ownerId: userId } });
  if (!result.count) throw new ApiError(404, 'PLAN_NOT_FOUND', 'Study plan not found');
}
