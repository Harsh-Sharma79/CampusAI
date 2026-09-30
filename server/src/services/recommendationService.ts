import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/errors.js';
import type { RecommendationAction } from '@prisma/client';

type CandidateEvidence = {
  masteryScore: number | null;
  confidence: number | null;
  attempts: number;
  recentAccuracy: number | null;
  unresolvedMistakes: number;
  daysSinceRevision: number | null;
  examTitle: string | null;
  daysToExam: number | null;
  examImportance: number | null;
  previousPaperCount: number;
  previousPaperEvidencePages: number;
};

function actualReason(evidence: CandidateEvidence, name: string): string {
  const facts: string[] = [];
  if (evidence.masteryScore !== null) facts.push(`recorded mastery is ${Math.round(evidence.masteryScore)}%`);
  if (evidence.attempts > 0) facts.push(`based on ${evidence.attempts} submitted question${evidence.attempts === 1 ? '' : 's'}`);
  if (evidence.unresolvedMistakes > 0) facts.push(`${evidence.unresolvedMistakes} recorded mistake${evidence.unresolvedMistakes === 1 ? '' : 's'} remain unresolved`);
  if (evidence.daysSinceRevision !== null) facts.push(`last revised ${Math.floor(evidence.daysSinceRevision)} day${Math.floor(evidence.daysSinceRevision) === 1 ? '' : 's'} ago`);
  if (evidence.examTitle && evidence.daysToExam !== null) facts.push(`${evidence.examTitle} is in ${evidence.daysToExam} day${evidence.daysToExam === 1 ? '' : 's'}`);
  if (evidence.previousPaperCount > 0) facts.push(`appears in ${evidence.previousPaperCount} uploaded previous-year paper${evidence.previousPaperCount === 1 ? '' : 's'}`);
  return facts.length ? `Review ${name}: ${facts.join('; ')}.` : `Start with a diagnostic check on ${name}, using your uploaded course materials.`;
}

