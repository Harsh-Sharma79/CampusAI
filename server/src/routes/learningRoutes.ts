import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { requireAuth, requireStudent } from '../middleware/requireAuth.js';
import { getDashboard, getAnalytics } from '../services/dashboardService.js';
import { sendTutorMessage, listChats, getChat, deleteChat } from '../services/chatService.js';
import { generateQuizForUser, listQuizzes, getQuizForAttempt, submitQuiz, getLatestQuizResult } from '../services/quizService.js';
import { generateFlashcardsForUser, listFlashcards, getFlashcardDeck, reviewFlashcard, deleteFlashcard } from '../services/flashcardService.js';
import { generatePlanForUser, listPlans, getPlan, createTask, updateTask, deleteTask } from '../services/plannerService.js';
import { startStudySession, finishStudySession, listStudySessions } from '../services/studySessionService.js';
import { getNextRecommendation, completeRecommendation } from '../services/recommendationService.js';
import { getSettings, updateSettings } from '../services/settingsService.js';
import { startGuidedLearning, answerGuidedLearning, getGuidedLearningSession } from '../services/guidedLearningService.js';
import { analyzeExamMaterial } from '../ai/geminiService.js';
import { ApiError } from '../utils/errors.js';
import { asyncHandler, pathParam, validateRequest } from '../utils/http.js';
import { paginationSchema } from '../validators/common.js';
import {
  activityQuery, chatIdParams, chatMessageSchema, flashcardGenerateSchema, flashcardIdParams,
  flashcardListQuery, flashcardReviewSchema, planGenerateSchema, planIdParams, planListQuery,
  recommendationQuery, sessionFinishSchema, sessionListQuery, sessionStartSchema,
  settingsUpdateSchema, taskCreateSchema, taskIdParams, taskUpdateSchema, quizGenerateSchema,
  quizIdParams, quizSubmitSchema
} from '../validators/learningSchemas.js';
import {
  createExamSchema, examAnalyzeSchema, examIdParams, examInsightsQuery, guidedAnswerSchema,
  guidedSessionParams, guidedStartSchema, profileUpdateSchema, recommendationIdParams
} from '../validators/apiSchemas.js';

export const learningRoutes = Router();
learningRoutes.use(requireAuth, requireStudent);

learningRoutes.get('/dashboard', asyncHandler(async (req, res) => {
  const userId = req.auth!.userId;
  const dashboard = await getDashboard(userId);
  if (!dashboard.user) throw new ApiError(404, 'USER_NOT_FOUND', 'Account not found');
  const start = new Date(); start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start); end.setUTCDate(end.getUTCDate() + 1);
  const todayPlan = await prisma.studyTask.findMany({ where: { plan: { ownerId: userId }, scheduledFor: { gte: start, lt: end } }, orderBy: [{ scheduledFor: 'asc' }, { id: 'asc' }], select: { id: true, title: true, status: true, scheduledFor: true, recommendedMinutes: true, topic: { select: { id: true, name: true, canonicalPath: true } } } });
  const masteryOverview = dashboard.mastery.map((row) => ({ topic: row.topic, masteryScore: row.masteryScore, confidence: row.confidence }));
  res.json({ success: true, data: {
    user: dashboard.user,
    nextBestAction: dashboard.recommendation,
    masteryOverview,
    weakTopics: masteryOverview.filter((row) => row.masteryScore < 60),
    todayPlan,
    streak: { days: dashboard.summary.studyStreakDays },
    weeklyAnalytics: { studyMinutes: dashboard.weeklyStudyMinutes, averageQuizScore: dashboard.summary.averageQuizScore },
    recentActivity: dashboard.recentActivities,
    summary: dashboard.summary,
    subjects: dashboard.subjects,
    upcomingExams: dashboard.upcomingExams
  } });
}));

learningRoutes.get('/progress', validateRequest({ query: activityQuery }), asyncHandler(async (req, res) => {
  const query = res.locals.validatedRequest.query as { from?: string; to?: string; cursor?: string; limit: number };
  const data = await getAnalytics(req.auth!.userId, query);
  res.json({ success: true, data: { ...data, hasActivity: data.totals.activityCount > 0, emptyMessage: data.totals.activityCount ? null : 'No progress yet. Complete your first diagnostic assessment to start tracking mastery.' } });
}));

