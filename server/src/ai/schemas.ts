import { z } from 'zod';

const shortText = z.string().trim().min(1).max(500);
const mediumText = z.string().trim().min(1).max(2_000);

export const documentAnalysisSchema = z.object({
  subjectName: shortText,
  summary: z.string().trim().min(1).max(4_000),
  topics: z.array(z.object({
    canonicalPath: z.string().trim().min(1).max(240),
    name: shortText,
    description: z.string().trim().max(1_200).default(''),
    importance: z.number().int().min(1).max(5),
    objectives: z.array(z.object({ name: shortText, description: z.string().trim().max(800).default('') }).strict()).max(20).default([]),
    evidencePages: z.array(z.number().int().positive()).max(40).default([]),
    examFrequency: z.number().int().min(0).max(100).nullable().default(null)
  }).strict()).min(1).max(100),
  coverageGaps: z.array(shortText).max(50).default([])
}).strict();

export const questionDraftSchema = z.object({
  prompt: mediumText,
  type: z.enum(['MCQ', 'TRUE_FALSE', 'SHORT_ANSWER']),
  options: z.array(shortText).min(2).max(5).optional(),
  correctAnswer: mediumText,
  gradingRubric: z.string().trim().max(1_500).optional(),
  explanation: z.string().trim().max(2_000).default(''),
  difficulty: z.enum(['FOUNDATIONAL', 'INTERMEDIATE', 'ADVANCED']),
  topicPath: z.string().trim().min(1).max(240),
  pageNumber: z.number().int().positive().nullable().default(null)
}).strict().superRefine((question, ctx) => {
  if (question.type === 'MCQ' && (!question.options || question.options.length < 2)) {
    ctx.addIssue({ code: 'custom', path: ['options'], message: 'MCQ items require at least two options' });
  }
  if (question.type !== 'MCQ' && question.options) {
    ctx.addIssue({ code: 'custom', path: ['options'], message: 'Only MCQ items may provide options' });
  }
  if (question.type === 'TRUE_FALSE' && !['true', 'false'].includes(question.correctAnswer.trim().toLowerCase())) {
    ctx.addIssue({ code: 'custom', path: ['correctAnswer'], message: 'True/False keys must be exactly True or False' });
  }
});

export const quizDraftSchema = z.object({
  title: shortText,
  questions: z.array(questionDraftSchema).min(1).max(40)
}).strict();

export const flashcardDraftSchema = z.object({
  topicPath: z.string().trim().min(1).max(240),
  front: mediumText,
  back: mediumText,
  sourcePage: z.number().int().positive().nullable().default(null)
}).strict();
export const flashcardSetSchema = z.object({
  title: shortText,
  cards: z.array(flashcardDraftSchema).min(1).max(50)
}).strict();

export const lessonStepSchema = z.object({
  question: mediumText,
  expectedConcept: mediumText,
  explanation: z.string().trim().max(2_000).default(''),
  nextQuestion: z.string().trim().max(1_000).nullable().default(null)
}).strict();
export const learningLessonSchema = z.object({
  openingQuestion: mediumText,
  objective: mediumText,
  steps: z.array(lessonStepSchema).min(1).max(12)
}).strict();

export const tutorReplySchema = z.object({
  answer: z.string().trim().min(1).max(12_000),
  followUpQuestion: z.string().trim().max(1_000).nullable().default(null),
  learningAction: z.enum(['NONE', 'GUIDED_LEARNING', 'QUIZ', 'FLASHCARDS', 'REVIEW']).default('NONE')
}).strict();

export const studyPlanDraftSchema = z.object({
  title: shortText,
  tasks: z.array(z.object({
    dayOffset: z.number().int().min(0).max(365),
    topicPath: z.string().trim().max(240).nullable().default(null),
    title: shortText,
    description: z.string().trim().max(1_200).default(''),
    recommendedMinutes: z.number().int().min(5).max(240),
    action: z.enum(['GUIDED_LEARNING', 'QUIZ', 'FLASHCARDS', 'REVIEW', 'READ_DOCUMENT'])
  }).strict()).min(1).max(200)
}).strict();

export const mistakeAnalysisSchema = z.object({
  misconception: mediumText,
  remediation: z.array(mediumText).min(1).max(8),
  suggestedAction: z.enum(['GUIDED_LEARNING', 'QUIZ', 'FLASHCARDS', 'REVIEW', 'READ_DOCUMENT'])
}).strict();

export const recommendationExplanationSchema = z.object({
  explanation: mediumText
}).strict();

export const examAnalysisSchema = z.object({
  topicFrequency: z.array(z.object({ topicPath: shortText, mentions: z.number().int().positive(), sourcePages: z.array(z.number().int().positive()).max(100) }).strict()).max(100),
  coverageGaps: z.array(shortText).max(100),
  limitations: z.array(shortText).max(20)
}).strict();

export type DocumentAnalysis = z.infer<typeof documentAnalysisSchema>;
export type QuizDraft = z.infer<typeof quizDraftSchema>;
export type FlashcardSet = z.infer<typeof flashcardSetSchema>;
export type LearningLesson = z.infer<typeof learningLessonSchema>;
export type TutorReply = z.infer<typeof tutorReplySchema>;
export type StudyPlanDraft = z.infer<typeof studyPlanDraftSchema>;
