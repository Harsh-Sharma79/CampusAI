import type { Prisma } from '@prisma/client';
import { calculateMastery } from './masteryEngine.js';

type DbClient = Prisma.TransactionClient;

export async function refreshTopicMastery(tx: DbClient, userId: string, topicId: string): Promise<void> {
  const [answers, reviews, guidedAnswers] = await Promise.all([
    tx.quizAnswer.findMany({
      where: { attempt: { userId }, question: { topicId } },
      orderBy: { answeredAt: 'desc' }, take: 100,
      select: { isCorrect: true, awardedPoints: true, answeredAt: true }
    }),
    tx.flashcardReview.findMany({
      where: { flashcard: { ownerId: userId, topicId } },
      orderBy: { reviewedAt: 'desc' }, take: 20,
      select: { known: true, reviewedAt: true }
    }),
    tx.guidedLearningStep.findMany({
      where: { session: { is: { userId, topicId } }, answeredAt: { not: null }, awardedPoints: { not: null } },
      orderBy: { answeredAt: 'desc' }, take: 20,
      select: { awardedPoints: true, answeredAt: true }
    })
  ]);
  const attemptCount = answers.length;
  const correctCount = answers.filter((answer) => answer.isCorrect).length;
  const recent = answers.slice(0, 10);
  const recentAccuracy = recent.length ? recent.filter((answer) => answer.isCorrect).length / recent.length : null;
  const flashcardRecall = reviews.length ? reviews.filter((review) => review.known).length / reviews.length : null;
  const guidedAccuracy = guidedAnswers.length ? guidedAnswers.reduce((sum, answer) => sum + (answer.awardedPoints ?? 0), 0) / guidedAnswers.length : null;
  const lastStudiedAt = [answers[0]?.answeredAt, reviews[0]?.reviewedAt, guidedAnswers[0]?.answeredAt].filter((date): date is Date => Boolean(date)).sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
  const daysSinceStudied = lastStudiedAt ? (Date.now() - lastStudiedAt.getTime()) / 86_400_000 : null;
  const mastery = calculateMastery({ attemptCount, correctCount, recentAccuracy, flashcardRecall, guidedAccuracy, daysSinceStudied });
  if (!mastery) return;

  const accuracy = attemptCount ? correctCount / attemptCount : null;
  await tx.studentMastery.upsert({
    where: { userId_topicId: { userId, topicId } },
    create: { userId, topicId, masteryScore: mastery.score, confidence: mastery.confidence, attemptCount, correctCount, incorrectCount: attemptCount - correctCount, lastStudiedAt, lastAssessedAt: answers[0]?.answeredAt ?? guidedAnswers[0]?.answeredAt ?? null },
    update: { masteryScore: mastery.score, confidence: mastery.confidence, attemptCount, correctCount, incorrectCount: attemptCount - correctCount, lastStudiedAt, lastAssessedAt: answers[0]?.answeredAt ?? guidedAnswers[0]?.answeredAt ?? null }
  });
  await tx.topicPerformance.upsert({
    where: { userId_topicId: { userId, topicId } },
    create: { userId, topicId, attempts: attemptCount, correct: correctCount, incorrect: attemptCount - correctCount, accuracy, recentAccuracy, lastStudiedAt },
    update: { attempts: attemptCount, correct: correctCount, incorrect: attemptCount - correctCount, accuracy, recentAccuracy, lastStudiedAt }
  });
}