learningRoutes.get('/progress/topics', asyncHandler(async (req, res) => {
  const items = await prisma.topicPerformance.findMany({ where: { userId: req.auth!.userId }, orderBy: [{ accuracy: 'asc' }, { lastStudiedAt: 'asc' }], take: 500, select: {
    attempts: true, correct: true, incorrect: true, accuracy: true, recentAccuracy: true, lastStudiedAt: true,
    topic: { select: { id: true, name: true, canonicalPath: true, subject: { select: { id: true, name: true } }, mastery: { where: { userId: req.auth!.userId }, select: { masteryScore: true, confidence: true } } } }
  } });
  res.json({ success: true, data: { items } });
}));

learningRoutes.get('/progress/subjects', asyncHandler(async (req, res) => {
  const rows = await prisma.topicPerformance.findMany({ where: { userId: req.auth!.userId }, select: { attempts: true, correct: true, incorrect: true, topic: { select: { subject: { select: { id: true, name: true } } } } } });
  const groups = new Map<string, { subject: { id: string; name: string }; attempts: number; correct: number; incorrect: number }>();
  for (const row of rows) {
    const subject = row.topic.subject;
    if (!subject) continue;
    const group = groups.get(subject.id) ?? { subject, attempts: 0, correct: 0, incorrect: 0 };
    group.attempts += row.attempts; group.correct += row.correct; group.incorrect += row.incorrect; groups.set(subject.id, group);
  }
  const items = [...groups.values()].map((group) => ({ ...group, accuracy: group.attempts ? Math.round(group.correct / group.attempts * 10_000) / 100 : null }));
  res.json({ success: true, data: { items } });
}));

learningRoutes.get('/progress/history', validateRequest({ query: activityQuery }), asyncHandler(async (req, res) => {
  const query = res.locals.validatedRequest.query as { from?: string; to?: string; cursor?: string; limit: number };
  const rows = await prisma.learningActivity.findMany({ where: { userId: req.auth!.userId, ...(query.from || query.to ? { occurredAt: { ...(query.from ? { gte: new Date(query.from) } : {}), ...(query.to ? { lte: new Date(query.to) } : {}) } } : {}) }, orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }], take: query.limit + 1, ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}), select: { id: true, type: true, durationMinutes: true, metadata: true, occurredAt: true, subject: { select: { id: true, name: true } }, topic: { select: { id: true, name: true, canonicalPath: true } } } });
  const hasMore = rows.length > query.limit; const items = hasMore ? rows.slice(0, query.limit) : rows;
  res.json({ success: true, data: { items, nextCursor: hasMore ? items.at(-1)?.id ?? null : null } });
}));

learningRoutes.get('/knowledge', asyncHandler(async (req, res) => {
  const topics = await prisma.topic.findMany({ where: { ownerId: req.auth!.userId }, orderBy: [{ subject: { name: 'asc' } }, { canonicalPath: 'asc' }], take: 500, select: {
    id: true, name: true, canonicalPath: true, description: true, importance: true,
    subject: { select: { id: true, name: true } }, parent: { select: { id: true, name: true, canonicalPath: true } },
    objectives: { orderBy: { name: 'asc' }, select: { id: true, name: true, description: true } },
    mastery: { where: { userId: req.auth!.userId }, select: { masteryScore: true, confidence: true, lastStudiedAt: true, lastAssessedAt: true } },
    documentLinks: { where: { document: { ownerId: req.auth!.userId, status: 'READY' } }, select: { evidencePages: true, document: { select: { id: true, fileName: true, documentType: true } } } }
  } });
  res.json({ success: true, data: { items: topics.map((topic) => ({ ...topic, mastery: topic.mastery[0] ?? null, masteryLabel: topic.mastery[0] ? `${Math.round(topic.mastery[0].masteryScore)}%` : 'Not assessed' })) } });
}));

learningRoutes.get('/recommendations/next', validateRequest({ query: recommendationQuery }), asyncHandler(async (req, res) => {
  const query = res.locals.validatedRequest.query as { subjectId?: string };
  const recommendation = await getNextRecommendation(req.auth!.userId, query.subjectId);
  res.json({ success: true, data: recommendation });
}));
learningRoutes.post('/recommendations/:id/complete', validateRequest({ params: recommendationIdParams }), asyncHandler(async (req, res) => {
  res.json({ success: true, data: await completeRecommendation(req.auth!.userId, pathParam(req)) });
}));

