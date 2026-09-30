import { z } from 'zod';

const examDateSchema = z.object({
  title: z.string().trim().min(1).max(120),
  examAt: z.iso.datetime(),
  subjectName: z.string().trim().min(1).max(100).optional(),
  importance: z.number().int().min(1).max(5).optional()
}).strict();

export const onboardingSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  university: z.string().trim().min(1).max(160).optional(),
  course: z.string().trim().min(1).max(160).optional(),
  semester: z.string().trim().min(1).max(80).optional(),
  subjects: z.array(z.string().trim().min(1).max(100)).max(40).optional(),
  preferredStudyMinutes: z.number().int().min(10).max(720).optional(),
  examDates: z.array(examDateSchema).max(30).optional()
}).strict().superRefine((value, ctx) => {
  if (value.subjects?.length && (!value.university || !value.course)) {
    ctx.addIssue({ code: 'custom', path: ['subjects'], message: 'University and course are required when adding subjects' });
  }
  if (value.semester && (!value.university || !value.course)) {
    ctx.addIssue({ code: 'custom', path: ['semester'], message: 'University and course are required when setting a semester' });
  }
});
