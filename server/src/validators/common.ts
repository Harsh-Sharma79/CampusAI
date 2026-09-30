import { z } from 'zod';

export const idSchema = z.uuid();
export const paginationSchema = z.object({
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25)
});
export const paginationArgs = (input: { cursor?: string; limit: number }) => ({
  take: input.limit + 1,
  ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {})
});
export const emailSchema = z.email().max(254).transform((value) => value.trim().toLowerCase());
export const nonEmptyText = z.string().trim().min(1).max(10_000);
