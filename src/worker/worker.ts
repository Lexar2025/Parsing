/**
 * BullMQ Worker для фоновых задач
 */

import { Worker, Queue } from 'bullmq';
import { config } from '../shared/config/index.js';
import { parseJobProcessor } from './jobs/parseJob.js';
import { prisma } from '../db/index.js';

// Настройки Redis подключения
const connection = {
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
};

// Создаем очередь для парсинга
export const parseQueue = new Queue('parse', { connection });

// Создаем worker для обработки задач
const parseWorker = new Worker('parse', parseJobProcessor, {
  connection,
  concurrency: config.worker.concurrency,
  limiter: {
    max: 10, // максимум 10 задач
    duration: 60000, // в минуту
  },
});

// Обработчики событий
parseWorker.on('completed', (job) => {
  console.log(`✅ Job ${job.id} completed:`, job.returnvalue);
});

parseWorker.on('failed', (job, err) => {
  console.error(`❌ Job ${job?.id} failed:`, err.message);
});

parseWorker.on('error', (err) => {
  console.error('Worker error:', err);
});

// Добавляем периодическую задачу парсинга (каждые 6 часов)
await parseQueue.add(
  'periodic-rabota',
  {
    source: 'rabota.md',
    searchQuery: 'it',
    maxPages: 3,
  },
  {
    repeat: {
      every: config.worker.parseInterval, // 6 часов
    },
    jobId: 'periodic-rabota-parse',
  }
);

// Добавляем задачу парсинга сразу при старте
await parseQueue.add('initial-rabota', {
  source: 'rabota.md',
  searchQuery: 'it',
  maxPages: 3,
});

console.log('🔧 Worker started');
console.log(`📊 Concurrency: ${config.worker.concurrency}`);
console.log(`⏰ Parse interval: ${config.worker.parseInterval / 1000 / 60} minutes`);

// Graceful shutdown
const shutdown = async () => {
  console.log('Shutting down worker...');
  await parseWorker.close();
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