learningRoutes.get('/chats', validateRequest({ query: paginationSchema }), asyncHandler(async (req, res) => {
  const query = res.locals.validatedRequest.query as { cursor?: string; limit: number };
  res.json({ success: true, data: await listChats(req.auth!.userId, query) });
}));
learningRoutes.get('/chats/:id', validateRequest({ params: chatIdParams }), asyncHandler(async (req, res) => {
  res.json({ success: true, data: await getChat(req.auth!.userId, pathParam(req)) });
}));
learningRoutes.post('/chats/messages', validateRequest({ body: chatMessageSchema }), asyncHandler(async (req, res) => {
  const input = req.body as { chatId?: string; question: string; subjectId?: string; topicId?: string; documentId?: string };
  res.status(201).json({ success: true, data: await sendTutorMessage(req.auth!.userId, input) });
}));
learningRoutes.post('/tutor/messages', validateRequest({ body: chatMessageSchema }), asyncHandler(async (req, res) => {
  const input = req.body as { chatId?: string; question: string; subjectId?: string; topicId?: string; documentId?: string };
  res.status(201).json({ success: true, data: await sendTutorMessage(req.auth!.userId, input) });
}));
learningRoutes.delete('/chats/:id', validateRequest({ params: chatIdParams }), asyncHandler(async (req, res) => {
  await deleteChat(req.auth!.userId, pathParam(req)); res.status(204).end();
}));

learningRoutes.post('/quizzes/generate', validateRequest({ body: quizGenerateSchema }), asyncHandler(async (req, res) => {
  const result = await generateQuizForUser(req.auth!.userId, req.body as Parameters<typeof generateQuizForUser>[1]);
  res.status(201).json({ success: true, data: result });
}));
learningRoutes.get('/quizzes', validateRequest({ query: paginationSchema }), asyncHandler(async (req, res) => {
  const query = res.locals.validatedRequest.query as { cursor?: string; limit: number };
  res.json({ success: true, data: await listQuizzes(req.auth!.userId, query) });
}));
learningRoutes.get('/quizzes/:id/result', validateRequest({ params: quizIdParams }), asyncHandler(async (req, res) => {
  res.json({ success: true, data: await getLatestQuizResult(req.auth!.userId, pathParam(req)) });
}));
learningRoutes.get('/quizzes/:id', validateRequest({ params: quizIdParams }), asyncHandler(async (req, res) => {
  res.json({ success: true, data: await getQuizForAttempt(req.auth!.userId, pathParam(req)) });
}));
learningRoutes.post('/quizzes/:id/submit', validateRequest({ params: quizIdParams, body: quizSubmitSchema }), asyncHandler(async (req, res) => {
  const input = req.body as { answers: Array<{ questionId: string; answer: string }> };
  res.json({ success: true, data: await submitQuiz(req.auth!.userId, pathParam(req), input.answers) });
}));
learningRoutes.post('/diagnostic/start', validateRequest({ body: quizGenerateSchema }), asyncHandler(async (req, res) => {
  const input = { ...(req.body as Parameters<typeof generateQuizForUser>[1]), quizType: 'DIAGNOSTIC' as const };
  res.status(201).json({ success: true, data: await generateQuizForUser(req.auth!.userId, input) });
}));
learningRoutes.post('/diagnostic/:id/submit', validateRequest({ params: quizIdParams, body: quizSubmitSchema }), asyncHandler(async (req, res) => {
  const quiz = await prisma.quiz.findFirst({ where: { id: pathParam(req), ownerId: req.auth!.userId, quizType: 'DIAGNOSTIC' }, select: { id: true } });
  if (!quiz) throw new ApiError(404, 'DIAGNOSTIC_NOT_FOUND', 'Diagnostic assessment not found');
  res.json({ success: true, data: await submitQuiz(req.auth!.userId, pathParam(req), (req.body as { answers: Array<{ questionId: string; answer: string }> }).answers) });
}));
learningRoutes.get('/diagnostic/:id/result', validateRequest({ params: quizIdParams }), asyncHandler(async (req, res) => {
  const quiz = await prisma.quiz.findFirst({ where: { id: pathParam(req), ownerId: req.auth!.userId, quizType: 'DIAGNOSTIC' }, select: { id: true } });
  if (!quiz) throw new ApiError(404, 'DIAGNOSTIC_NOT_FOUND', 'Diagnostic assessment not found');
  res.json({ success: true, data: await getLatestQuizResult(req.auth!.userId, pathParam(req)) });
}));

