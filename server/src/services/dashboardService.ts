import { prisma } from '../config/prisma.js';
import { getNextRecommendation } from './recommendationService.js';

function dateKey(date: Date): string { return date.toISOString().slice(0, 10); }
function startOfUtcDay(date: Date): Date { const day = new Date(date); day.setUTCHours(0, 0, 0, 0); return day; }

function calculateStreak(dates: Date[], now = new Date()): number {
  const activeDays = new Set(dates.map(dateKey));
  let cursor = startOfUtcDay(now);
  if (!activeDays.has(dateKey(cursor))) cursor.setUTCDate(cursor.getUTCDate() - 1);
  let streak = 0;
  while (activeDays.has(dateKey(cursor))) { streak += 1; cursor.setUTCDate(cursor.getUTCDate() - 1); }
  return streak;
}

export async function getDashboard(userId: string) {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000);
  const [user, subjects, documentCounts, dueFlashcards, upcomingExams, masteryRows, recentActivities, activityDates, sessions, quizAttempts, recommendation] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true, avatar: true, onboardingComplete: true, settings: true } }),
    prisma.subject.findMany({ where: { ownerId: userId }, orderBy: { name: 'asc' }, select: { id: true, name: true, importance: true, _count: { select: { topics: true, documents: true } } } }),
    prisma.document.groupBy({ by: ['status'], where: { ownerId: userId }, _count: { _all: true } }),
    prisma.flashcard.count({ where: { ownerId: userId, state: { not: 'SUSPENDED' }, nextReviewAt: { lte: now } } }),
    prisma.examEvent.findMany({ where: { userId, examAt: { gte: now } }, orderBy: { examAt: 'asc' }, take: 5, select: { id: true, title: true, examAt: true, importance: true, subject: { select: { id: true, name: true } } } }),
    prisma.studentMastery.findMany({ where: { userId }, select: { masteryScore: true, confidence: true, topic: { select: { id: true, name: true, canonicalPath: true, subject: { select: { id: true, name: true } } } } } }),
    prisma.learningActivity.findMany({ where: { userId }, orderBy: { occurredAt: 'desc' }, take: 10, select: { id: true, type: true, durationMinutes: true, metadata: true, occurredAt: true, subject: { select: { id: true, name: true } }, topic: { select: { id: true, name: true, canonicalPath: true } } } }),
    prisma.learningActivity.findMany({ where: { userId, occurredAt: { gte: new Date(now.getTime() - 120 * 86_400_000) } }, select: { occurredAt: true } }),
    prisma.studySession.findMany({ where: { userId, startedAt: { gte: weekAgo }, endedAt: { not: null } }, select: { durationMinutes: true, startedAt: true } }),
    prisma.quizAttempt.findMany({ where: { userId, status: 'COMPLETED' }, orderBy: { completedAt: 'desc' }, take: 10, select: { scorePercent: true, completedAt: true } }),
    getNextRecommendation(userId)
  ]);
  const statusCounts = Object.fromEntries(documentCounts.map((entry) => [entry.status.toLowerCase(), entry._count._all]));
  const masteryAverage = masteryRows.length ? masteryRows.reduce((sum, row) => sum + row.masteryScore, 0) / masteryRows.length : null;
  const minutesThisWeek = sessions.reduce((sum, session) => sum + (session.durationMinutes ?? 0), 0);
  const completedAttempts = quizAttempts.filter((attempt) => typeof attempt.scorePercent === 'number');
  const averageQuizScore = completedAttempts.length ? completedAttempts.reduce((sum, attempt) => sum + (attempt.scorePercent ?? 0), 0) / completedAttempts.length : null;
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = startOfUtcDay(new Date(now.getTime() - (6 - index) * 86_400_000));
    return { date: dateKey(date), minutes: sessions.filter((session) => dateKey(session.startedAt) === dateKey(date)).reduce((sum, session) => sum + (session.durationMinutes ?? 0), 0) };
  });
  return {
    user,
    summary: {
      subjectCount: subjects.length,
      documentCounts: statusCounts,
      dueFlashcards,
      upcomingExamCount: upcomingExams.length,
      averageMastery: masteryAverage === null ? null : Math.round(masteryAverage * 10) / 10,
      averageQuizScore: averageQuizScore === null ? null : Math.round(averageQuizScore * 10) / 10,
      studyMinutesThisWeek: minutesThisWeek,
      studyStreakDays: calculateStreak(activityDates.map((activity) => activity.occurredAt))
    },
    subjects,
    upcomingExams,
    mastery: masteryRows,
    recentActivities,
    weeklyStudyMinutes: days,
    recommendation
  };
}

