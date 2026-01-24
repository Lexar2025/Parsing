/**
 * API роут для работы с подписками
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { subscriptionManager } from '../../shared/managers/subscriptionManager.js';
import { prisma } from '../../db/index.js';

interface CreateSubscriptionBody {
  telegramId: number;
  filters: {
    keywords?: string[];
    locations?: string[];
    salaryMin?: number;
    experience?: string[];
    schedule?: string[];
  };
  sources: string[];
}

interface UpdateSubscriptionBody {
  filters?: {
    keywords?: string[];
    locations?: string[];
    salaryMin?: number;
    experience?: string[];
    schedule?: string[];
  };
  sources?: string[];
  isActive?: boolean;
}

export async function subscriptionRoutes(fastify: FastifyInstance): Promise<void> {
  // POST /subscriptions - Создать подписку
  fastify.post<{ Body: CreateSubscriptionBody }>(
    '/subscriptions',
    async (request: FastifyRequest<{ Body: CreateSubscriptionBody }>, reply: FastifyReply) => {
      try {
        const { telegramId, filters, sources } = request.body;

        // Найти или создать пользователя
        let user = await prisma.user.findUnique({
          where: { telegramId: BigInt(telegramId) }
        });

        if (!user) {
          // Создаем пользователя если не существует
          user = await prisma.user.create({
            data: {
              telegramId: BigInt(telegramId),
              settings: {
                create: {
                  language: 'ru',
                  notificationsOn: true,
                  maxNotifications: 10
                }
              }
            }
          });
        }

        // Создаем подписку
        const subscription = await subscriptionManager.create({
          userId: user.id,
          filters,
          sources
        });

        return reply.status(201).send({
          success: true,
          data: subscription,
        });
      } catch (error: unknown) {
        request.log.error(error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return reply.status(500).send({
          success: false,
          error: 'Failed to create subscription',
          message: errorMessage,
        });
      }
    }
  );

  // GET /subscriptions/:telegramId - Получить подписки пользователя
  fastify.get<{ Params: { telegramId: string } }>(
    '/subscriptions/:telegramId',
    async (request: FastifyRequest<{ Params: { telegramId: string } }>, reply: FastifyReply) => {
      try {
        const telegramId = BigInt(request.params.telegramId);

        const user = await prisma.user.findUnique({
          where: { telegramId }
        });

        if (!user) {
          return reply.status(404).send({
            success: false,
            error: 'User not found',
          });
        }

        const subscriptions = await subscriptionManager.getUserSubscriptions(user.id);

        return reply.send({
          success: true,
          data: subscriptions,
        });
      } catch (error: unknown) {
        request.log.error(error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return reply.status(500).send({
          success: false,
          error: 'Failed to fetch subscriptions',
          message: errorMessage,
        });
      }
    }
  );

  // PATCH /subscriptions/:id - Обновить подписку
  fastify.patch<{ Params: { id: string }; Body: UpdateSubscriptionBody }>(
    '/subscriptions/:id',
    async (request: FastifyRequest<{ Params: { id: string }; Body: UpdateSubscriptionBody }>, reply: FastifyReply) => {
      try {
        const { id } = request.params;
        const { filters, sources, isActive } = request.body;

        // Если меняем активность
        if (typeof isActive === 'boolean') {
          const subscription = await subscriptionManager.toggle(id, isActive);
          return reply.send({
            success: true,
            data: subscription,
          });
        }

        // Если обновляем фильтры
        const subscription = await subscriptionManager.update(id, {
          userId: '', // не используется при update
          filters: filters!,
          sources: sources!
        });

        return reply.send({
          success: true,
          data: subscription,
        });
      } catch (error: unknown) {
        request.log.error(error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return reply.status(500).send({
          success: false,
          error: 'Failed to update subscription',
          message: errorMessage,
        });
      }
    }
  );

  // DELETE /subscriptions/:id - Удалить подписку
  fastify.delete<{ Params: { id: string } }>(
    '/subscriptions/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        await subscriptionManager.delete(request.params.id);

        return reply.send({
          success: true,
          message: 'Subscription deleted',
        });
      } catch (error: unknown) {
        request.log.error(error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return reply.status(500).send({
          success: false,
          error: 'Failed to delete subscription',
          message: errorMessage,
        });
      }
    }
  );

  // GET /subscriptions/stats - Статистика подписок
  fastify.get('/subscriptions/stats', async (request, reply) => {
    try {
      const stats = await subscriptionManager.getStats();

      return reply.send({
        success: true,
        data: stats,
      });
    } catch (error: unknown) {
      request.log.error(error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch stats',
        message: errorMessage,
      });
    }
  });
}
