import { prisma } from '../config/prisma.js';

export const documentListSelect = {
  id: true, fileName: true, title: true, mimeType: true, fileSize: true,
  documentType: true, status: true, pageCount: true, errorCode: true,
  errorMessage: true, processingStartedAt: true, processedAt: true,
  createdAt: true, updatedAt: true,
  subject: { select: { id: true, name: true } },
  topic: { select: { id: true, name: true } },
  _count: { select: { chunks: true } }
} as const;

export async function findOwnedDocument(userId: string, id: string) {
  return prisma.document.findFirst({ where: { id, ownerId: userId }, select: documentListSelect });
}

export async function listOwnedDocuments(userId: string, options: { limit: number; cursor?: string; status?: 'UPLOADING' | 'PROCESSING' | 'READY' | 'FAILED' }) {
  const rows = await prisma.document.findMany({
    where: { ownerId: userId, ...(options.status ? { status: options.status } : {}) },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: options.limit + 1,
    ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
    select: documentListSelect
  });
  const hasMore = rows.length > options.limit;
  const items = hasMore ? rows.slice(0, options.limit) : rows;
  return { items, nextCursor: hasMore ? items.at(-1)?.id ?? null : null };
}
