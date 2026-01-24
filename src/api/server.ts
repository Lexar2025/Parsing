/**
 * Fastify API сервер для работы с вакансиями
 * С поддержкой VacancyManager для умного поиска
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import { Queue } from 'bullmq';
import { config } from '../shared/config/index.js';
import { vacancyRoutes } from './routes/vacancies.js';
import { subscriptionRoutes } from './routes/subscriptions.js';
import { dictionaryRoutes } from './routes/dictionaries.js';
import { cacheRoutes } from './routes/cache.js';
import { prisma } from '../db/index.js';
import { vacancyManager } from '../shared/managers/vacancyManager.js';

const fastify = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'development' ? 'info' : 'error',
  },
});

// Подключаем Queue для фоновых задач
// (НЕ Worker, а только Queue для добавления задач)
try {
  const connection = {
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
  };

  const parseQueue = new Queue('parse', { connection });
  
  // Проверяем подключение
  await parseQueue.waitUntilReady();
  
  // Регистрируем Queue в VacancyManager
  vacancyManager.setQueue(parseQueue);
  
  console.log('✅ Redis Queue подключена (фоновое обновление доступно)');
} catch {
  console.log('⚠️  Redis не доступен - фоновое обновление не будет работать');
  console.log('  Запустите Redis и Worker для включения фоновых задач');
}

// CORS
await fastify.register(cors, {
  origin: true, // В продакшене укажи конкретные домены
});

// Health check
fastify.get('/health', async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    
    // Получаем статистику
    const stats = await vacancyManager.getStats();
    
    return { 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      database: 'connected',
      sources: stats
    };
  } catch {
    return { 
      status: 'error', 
      error: 'Database connection failed',
      timestamp: new Date().toISOString()
    };
  }
});

// Routes
await fastify.register(vacancyRoutes, { prefix: '/api' });
await fastify.register(subscriptionRoutes, { prefix: '/api' });
await fastify.register(dictionaryRoutes, { prefix: '/api' });
await fastify.register(cacheRoutes, { prefix: '/api' });

// Graceful shutdown
const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
signals.forEach((signal) => {
  process.on(signal, async () => {
    fastify.log.info(`Received ${signal}, closing server...`);
    await fastify.close();
    await prisma.$disconnect();
    process.exit(0);
  });
});

// Start server
const start = async (): Promise<void> => {
  try {
    await fastify.listen({
      port: config.api.port,
      host: config.api.host,
    });

    fastify.log.info(`🚀 API Server running on http://${config.api.host}:${config.api.port}`);
    fastify.log.info(`📊 Health check: http://${config.api.host}:${config.api.port}/health`);
    fastify.log.info(`📋 Vacancies API: http://${config.api.host}:${config.api.port}/api/vacancies`);
    fastify.log.info(`🔔 Subscriptions API: http://${config.api.host}:${config.api.port}/api/subscriptions`);
    fastify.log.info(`📖 Dictionaries API: http://${config.api.host}:${config.api.port}/api/dictionaries`);
    
    // Показываем статистику при старте
    const stats = await vacancyManager.getStats();
    fastify.log.info('📊 Статистика вакансий:');
    stats.forEach(s => {
      fastify.log.info(`   ${s.source}: ${s.count} вакансий (${s.status})`);
    });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
