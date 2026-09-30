import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { generateDiagnosticQuiz, generateQuiz as generateQuizContent, gradeShortAnswers } from '../ai/geminiService.js';
import { retrieveRelevantChunks } from '../rag/retrievalService.js';
import { difficultyForMastery, normalizeAnswer } from './masteryEngine.js';
import { refreshTopicMastery } from './masteryService.js';
import { enqueueBackgroundJob } from '../jobs/queueService.js';
import { ApiError } from '../utils/errors.js';

export type QuizGenerationInput = {
  subjectId?: string;
  topicId?: string;
  documentId?: string;
  count: number;
  difficulty?: 'FOUNDATIONAL' | 'INTERMEDIATE' | 'ADVANCED';
  quizType: 'PRACTICE' | 'DIAGNOSTIC';
};

async function resolveQuizScope(userId: string, input: QuizGenerationInput) {
  let subjectId = input.subjectId;
  let topic: { id: string; name: string; canonicalPath: string; description: string | null; subjectId: string } | null = null;
  if (input.topicId) {
    topic = await prisma.topic.findFirst({ where: { id: input.topicId, ownerId: userId }, select: { id: true, name: true, canonicalPath: true, description: true, subjectId: true } });
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
    if (subjectId && document.subjectId && document.subjectId !== subjectId) throw new ApiError(400, 'SOURCE_SCOPE_MISMATCH', 'The selected document does not belong to the selected subject');
    subjectId ??= document.subjectId ?? undefined;
  }
  const query = topic ? topic.canonicalPath : subjectId ? (await prisma.subject.findUnique({ where: { id: subjectId }, select: { name: true } }))?.name ?? 'course study material' : 'course study material';
  return { subjectId, topic, query };
}

export async function generateQuizForUser(userId: string, input: QuizGenerationInput): Promise<{ id: string; title: string; questionCount: number }> {
  const scope = await resolveQuizScope(userId, input);
  const sources = await retrieveRelevantChunks({ userId, query: scope.query, ...(scope.subjectId ? { subjectId: scope.subjectId } : {}), ...(input.documentId ? { documentId: input.documentId } : {}), limit: 16 });
  if (!sources.length) throw new ApiError(422, 'NO_SOURCE_MATERIAL', 'No processed study material is available for this topic yet');
  const mastery = scope.topic ? await prisma.studentMastery.findFirst({ where: { userId, topicId: scope.topic.id }, select: { masteryScore: true } }) : null;
  const difficulty = input.quizType === 'DIAGNOSTIC' ? 'FOUNDATIONAL' : input.difficulty ?? difficultyForMastery(mastery?.masteryScore ?? null);
  const context = [scope.topic ? `SELECTED TOPIC: ${scope.topic.canonicalPath}\n${scope.topic.description ?? ''}` : '',
    ...sources.map((source) => `[SOURCE ${source.documentName}; page ${source.pageNumber ?? 'unknown'}; chunk ${source.chunkId}]\n${source.content}`)].filter(Boolean).join('\n\n');
  const draft = input.quizType === 'DIAGNOSTIC'
    ? await generateDiagnosticQuiz(userId, context, input.count)
    : await generateQuizContent(userId, context, input.count, difficulty);
  const pageNumbers = new Set(sources.filter((source) => input.documentId ? source.documentId === input.documentId : true).map((source) => source.pageNumber).filter((page): page is number => page !== null));
  const documentIdForQuestions = input.documentId ?? null;
  const saved = await prisma.$transaction(async (tx) => {
    const quiz = await tx.quiz.create({ data: {
      ownerId: userId, subjectId: scope.subjectId ?? null, topicId: scope.topic?.id ?? null,
      documentId: input.documentId ?? null, title: draft.title, quizType: input.quizType, difficulty
    } });
    for (const [index, question] of draft.questions.entries()) {
      const topic = scope.topic ?? (scope.subjectId ? await tx.topic.findFirst({ where: { ownerId: userId, subjectId: scope.subjectId, canonicalPath: question.topicPath }, select: { id: true } }) : null);
      let options: string[] | undefined;
      if (question.type === 'MCQ') {
        options = question.options;
        if (!options?.some((option) => normalizeAnswer(option) === normalizeAnswer(question.correctAnswer))) {
          throw new ApiError(502, 'AI_INVALID_QUESTION', 'A generated multiple-choice answer did not match its options');
        }
      } else if (question.type === 'TRUE_FALSE') {
        options = ['True', 'False'];
      }
      const validPage = input.documentId && question.pageNumber !== null && pageNumbers.has(question.pageNumber) ? question.pageNumber : null;
      await tx.question.create({ data: {
        quizId: quiz.id, documentId: documentIdForQuestions, topicId: topic?.id ?? null,
        type: question.type, prompt: question.prompt, options: options ? options : Prisma.JsonNull,
        correctAnswer: question.type === 'TRUE_FALSE' ? question.correctAnswer.trim().toLowerCase() : question.correctAnswer,
        gradingRubric: question.gradingRubric ?? (question.type === 'SHORT_ANSWER' ? question.explanation : null),
        explanation: question.explanation, difficulty: question.difficulty, pageNumber: validPage, position: index + 1
      } });
    }
    return quiz;
  });
  return { id: saved.id, title: saved.title, questionCount: draft.questions.length };
}

