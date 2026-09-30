import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { embedText } from '../ai/geminiService.js';

export type RetrievedSource = {
  chunkId: string;
  documentId: string;
  documentName: string;
  pageNumber: number | null;
  content: string;
  similarity: number;
};

export async function retrieveRelevantChunks(input: {
  userId: string;
  query: string;
  subjectId?: string;
  documentId?: string;
  limit?: number;
}): Promise<RetrievedSource[]> {
  const vector = await embedText(input.userId, input.query, 'query');
  const vectorLiteral = `[${vector.map((value) => Number(value).toString()).join(',')}]`;
  const conditions: Prisma.Sql[] = [
    Prisma.sql`d."ownerId" = ${input.userId}::uuid`,
    Prisma.sql`d."status" = 'READY'::"DocumentStatus"`,
    Prisma.sql`c."embedding" IS NOT NULL`
  ];
  if (input.subjectId) conditions.push(Prisma.sql`d."subjectId" = ${input.subjectId}::uuid`);
  if (input.documentId) conditions.push(Prisma.sql`d."id" = ${input.documentId}::uuid`);
  const take = Math.min(20, Math.max(1, input.limit ?? 8));
  return prisma.$queryRaw<RetrievedSource[]>(Prisma.sql`
    SELECT c."id" AS "chunkId", d."id" AS "documentId", d."fileName" AS "documentName",
           c."pageNumber" AS "pageNumber", c."content" AS "content",
           (1 - (c."embedding" <=> ${vectorLiteral}::vector))::float8 AS "similarity"
      FROM "DocumentChunk" c
      JOIN "Document" d ON d."id" = c."documentId"
     WHERE ${Prisma.join(conditions, ' AND ')}
     ORDER BY c."embedding" <=> ${vectorLiteral}::vector
     LIMIT ${take}
  `);
}
