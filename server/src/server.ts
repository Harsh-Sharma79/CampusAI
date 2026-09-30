import { createServer } from 'node:http';
import { getEnv } from './config/env.js';
import { prisma, disconnectPrisma } from './config/prisma.js';
import { logger } from './utils/logger.js';
import { createApp } from './app.js';
import { runJobWorker } from './jobs/worker.js';

const env = getEnv();
const app = createApp();
const server = createServer(app);
const workerController = new AbortController();
let workerPromise: Promise<void> | undefined;

server.listen(env.PORT, '0.0.0.0', () => {
  logger.info({ port: env.PORT, environment: env.NODE_ENV }, 'CampusAI API listening');
  void prisma.$connect().then(() => {
    logger.info('PostgreSQL connection established');
    workerPromise = runJobWorker(workerController.signal);
  }).catch((error: unknown) => {
    logger.error({ errorName: error instanceof Error ? error.name : 'unknown' }, 'PostgreSQL connection failed');
    process.exitCode = 1;
    server.close(() => void shutdown());
  });
});

async function shutdown(): Promise<void> {
  workerController.abort();
  if (workerPromise) await workerPromise.catch(() => undefined);
  await disconnectPrisma().catch(() => undefined);
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    logger.info({ signal }, 'Shutting down CampusAI API');
    server.close(() => { void shutdown().finally(() => process.exit()); });
    setTimeout(() => process.exit(1), 10_000).unref();
  });
}