learningRoutes.post('/flashcards/generate', validateRequest({ body: flashcardGenerateSchema }), asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, data: await generateFlashcardsForUser(req.auth!.userId, req.body as Parameters<typeof generateFlashcardsForUser>[1]) });
}));
learningRoutes.get('/flashcards', validateRequest({ query: flashcardListQuery }), asyncHandler(async (req, res) => {
  const query = res.locals.validatedRequest.query as { cursor?: string; limit: number; dueOnly: string; topicId?: string };
  res.json({ success: true, data: await listFlashcards(req.auth!.userId, { ...query, dueOnly: query.dueOnly === 'true' }) });
}));
learningRoutes.get('/flashcards/decks/:id', validateRequest({ params: flashcardIdParams }), asyncHandler(async (req, res) => {
  res.json({ success: true, data: await getFlashcardDeck(req.auth!.userId, pathParam(req)) });
}));
learningRoutes.post('/flashcards/:id/review', validateRequest({ params: flashcardIdParams, body: flashcardReviewSchema }), asyncHandler(async (req, res) => {
  res.json({ success: true, data: await reviewFlashcard(req.auth!.userId, pathParam(req), req.body as { known: boolean; responseTimeMs?: number }) });
}));
learningRoutes.delete('/flashcards/:id', validateRequest({ params: flashcardIdParams }), asyncHandler(async (req, res) => {
  await deleteFlashcard(req.auth!.userId, pathParam(req)); res.status(204).end();
}));

learningRoutes.post('/plans/generate', validateRequest({ body: planGenerateSchema }), asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, data: await generatePlanForUser(req.auth!.userId, req.body as Parameters<typeof generatePlanForUser>[1]) });
}));
learningRoutes.get('/plans', validateRequest({ query: planListQuery }), asyncHandler(async (req, res) => {
  res.json({ success: true, data: await listPlans(req.auth!.userId, res.locals.validatedRequest.query as Parameters<typeof listPlans>[1]) });
}));
learningRoutes.get('/plans/:id', validateRequest({ params: planIdParams }), asyncHandler(async (req, res) => {
  res.json({ success: true, data: await getPlan(req.auth!.userId, pathParam(req)) });
}));
learningRoutes.post('/plans/:id/tasks', validateRequest({ params: planIdParams, body: taskCreateSchema }), asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, data: await createTask(req.auth!.userId, pathParam(req), req.body as Parameters<typeof createTask>[2]) });
}));
learningRoutes.patch('/tasks/:id', validateRequest({ params: taskIdParams, body: taskUpdateSchema }), asyncHandler(async (req, res) => {
  res.json({ success: true, data: await updateTask(req.auth!.userId, pathParam(req), req.body as Parameters<typeof updateTask>[2]) });
}));
learningRoutes.delete('/tasks/:id', validateRequest({ params: taskIdParams }), asyncHandler(async (req, res) => {
  await deleteTask(req.auth!.userId, pathParam(req)); res.status(204).end();
}));

learningRoutes.post('/study-sessions', validateRequest({ body: sessionStartSchema }), asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, data: await startStudySession(req.auth!.userId, req.body as { topicId?: string; notes?: string }) });
}));
learningRoutes.get('/study-sessions', validateRequest({ query: sessionListQuery }), asyncHandler(async (req, res) => {
  res.json({ success: true, data: await listStudySessions(req.auth!.userId, res.locals.validatedRequest.query as Parameters<typeof listStudySessions>[1]) });
}));
learningRoutes.post('/study-sessions/:id/finish', validateRequest({ params: planIdParams, body: sessionFinishSchema }), asyncHandler(async (req, res) => {
  const body = req.body as { notes?: string };
  res.json({ success: true, data: await finishStudySession(req.auth!.userId, pathParam(req), body.notes) });
}));

learningRoutes.post('/guided-learning/start', validateRequest({ body: guidedStartSchema }), asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, data: await startGuidedLearning(req.auth!.userId, (req.body as { topicId: string }).topicId) });
}));
learningRoutes.get('/guided-learning/:id', validateRequest({ params: guidedSessionParams }), asyncHandler(async (req, res) => {
  res.json({ success: true, data: await getGuidedLearningSession(req.auth!.userId, pathParam(req)) });
}));
learningRoutes.post('/guided-learning/:id/answer', validateRequest({ params: guidedSessionParams, body: guidedAnswerSchema }), asyncHandler(async (req, res) => {
  res.json({ success: true, data: await answerGuidedLearning(req.auth!.userId, pathParam(req), (req.body as { response: string }).response) });
}));

