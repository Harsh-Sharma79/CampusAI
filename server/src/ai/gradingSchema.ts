import { z } from 'zod';

export const answerGradeSchema = z.object({
  awardedPoints: z.number().min(0).max(1),
  feedback: z.string().trim().min(1).max(2_000)
}).strict();

export const batchAnswerGradeSchema = z.object({
  grades: z.array(z.object({
    questionId: z.uuid(),
    awardedPoints: z.number().min(0).max(1),
    feedback: z.string().trim().min(1).max(2_000)
  }).strict()).min(1).max(10)
}).strict();