export async function getAnalytics(userId: string, input: { from?: string; to?: string }) {
  const now = new Date();
  const to = input.to ? new Date(input.to) : now;
  const from = input.from ? new Date(input.from) : new Date(to.getTime() - 30 * 86_400_000);
  const [activities, sessions, answers, mastery] = await Promise.all([
    prisma.learningActivity.findMany({ where: { userId, occurredAt: { gte: from, lte: to } }, orderBy: { occurredAt: 'asc' }, select: { type: true, durationMinutes: true, occurredAt: true, subject: { select: { name: true } }, topic: { select: { name: true, canonicalPath: true } } } }),
    prisma.studySession.findMany({ where: { userId, startedAt: { gte: from, lte: to } }, orderBy: { startedAt: 'asc' }, select: { durationMinutes: true, startedAt: true, endedAt: true, topic: { select: { name: true } } } }),
    prisma.quizAnswer.findMany({ where: { attempt: { userId, status: 'COMPLETED', completedAt: { gte: from, lte: to } } }, select: { isCorrect: true, awardedPoints: true, answeredAt: true } }),
    prisma.studentMastery.findMany({ where: { userId }, orderBy: { masteryScore: 'asc' }, select: { masteryScore: true, confidence: true, lastStudiedAt: true, topic: { select: { id: true, name: true, canonicalPath: true, subject: { select: { name: true } } } } } })
  ]);
  const daily = new Map<string, { minutes: number; activities: number; quizAnswers: number; correctAnswers: number }>();
  for (const activity of activities) {
    const key = dateKey(activity.occurredAt); const row = daily.get(key) ?? { minutes: 0, activities: 0, quizAnswers: 0, correctAnswers: 0 };
    row.activities += 1; row.minutes += activity.durationMinutes ?? 0; daily.set(key, row);
  }
  for (const session of sessions) {
    const key = dateKey(session.startedAt); const row = daily.get(key) ?? { minutes: 0, activities: 0, quizAnswers: 0, correctAnswers: 0 };
    row.minutes += session.durationMinutes ?? 0; daily.set(key, row);
  }
  for (const answer of answers) {
    const key = dateKey(answer.answeredAt); const row = daily.get(key) ?? { minutes: 0, activities: 0, quizAnswers: 0, correctAnswers: 0 };
    row.quizAnswers += 1; if (answer.isCorrect) row.correctAnswers += 1; daily.set(key, row);
  }
  const quizAccuracy = answers.length ? answers.filter((answer) => answer.isCorrect).length / answers.length * 100 : null;
  return {
    range: { from: from.toISOString(), to: to.toISOString() },
    totals: {
      activityCount: activities.length,
      studyMinutes: sessions.reduce((sum, session) => sum + (session.durationMinutes ?? 0), 0),
      quizAnswers: answers.length,
      quizAccuracy: quizAccuracy === null ? null : Math.round(quizAccuracy * 10) / 10,
      averageMastery: mastery.length ? Math.round(mastery.reduce((sum, row) => sum + row.masteryScore, 0) / mastery.length * 10) / 10 : null
    },
    daily: [...daily.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, values]) => ({ date, ...values })),
    topicMastery: mastery
  };
}
