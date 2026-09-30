import { z } from 'zod';
import { idSchema, paginationSchema } from './common.js';

export const documentIdParams = z.object({ id: idSchema }).strict();
export const documentListQuery = paginationSchema.extend({
  status: z.enum(['UPLOADING', 'PROCESSING', 'READY', 'FAILED']).optional()
}).strict();
export const documentUploadFields = z.object({
  subjectId: idSchema.optional(),
  topicId: idSchema.optional(),
  documentType: z.enum(['SYLLABUS', 'NOTES', 'PREVIOUS_YEAR_PAPER', 'OTHER']).default('OTHER')
}).strict();