export async function enqueueQuizGeneration(userId: string, input: QuizGenerationInput) {
  const job = await enqueueBackgroundJob({ userId, type: 'GENERATE_QUIZ', payload: input });
  return { jobId: job.id, status: job.status };
}

export async function listQuizzes(userId: string, input: { cursor?: string; limit: number }) {
  const rows = await prisma.quiz.findMany({ where: { ownerId: userId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: input.limit + 1,
    ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
    select: { id: true, title: true, quizType: true, difficulty: true, createdAt: true, subject: { select: { id: true, name: true } }, topic: { select: { id: true, name: true, canonicalPath: true } }, _count: { select: { questions: true, attempts: true } } }
  });
  const hasMore = rows.length > input.limit;
  const items = hasMore ? rows.slice(0, input.limit) : rows;
  return { items, nextCursor: hasMore ? items.at(-1)?.id ?? null : null };
}

export async function getQuizForAttempt(userId: string, id: string) {
  const quiz = await prisma.quiz.findFirst({ where: { id, ownerId: userId }, select: {
    id: true, title: true, quizType: true, difficulty: true, createdAt: true,
    subject: { select: { id: true, name: true } }, topic: { select: { id: true, name: true, canonicalPath: true } },
    questions: { orderBy: { position: 'asc' }, select: { id: true, type: true, prompt: true, options: true, difficulty: true, position: true, pageNumber: true, document: { select: { fileName: true } } } }
  } });
  if (!quiz) throw new ApiError(404, 'QUIZ_NOT_FOUND', 'Quiz not found');
  return quiz;
}

export async function submitQuiz(userId: string, quizId: string, input: Array<{ questionId: string; answer: string }>) {
  const quiz = await prisma.quiz.findFirst({ where: { id: quizId, ownerId: userId }, include: { questions: { orderBy: { position: 'asc' } } } });
  if (!quiz) throw new ApiError(404, 'QUIZ_NOT_FOUND', 'Quiz not found');
  if (input.length !== quiz.questions.length || input.some((answer) => !quiz.questions.some((question) => question.id === answer.questionId))) {
    throw new ApiError(400, 'ANSWER_SET_MISMATCH', 'Submit one answer for every question in this quiz');
  }
  const answersById = new Map(input.map((answer) => [answer.questionId, answer.answer]));
  const shortAnswerQuestions = quiz.questions.filter((question) => question.type === 'SHORT_ANSWER');
  const gradeResults = shortAnswerQuestions.length ? await gradeShortAnswers(userId, shortAnswerQuestions.map((question) => ({
    questionId: question.id, question: question.prompt, correctAnswer: question.correctAnswer,
    gradingRubric: question.gradingRubric ?? question.explanation ?? '', studentAnswer: answersById.get(question.id)!
  }))) : [];
  const gradedById = new Map(gradeResults.map((result) => [result.questionId, result]));
  const scored = quiz.questions.map((question) => {
    const answer = answersById.get(question.id)!;
    if (question.type === 'SHORT_ANSWER') {
      const grade = gradedById.get(question.id);
      if (!grade) throw new ApiError(502, 'AI_INVALID_GRADING', 'An answer was not graded. Please retry.');
      return { question, answer, awardedPoints: grade.awardedPoints, isCorrect: grade.awardedPoints >= 0.7, feedback: grade.feedback };
    }
    const correctAnswer = question.type === 'TRUE_FALSE' ? question.correctAnswer.toLowerCase() : question.correctAnswer;
    const normalizedAnswer = normalizeAnswer(answer);
    const normalizedKey = normalizeAnswer(correctAnswer);
    if (question.type === 'TRUE_FALSE' && !['true', 'false'].includes(normalizedAnswer)) throw new ApiError(400, 'INVALID_TRUE_FALSE_ANSWER', 'True/False answers must be True or False');
    if (question.type === 'MCQ' && Array.isArray(question.options) && !question.options.some((option) => typeof option === 'string' && normalizeAnswer(option) === normalizedAnswer)) {
      throw new ApiError(400, 'INVALID_OPTION', 'Select one of the options provided for this question');
    }
    const isCorrect = normalizedAnswer === normalizedKey;
    return { question, answer, awardedPoints: isCorrect ? 1 : 0, isCorrect, feedback: isCorrect ? 'Correct.' : (question.explanation ?? 'Review the supporting material and try again.') };
  });
  const correctCount = scored.filter((entry) => entry.isCorrect).length;
  const scorePercent = Math.round(scored.reduce((sum, entry) => sum + entry.awardedPoints, 0) / scored.length * 10_000) / 100;
  const attempt = await prisma.$transaction(async (tx) => {
    const created = await tx.quizAttempt.create({ data: { userId, quizId, status: 'COMPLETED', scorePercent, correctCount, incorrectCount: scored.length - correctCount, completedAt: new Date() } });
    await tx.quizAnswer.createMany({ data: scored.map((entry) => ({
      attemptId: created.id, questionId: entry.question.id, response: entry.answer,
      isCorrect: entry.isCorrect, awardedPoints: entry.awardedPoints, feedback: entry.feedback
    })) });
    const topicIds = new Set(scored.map((entry) => entry.question.topicId).filter((id): id is string => Boolean(id)));
    for (const entry of scored) {
      if (!entry.isCorrect) await tx.mistake.create({ data: {
        userId, topicId: entry.question.topicId, questionId: entry.question.id, attemptId: created.id,
        studentAnswer: entry.answer, correctAnswer: entry.question.correctAnswer, explanation: entry.question.explanation
      } });
    }
    for (const topicId of topicIds) await refreshTopicMastery(tx, userId, topicId);
    await tx.learningActivity.create({ data: { userId, subjectId: quiz.subjectId, topicId: quiz.topicId, type: quiz.quizType === 'DIAGNOSTIC' ? 'DIAGNOSTIC_COMPLETED' : 'QUIZ_COMPLETED', metadata: { quizId, attemptId: created.id, scorePercent, questionCount: scored.length } } });
    return created;
  });
  await enqueueBackgroundJob({ userId, type: 'UPDATE_RECOMMENDATIONS', payload: {} });
  return { attemptId: attempt.id, scorePercent, correctCount, incorrectCount: scored.length - correctCount, answers: scored.map((entry) => ({ questionId: entry.question.id, isCorrect: entry.isCorrect, awardedPoints: entry.awardedPoints, feedback: entry.feedback })) };
}

export async function getLatestQuizResult(userId: string, quizId: string) {
  const quiz = await prisma.quiz.findFirst({ where: { id: quizId, ownerId: userId }, select: { id: true } });
  if (!quiz) throw new ApiError(404, 'QUIZ_NOT_FOUND', 'Quiz not found');
  const attempt = await prisma.quizAttempt.findFirst({
    where: { userId, quizId, status: 'COMPLETED' },
    orderBy: { completedAt: 'desc' },
    include: {
      answers: {
        orderBy: { answeredAt: 'asc' },
        include: {
          question: {
            select: {
              id: true, prompt: true, correctAnswer: true, explanation: true,
              type: true, pageNumber: true, document: { select: { fileName: true } }
            }
          }
        }
      }
    }
  });
  if (!attempt) return null;
  return { id: attempt.id, scorePercent: attempt.scorePercent, correctCount: attempt.correctCount, incorrectCount: attempt.incorrectCount, completedAt: attempt.completedAt, answers: attempt.answers.map((answer) => ({
    questionId: answer.questionId, prompt: answer.question.prompt, studentAnswer: answer.response, correctAnswer: answer.question.correctAnswer,
    isCorrect: answer.isCorrect, awardedPoints: answer.awardedPoints, feedback: answer.feedback,
    explanation: answer.question.explanation, pageNumber: answer.question.pageNumber, sourceDocument: answer.question.document?.fileName ?? null
  })) };
}
