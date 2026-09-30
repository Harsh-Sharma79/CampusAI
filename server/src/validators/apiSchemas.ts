import { z } from 'zod';
import { idSchema } from './common.js';

export const jobIdParams = z.object({ id: idSchema }).strict();
export const examAnalyzeSchema = z.object({
  documentIds: z.array(idSchema).min(1).max(10)
}).strict();
export const examInsightsQuery = z.object({ subjectId: idSchema.optional() }).strict();
export const createExamSchema = z.object({
  title: z.string().trim().min(1).max(160),
  examAt: z.iso.datetime(),
  subjectId: idSchema.optional(),
  documentId: idSchema.optional(),
  importance: z.number().int().min(1).max(5).default(3)
}).strict();
export const examIdParams = z.object({ id: idSchema }).strict();
export const profileUpdateSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  avatar: z.string().url().max(2_000).nullable().optional()
}).strict().refine((value) => Object.keys(value).length > 0, 'At least one field is required');
export const guidedStartSchema = z.object({ topicId: idSchema }).strict();
export const guidedSessionParams = z.object({ id: idSchema }).strict();
export const guidedAnswerSchema = z.object({ response: z.string().trim().min(1).max(5_000) }).strict();
export const recommendationIdParams = z.object({ id: idSchema }).strict();
