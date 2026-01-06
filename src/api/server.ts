/**
 * Fastify API сервер для работы с вакансиями
 * С поддержкой VacancyManager для умного поиска
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import { config } from '../shared/config/index.js';
import { vacancyRoutes } from './routes/vacancies.js';
import { subscriptionRoutes } from './routes/subscriptions.js';
import { prisma } from '../db/index.js';
import { vacancyManager } from '../shared/managers/vacancyManager.js';

const fastify = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'development' ? 'info' : 'error',
  },
});

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
  } catch (error) {
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
const start = async () => {
  try {
    await fastify.listen({
      port: config.api.port,
      host: config.api.host,
    });

    fastify.log.info(`🚀 API Server running on http://${config.api.host}:${config.api.port}`);
    fastify.log.info(`📊 Health check: http://${config.api.host}:${config.api.port}/health`);
    fastify.log.info(`📋 Vacancies API: http://${config.api.host}:${config.api.port}/api/vacancies`);
    fastify.log.info(`🔔 Subscriptions API: http://${config.api.host}:${config.api.port}/api/subscriptions`);
    
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
