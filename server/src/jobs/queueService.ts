import { Prisma, type BackgroundJobType } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/errors.js';

export async function enqueueBackgroundJob(input: {
  userId?: string;
  type: BackgroundJobType;
  payload: Record<string, unknown>;
  maxAttempts?: number;
}) {
  return prisma.backgroundJob.create({ data: {
    userId: input.userId ?? null,
    type: input.type,
    payload: input.payload as Prisma.InputJsonValue,
    ...(input.maxAttempts ? { maxAttempts: input.maxAttempts } : {})
  }, select: { id: true, type: true, status: true, createdAt: true } });
}

export async function getOwnedJob(userId: string, id: string) {
  const job = await prisma.backgroundJob.findFirst({
    where: { id, userId },
    select: { id: true, type: true, status: true, payload: true, attempts: true, maxAttempts: true, lastError: true, createdAt: true, updatedAt: true }
  });
  if (!job) throw new ApiError(404, 'JOB_NOT_FOUND', 'Background job not found');
  const payload = typeof job.payload === 'object' && job.payload !== null && !Array.isArray(job.payload) ? job.payload as Record<string, unknown> : {};
  return { ...job, resultId: typeof payload.resultId === 'string' ? payload.resultId : null, payload: undefined };
}
