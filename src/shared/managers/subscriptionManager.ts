/**
 * Subscription Manager - управление подписками пользователей
 */

import { prisma } from '../../db/index.js';
import { vacancyService } from '../../api/services/vacancy.service.js';
import { SubscriptionWithUser } from '../../types/prisma.js';
import { Prisma } from '@prisma/client';

export interface SubscriptionFilters {
  keywords?: string[];
  locations?: string[];
  salaryMin?: number;
  experience?: string[];
  schedule?: string[];
}

export interface CreateSubscriptionData {
  userId: string;
  filters: SubscriptionFilters;
  sources: string[];
}

export class SubscriptionManager {
  private static instance: SubscriptionManager;

  private constructor() {}

  static getInstance(): SubscriptionManager {
    if (!SubscriptionManager.instance) {
      SubscriptionManager.instance = new SubscriptionManager();
    }
    return SubscriptionManager.instance;
  }

  /**
   * Безопасное извлечение фильтров из JSON поля Prisma
   */
  private parseSubscriptionFilters(jsonFilters: Prisma.JsonValue): SubscriptionFilters {
    // Type guard для проверки что это объект
    if (!jsonFilters || typeof jsonFilters !== 'object' || Array.isArray(jsonFilters)) {
      return {};
    }

    const filters = jsonFilters as Record<string, unknown>;
    
    return {
      keywords: Array.isArray(filters.keywords) ? filters.keywords as string[] : undefined,
      locations: Array.isArray(filters.locations) ? filters.locations as string[] : undefined,
      salaryMin: typeof filters.salaryMin === 'number' ? filters.salaryMin : undefined,
      experience: Array.isArray(filters.experience) ? filters.experience as string[] : undefined,
      schedule: Array.isArray(filters.schedule) ? filters.schedule as string[] : undefined,
    };
  }

  /**
   * Создать подписку
   */
  async create(data: CreateSubscriptionData): Promise<SubscriptionWithUser> {
    const subscription = await prisma.subscription.create({
      data: {
        userId: data.userId,
        filters: data.filters as Prisma.InputJsonValue,
        sources: data.sources,
        isActive: true
      },
      include: {
        user: {
          select: {
            telegramId: true,
            firstName: true
          }
        }
      }
    });

    console.log(`✅ Создана подписка для пользователя ${data.userId}`);

    return subscription;
  }

  /**
   * Получить подписки пользователя
   */
  async getUserSubscriptions(userId: string): Promise<Array<Prisma.SubscriptionGetPayload<object>>> {
    const subscriptions = await prisma.subscription.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    return subscriptions;
  }

  /**
   * Получить все активные подписки
   */
  async getActiveSubscriptions(): Promise<Array<Prisma.SubscriptionGetPayload<{
    include: {
      user: {
        include: {
          settings: true;
        };
      };
    };
  }>>> {
    const subscriptions = await prisma.subscription.findMany({
      where: { isActive: true },
      include: {
        user: {
          include: {
            settings: true
          }
        }
      }
    });

    return subscriptions;
  }

  /**
   * Обновить подписку
   */
  async update(subscriptionId: string, data: Partial<CreateSubscriptionData>): Promise<Prisma.SubscriptionGetPayload<object>> {
    const subscription = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        filters: data.filters ? data.filters as Prisma.InputJsonValue : undefined,
        sources: data.sources,
        updatedAt: new Date()
      }
    });

    return subscription;
  }

  /**
   * Активировать/деактивировать подписку
   */
  async toggle(subscriptionId: string, isActive: boolean): Promise<Prisma.SubscriptionGetPayload<object>> {
    const subscription = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: { isActive }
    });

    console.log(`${isActive ? '✅ Активирована' : '❌ Деактивирована'} подписка ${subscriptionId}`);

    return subscription;
  }

  /**
   * Удалить подписку
   */
  async delete(subscriptionId: string): Promise<void> {
    await prisma.subscription.delete({
      where: { id: subscriptionId }
    });

    console.log(`🗑️  Удалена подписка ${subscriptionId}`);
  }

  /**
   * Проверить подписки и найти новые вакансии
   */
  async checkForUpdates(): Promise<Array<{
    subscription: Prisma.SubscriptionGetPayload<{
      include: {
        user: {
          include: {
            settings: true;
          };
        };
      };
    }>;
    newVacancies: Array<Prisma.VacancyGetPayload<object>>;
  }>> {
    const subscriptions = await this.getActiveSubscriptions();

    console.log(`🔔 Проверка ${subscriptions.length} активных подписок...`);

    interface SubscriptionUpdate {
      subscription: Prisma.SubscriptionGetPayload<{
        include: {
          user: {
            include: {
              settings: true;
            };
          };
        };
      }>;
      newVacancies: Array<Prisma.VacancyGetPayload<object>>;
    }
    const updates: SubscriptionUpdate[] = [];

    for (const sub of subscriptions) {
      // Пропускаем если уведомления выключены
      if (!sub.user.settings?.notificationsOn) {
        continue;
      }

      try {
        // Ищем новые вакансии с момента последнего уведомления
        const since = sub.lastNotified || sub.createdAt;

        // Безопасно извлекаем фильтры из JSON поля
        const filters = this.parseSubscriptionFilters(sub.filters);
        
        const newVacancies = await vacancyService.findByFilters({
          ...filters,
          sources: sub.sources || ['rabota.md', '999.md', 'makler.md'],
          publishedAfter: since,
          limit: sub.user.settings?.maxNotifications || 10,
          page: 1
        });

        if (newVacancies.length > 0) {
          updates.push({
            subscription: sub,
            newVacancies
          });

          // Обновляем время последнего уведомления
          await prisma.subscription.update({
            where: { id: sub.id },
            data: { lastNotified: new Date() }
          });

          console.log(`  ✅ Найдено ${newVacancies.length} новых вакансий для пользователя ${sub.user.telegramId}`);
        }

      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`  ❌ Ошибка проверки подписки ${sub.id}:`, errorMessage);
      }
    }

    console.log(`✅ Проверка завершена: ${updates.length} пользователей получат уведомления`);

    return updates;
  }

  /**
   * Получить статистику по подпискам
   */
  async getStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    bySource: Array<{
      sources: string[];
      _count: number;
    }>;
  }> {
    const total = await prisma.subscription.count();
    const active = await prisma.subscription.count({
      where: { isActive: true }
    });

    const bySource = await prisma.subscription.groupBy({
      by: ['sources'],
      _count: true
    });

    return {
      total,
      active,
      inactive: total - active,
      bySource
    };
  }
}

export const subscriptionManager = SubscriptionManager.getInstance();
