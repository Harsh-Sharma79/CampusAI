import { z } from 'zod';
import { idSchema, paginationSchema } from './common.js';

const optionalIds = {
  subjectId: idSchema.optional(),
  topicId: idSchema.optional(),
  documentId: idSchema.optional()
};

export const chatCreateSchema = z.object({ title: z.string().trim().min(1).max(160).optional(), ...optionalIds }).strict();
export const chatMessageSchema = z.object({
  chatId: idSchema.optional(),
  question: z.string().trim().min(1).max(10_000),
  ...optionalIds
}).strict();
export const chatIdParams = z.object({ id: idSchema }).strict();

export const quizGenerateSchema = z.object({
  ...optionalIds,
  count: z.number().int().min(1).max(40).default(10),
  difficulty: z.enum(['FOUNDATIONAL', 'INTERMEDIATE', 'ADVANCED']).optional(),
  quizType: z.enum(['PRACTICE', 'DIAGNOSTIC']).default('PRACTICE')
}).strict().superRefine((value, ctx) => {
  if (!value.documentId && !value.topicId && !value.subjectId) ctx.addIssue({ code: 'custom', path: [], message: 'Choose a document, topic, or subject with available study material' });
});
export const quizIdParams = z.object({ id: idSchema }).strict();
export const quizSubmitSchema = z.object({
  answers: z.array(z.object({ questionId: idSchema, answer: z.string().trim().min(1).max(2_000) }).strict()).min(1).max(40)
}).strict().superRefine((value, ctx) => {
  const ids = value.answers.map((answer) => answer.questionId);
  if (new Set(ids).size !== ids.length) ctx.addIssue({ code: 'custom', path: ['answers'], message: 'Each question may be answered once' });
});

export const flashcardGenerateSchema = z.object({ ...optionalIds, count: z.number().int().min(1).max(50).default(20) }).strict()
  .superRefine((value, ctx) => {
    if (!value.documentId && !value.topicId && !value.subjectId) ctx.addIssue({ code: 'custom', path: [], message: 'Choose a document, topic, or subject with available study material' });
  });
export const flashcardIdParams = z.object({ id: idSchema }).strict();
export const flashcardReviewSchema = z.object({ known: z.boolean(), responseTimeMs: z.number().int().min(0).max(600_000).optional() }).strict();
export const flashcardListQuery = paginationSchema.extend({ dueOnly: z.enum(['true', 'false']).default('false'), topicId: idSchema.optional() }).strict();

export const planGenerateSchema = z.object({ startDate: z.iso.datetime().optional(), days: z.number().int().min(1).max(90).default(14), subjectId: idSchema.optional() }).strict();
export const planListQuery = paginationSchema.extend({ from: z.iso.datetime().optional(), to: z.iso.datetime().optional() }).strict();
export const planIdParams = z.object({ id: idSchema }).strict();
export const taskIdParams = z.object({ id: idSchema }).strict();
export const taskCreateSchema = z.object({
  topicId: idSchema.optional(),
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2_000).optional(),
  scheduledFor: z.iso.datetime(),
  recommendedMinutes: z.number().int().min(5).max(720)
}).strict();
export const taskUpdateSchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  description: z.string().trim().max(2_000).nullable().optional(),
  scheduledFor: z.iso.datetime().optional(),
  recommendedMinutes: z.number().int().min(5).max(720).optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED']).optional()
}).strict().refine((value) => Object.keys(value).length > 0, 'At least one field is required');

export const sessionStartSchema = z.object({ topicId: idSchema.optional(), notes: z.string().trim().max(2_000).optional() }).strict();
export const sessionFinishSchema = z.object({ notes: z.string().trim().max(2_000).optional() }).strict();
export const sessionListQuery = paginationSchema.extend({ from: z.iso.datetime().optional(), to: z.iso.datetime().optional() }).strict();
export const settingsUpdateSchema = z.object({
  preferredStudyMinutes: z.number().int().min(10).max(720).optional(),
  notificationsEnabled: z.boolean().optional(),
  emailNotifications: z.boolean().optional(),
  aiResponseStyle: z.enum(['guided', 'concise', 'detailed']).optional()
}).strict().refine((value) => Object.keys(value).length > 0, 'At least one setting is required');
export const recommendationQuery = z.object({ subjectId: idSchema.optional() }).strict();
export const activityQuery = paginationSchema.extend({ from: z.iso.datetime().optional(), to: z.iso.datetime().optional() }).strict();
export const adminQuery = paginationSchema.extend({ search: z.string().trim().max(200).optional(), status: z.string().trim().max(80).optional() }).strict();
