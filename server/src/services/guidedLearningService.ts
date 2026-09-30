import { prisma } from '../config/prisma.js';
import { generateLearningLesson, gradeShortAnswer } from '../ai/geminiService.js';
import { retrieveRelevantChunks } from '../rag/retrievalService.js';
import { refreshTopicMastery } from './masteryService.js';
import { ApiError } from '../utils/errors.js';

export async function startGuidedLearning(userId: string, topicId: string) {
  const topic = await prisma.topic.findFirst({ where: { id: topicId, ownerId: userId }, select: { id: true, name: true, canonicalPath: true, description: true, subjectId: true } });
  if (!topic) throw new ApiError(404, 'TOPIC_NOT_FOUND', 'Topic not found');
  const sources = await retrieveRelevantChunks({ userId, query: topic.canonicalPath, subjectId: topic.subjectId, limit: 10 });
  if (!sources.length) throw new ApiError(422, 'NO_SOURCE_MATERIAL', 'Upload and process course material for this topic before starting guided learning');
  const lesson = await generateLearningLesson(userId, { name: topic.canonicalPath, description: topic.description, objectives: [] }, sources.map((source) => ({ documentName: source.documentName, pageNumber: source.pageNumber, content: source.content })));
  const prompts = [
    { question: lesson.openingQuestion, expectedConcept: lesson.objective, explanation: lesson.objective },
    ...lesson.steps.map((step) => ({ question: step.question, expectedConcept: step.expectedConcept, explanation: step.explanation }))
  ];
  const session = await prisma.$transaction(async (tx) => {
    const created = await tx.guidedLearningSession.create({ data: { userId, topicId: topic.id, status: 'ACTIVE', currentStep: 1 } });
    await tx.guidedLearningStep.createMany({ data: prompts.map((step, index) => ({
      sessionId: created.id, stepNumber: index + 1, prompt: step.question,
      expectedConcept: step.expectedConcept, explanation: step.explanation
    })) });
    return created;
  });
  return {
    id: session.id, status: session.status, currentStep: session.currentStep, totalSteps: prompts.length,
    topic: { id: topic.id, name: topic.name, canonicalPath: topic.canonicalPath },
    step: { stepNumber: 1, prompt: prompts[0]!.question },
    sourceCitations: sources.map((source) => ({ documentId: source.documentId, documentName: source.documentName, page: source.pageNumber }))
  };
}

export async function answerGuidedLearning(userId: string, sessionId: string, response: string) {
  const session = await prisma.guidedLearningSession.findFirst({ where: { id: sessionId, userId }, include: { topic: { select: { id: true, name: true, canonicalPath: true } } } });
  if (!session) throw new ApiError(404, 'LEARNING_SESSION_NOT_FOUND', 'Guided-learning session not found');
  if (session.status !== 'ACTIVE') throw new ApiError(409, 'LEARNING_SESSION_FINISHED', 'This guided-learning session is already finished');
  const step = await prisma.guidedLearningStep.findUnique({ where: { sessionId_stepNumber: { sessionId, stepNumber: session.currentStep } } });
  if (!step) throw new ApiError(409, 'LEARNING_STEP_NOT_FOUND', 'The current learning step is unavailable');
  const grade = await gradeShortAnswer(userId, { question: step.prompt, correctAnswer: step.expectedConcept ?? '', gradingRubric: step.expectedConcept ?? '', studentAnswer: response });
  const nextStep = await prisma.guidedLearningStep.findFirst({ where: { sessionId, stepNumber: { gt: step.stepNumber } }, orderBy: { stepNumber: 'asc' }, select: { stepNumber: true, prompt: true } });
  const completed = !nextStep;
  const result = await prisma.$transaction(async (tx) => {
    await tx.guidedLearningStep.update({ where: { id: step.id }, data: { response, feedback: grade.feedback, awardedPoints: grade.awardedPoints, answeredAt: new Date() } });
    await tx.guidedLearningSession.update({ where: { id: sessionId }, data: {
      currentStep: nextStep?.stepNumber ?? session.currentStep,
      status: completed ? 'COMPLETED' : 'ACTIVE',
      ...(completed ? { completedAt: new Date() } : {})
    } });
    await tx.learningActivity.create({ data: { userId, topicId: session.topicId, type: 'GUIDED_LEARNING', metadata: { sessionId, stepNumber: step.stepNumber, awardedPoints: grade.awardedPoints, completed } } });
    await refreshTopicMastery(tx, userId, session.topicId);
    return tx.guidedLearningSession.findUnique({ where: { id: sessionId }, select: { id: true, status: true, currentStep: true, completedAt: true } });
  });
  return {
    session: result,
    topic: session.topic,
    feedback: grade.feedback,
    awardedPoints: grade.awardedPoints,
    explanation: step.explanation,
    nextStep: nextStep ? { stepNumber: nextStep.stepNumber, prompt: nextStep.prompt } : null
  };
}

export async function getGuidedLearningSession(userId: string, sessionId: string) {
  const session = await prisma.guidedLearningSession.findFirst({ where: { id: sessionId, userId }, select: {
    id: true, status: true, currentStep: true, startedAt: true, completedAt: true,
    topic: { select: { id: true, name: true, canonicalPath: true } },
    steps: { orderBy: { stepNumber: 'asc' }, select: { id: true, stepNumber: true, prompt: true, response: true, feedback: true, explanation: true, awardedPoints: true, answeredAt: true } }
  } });
  if (!session) throw new ApiError(404, 'LEARNING_SESSION_NOT_FOUND', 'Guided-learning session not found');
  return session;
}
