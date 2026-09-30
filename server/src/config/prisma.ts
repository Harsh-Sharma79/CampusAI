import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { campusAiPrisma?: PrismaClient };

export const prisma = globalForPrisma.campusAiPrisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error']
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.campusAiPrisma = prisma;

export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}