export async function getNextRecommendation(userId: string, subjectId?: string) {
  if (subjectId) {
    const subject = await prisma.subject.findFirst({ where: { id: subjectId, ownerId: userId }, select: { id: true } });
    if (!subject) throw new ApiError(404, 'SUBJECT_NOT_FOUND', 'Subject not found');
  }
  const now = new Date();
  const [topics, exams, settings] = await Promise.all([
    prisma.topic.findMany({
      where: { ownerId: userId, ...(subjectId ? { subjectId } : {}) },
      select: {
        id: true, name: true, canonicalPath: true, importance: true, subjectId: true,
        subject: { select: { id: true, name: true } },
        parent: { select: { id: true, name: true, mastery: { where: { userId }, select: { masteryScore: true } } } },
        mastery: { where: { userId }, select: { masteryScore: true, confidence: true, attemptCount: true, lastStudiedAt: true } },
        performance: { where: { userId }, select: { attempts: true, recentAccuracy: true } },
        mistakes: { where: { userId, resolvedAt: null }, select: { id: true }, take: 100 },
        documentLinks: {
          where: { document: { ownerId: userId, status: 'READY', documentType: 'PREVIOUS_YEAR_PAPER' } },
          select: { documentId: true, evidencePages: true }
        }
      }
    }),
    prisma.examEvent.findMany({ where: { userId, examAt: { gte: now }, ...(subjectId ? { subjectId } : {}) }, orderBy: { examAt: 'asc' }, select: { title: true, subjectId: true, examAt: true, importance: true } }),
    prisma.userSettings.findUnique({ where: { userId }, select: { preferredStudyMinutes: true } })
  ]);
  if (!topics.length) return null;
  const candidates = topics.map((topic) => {
    const mastery = topic.mastery[0];
    const performance = topic.performance[0];
    const exam = exams.find((candidate) => candidate.subjectId === topic.subjectId) ?? null;
    const daysToExam = exam ? Math.max(0, Math.floor((exam.examAt.getTime() - now.getTime()) / 86_400_000)) : null;
    const daysSinceRevision = mastery?.lastStudiedAt ? Math.max(0, (now.getTime() - mastery.lastStudiedAt.getTime()) / 86_400_000) : null;
    const previousPaperCount = topic.documentLinks.length;
    const previousPaperEvidencePages = topic.documentLinks.reduce((total, link) => total + link.evidencePages.length, 0);
    const parentMastery = topic.parent?.mastery[0]?.masteryScore;
    const parentNeedsReview = typeof parentMastery === 'number' && parentMastery < 45;
    const evidence: CandidateEvidence = {
      masteryScore: mastery?.masteryScore ?? null,
      confidence: mastery?.confidence ?? null,
      attempts: mastery?.attemptCount ?? performance?.attempts ?? 0,
      recentAccuracy: performance?.recentAccuracy ?? null,
      unresolvedMistakes: topic.mistakes.length,
      daysSinceRevision: daysSinceRevision === null ? null : Math.round(daysSinceRevision * 10) / 10,
      examTitle: exam?.title ?? null,
      daysToExam,
      examImportance: exam?.importance ?? null,
      previousPaperCount,
      previousPaperEvidencePages
    };
    const priority = (mastery ? (100 - mastery.masteryScore) * 0.32 : 0)
      + evidence.unresolvedMistakes * 12
      + topic.importance * 3
      + previousPaperCount * 4
      + Math.min(previousPaperEvidencePages, 40) * 0.25
      + (daysToExam === null ? 0 : Math.max(0, 45 - daysToExam) * (exam?.importance ?? 1) * 0.45)
      + (daysSinceRevision === null ? 0 : Math.min(daysSinceRevision, 60) * 0.12)
      + (mastery ? 0 : previousPaperCount > 0 || topic.importance >= 3 ? 8 : 0)
      - (parentNeedsReview ? 6 : 0);
    let action: RecommendationAction;
    if (!mastery) action = 'QUIZ';
    else if (evidence.unresolvedMistakes > 0 || mastery.masteryScore < 50 || parentNeedsReview) action = 'GUIDED_LEARNING';
    else if (mastery.masteryScore < 80) action = 'QUIZ';
    else if (daysSinceRevision !== null && daysSinceRevision >= 7) action = 'FLASHCARDS';
    else action = 'REVIEW';
    return { topic, evidence, priority, action, parentNeedsReview };
  }).sort((left, right) => right.priority - left.priority || left.topic.canonicalPath.localeCompare(right.topic.canonicalPath));

  const best = candidates[0]!;
  const reason = actualReason(best.evidence, best.topic.name);
  const recommendedMinutes = Math.min(45, Math.max(10, settings?.preferredStudyMinutes ?? 60));
  const evidenceJson = { ...best.evidence, topicImportance: best.topic.importance, parentNeedsReview: best.parentNeedsReview };
  const latest = await prisma.recommendation.findFirst({ where: { userId, topicId: best.topic.id, action: best.action, completedAt: null }, orderBy: { createdAt: 'desc' }, select: { id: true } });
  const recommendation = latest
    ? await prisma.recommendation.update({ where: { id: latest.id }, data: { score: best.priority, reason, evidence: evidenceJson, recommendedMinutes }, select: { id: true, action: true, score: true, reason: true, recommendedMinutes: true, createdAt: true } })
    : await prisma.recommendation.create({ data: { userId, topicId: best.topic.id, action: best.action, score: best.priority, reason, evidence: evidenceJson, recommendedMinutes }, select: { id: true, action: true, score: true, reason: true, recommendedMinutes: true, createdAt: true } });
  return { ...recommendation, topic: { id: best.topic.id, name: best.topic.name, canonicalPath: best.topic.canonicalPath, subject: best.topic.subject }, evidence: best.evidence };
}

export async function completeRecommendation(userId: string, id: string) {
  const result = await prisma.recommendation.updateMany({ where: { id, userId, completedAt: null }, data: { completedAt: new Date() } });
  if (!result.count) throw new ApiError(404, 'RECOMMENDATION_NOT_FOUND', 'Recommendation not found');
  return { id, completedAt: new Date() };
}