learningRoutes.get('/settings', asyncHandler(async (req, res) => {
  const current = await getSettings(req.auth!.userId).catch(async (error) => {
    if (error instanceof ApiError && error.code === 'SETTINGS_NOT_FOUND') return updateSettings(req.auth!.userId, { preferredStudyMinutes: 60 });
    throw error;
  });
  res.json({ success: true, data: current });
}));
learningRoutes.patch('/settings', validateRequest({ body: settingsUpdateSchema }), asyncHandler(async (req, res) => {
  res.json({ success: true, data: await updateSettings(req.auth!.userId, req.body as Parameters<typeof updateSettings>[1]) });
}));
learningRoutes.get('/profile', asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.auth!.userId }, select: {
    id: true, name: true, email: true, avatar: true, role: true, createdAt: true, onboardingComplete: true,
    university: { select: { id: true, name: true } }, course: { select: { id: true, name: true } }, semester: { select: { id: true, name: true } },
    subjects: { orderBy: { name: 'asc' }, select: { id: true, name: true, importance: true } },
    _count: { select: { documents: true, quizzes: true, quizAttempts: true, learningSessions: true } }
  } });
  if (!user) throw new ApiError(404, 'USER_NOT_FOUND', 'Account not found');
  res.json({ success: true, data: user });
}));
learningRoutes.patch('/profile', validateRequest({ body: profileUpdateSchema }), asyncHandler(async (req, res) => {
  const updated = await prisma.user.update({ where: { id: req.auth!.userId }, data: req.body as { name?: string; avatar?: string | null }, select: { id: true, name: true, email: true, avatar: true, updatedAt: true } });
  res.json({ success: true, data: updated });
}));
learningRoutes.post('/exams', validateRequest({ body: createExamSchema }), asyncHandler(async (req, res) => {
  const input = req.body as { title: string; examAt: string; subjectId?: string; documentId?: string; importance: number };
  if (input.subjectId && !await prisma.subject.findFirst({ where: { id: input.subjectId, ownerId: req.auth!.userId }, select: { id: true } })) throw new ApiError(404, 'SUBJECT_NOT_FOUND', 'Subject not found');
  if (input.documentId && !await prisma.document.findFirst({ where: { id: input.documentId, ownerId: req.auth!.userId, status: 'READY' }, select: { id: true } })) throw new ApiError(404, 'DOCUMENT_NOT_FOUND', 'Ready document not found');
  const exam = await prisma.examEvent.create({ data: { userId: req.auth!.userId, ...input, examAt: new Date(input.examAt) }, select: { id: true, title: true, examAt: true, importance: true, subject: { select: { id: true, name: true } } } });
  res.status(201).json({ success: true, data: exam });
}));
learningRoutes.get('/exams', asyncHandler(async (req, res) => {
  const items = await prisma.examEvent.findMany({ where: { userId: req.auth!.userId }, orderBy: { examAt: 'asc' }, take: 100, select: { id: true, title: true, examAt: true, importance: true, subject: { select: { id: true, name: true } }, document: { select: { id: true, fileName: true } } } });
  res.json({ success: true, data: { items } });
}));
learningRoutes.delete('/exams/:id', validateRequest({ params: examIdParams }), asyncHandler(async (req, res) => {
  const result = await prisma.examEvent.deleteMany({ where: { id: pathParam(req), userId: req.auth!.userId } });
  if (!result.count) throw new ApiError(404, 'EXAM_NOT_FOUND', 'Exam event not found');
  res.status(204).end();
}));
learningRoutes.post('/exam/analyze', validateRequest({ body: examAnalyzeSchema }), asyncHandler(async (req, res) => {
  const { documentIds } = req.body as { documentIds: string[] };
  const documents = await prisma.document.findMany({ where: { id: { in: documentIds }, ownerId: req.auth!.userId, status: 'READY', documentType: { in: ['PREVIOUS_YEAR_PAPER', 'SYLLABUS'] } }, orderBy: { createdAt: 'asc' }, include: { chunks: { orderBy: { chunkIndex: 'asc' }, select: { pageNumber: true, content: true } } } });
  if (documents.length !== documentIds.length) throw new ApiError(404, 'EXAM_SOURCE_NOT_FOUND', 'One or more selected ready syllabus or previous-year-paper documents were not found');
  const material = documents.map((doc) => doc.chunks.map((chunk) => `[DOCUMENT ${doc.id} | ${doc.fileName} | PAGE ${chunk.pageNumber ?? 'unknown'}]\n${chunk.content}`).join('\n\n')).join('\n\n').slice(0, 80_000);
  if (!material.trim()) throw new ApiError(422, 'NO_SOURCE_MATERIAL', 'Selected exam documents contain no extracted text');
  const analysis = await analyzeExamMaterial(req.auth!.userId, material);
  const citations = analysis.topicFrequency.map((topic) => ({
    topicPath: topic.topicPath,
    mentions: topic.mentions,
    sources: documents.flatMap((doc) => topic.sourcePages.map((page) => ({ documentId: doc.id, documentName: doc.fileName, page })).filter((source) => doc.chunks.some((chunk) => chunk.pageNumber === source.page && chunk.content.trim())))
  }));
  res.json({ success: true, data: { ...analysis, topicFrequency: citations, analyzedDocumentIds: documents.map((doc) => doc.id), notice: 'Frequency describes only the uploaded papers; it is not a prediction of an exact future exam question.' } });
}));
learningRoutes.get('/exam/insights', validateRequest({ query: examInsightsQuery }), asyncHandler(async (req, res) => {
  const query = res.locals.validatedRequest.query as { subjectId?: string };
  if (query.subjectId && !await prisma.subject.findFirst({ where: { id: query.subjectId, ownerId: req.auth!.userId }, select: { id: true } })) throw new ApiError(404, 'SUBJECT_NOT_FOUND', 'Subject not found');
  const [papers, syllabusLinks] = await Promise.all([
    prisma.documentTopic.findMany({ where: { document: { ownerId: req.auth!.userId, status: 'READY', documentType: 'PREVIOUS_YEAR_PAPER', ...(query.subjectId ? { subjectId: query.subjectId } : {}) } }, select: { topicId: true, evidencePages: true, document: { select: { id: true, fileName: true } }, topic: { select: { id: true, name: true, canonicalPath: true, subject: { select: { id: true, name: true } }, mastery: { where: { userId: req.auth!.userId }, select: { masteryScore: true } } } } } }),
    prisma.documentTopic.findMany({ where: { document: { ownerId: req.auth!.userId, status: 'READY', documentType: 'SYLLABUS', ...(query.subjectId ? { subjectId: query.subjectId } : {}) } }, select: { topicId: true } })
  ]);
  const grouped = new Map<string, { topic: typeof papers[number]['topic']; documents: Map<string, { id: string; fileName: string; pages: Set<number> }> }>();
  for (const link of papers) {
    const group = grouped.get(link.topic.id) ?? { topic: link.topic, documents: new Map() };
    const doc = group.documents.get(link.document.id) ?? { id: link.document.id, fileName: link.document.fileName, pages: new Set<number>() };
    link.evidencePages.forEach((page) => doc.pages.add(page)); group.documents.set(link.document.id, doc); grouped.set(link.topic.id, group);
  }
  const items = [...grouped.values()].map(({ topic, documents }) => ({
    topic: { id: topic.id, name: topic.name, canonicalPath: topic.canonicalPath, subject: topic.subject },
    previousPaperCount: documents.size, evidencePages: [...new Set([...documents.values()].flatMap((doc) => [...doc.pages]))].sort((a, b) => a - b),
    sources: [...documents.values()].map((doc) => ({ id: doc.id, name: doc.fileName, pages: [...doc.pages].sort((a, b) => a - b) })),
    mastery: topic.mastery[0]?.masteryScore ?? null
  })).sort((a, b) => b.previousPaperCount - a.previousPaperCount || a.topic.canonicalPath.localeCompare(b.topic.canonicalPath));
  const syllabusTopicIds = new Set(syllabusLinks.map((link) => link.topicId));
  const coveredIds = new Set(papers.map((link) => link.topicId));
  res.json({ success: true, data: { items, syllabusTopicCount: syllabusTopicIds.size, paperCoveredSyllabusTopicCount: [...syllabusTopicIds].filter((id) => coveredIds.has(id)).length, weakTopics: items.filter((item) => item.mastery !== null && item.mastery < 60), coverageGaps: items.filter((item) => item.mastery === null && syllabusTopicIds.has(item.topic.id)).map((item) => ({ topic: item.topic, reason: 'No assessment-based mastery has been recorded' })) } });
}));
