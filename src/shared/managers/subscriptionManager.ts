/**
 * Subscription Manager - управление подписками пользователей
 */

import { prisma } from '../../db/index.js';
import { vacancyService } from '../../api/services/vacancy.service.js';

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
   * Создать подписку
   */
  async create(data: CreateSubscriptionData) {
    const subscription = await prisma.subscription.create({
      data: {
        userId: data.userId,
        filters: data.filters as any,
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
  async getUserSubscriptions(userId: string) {
    const subscriptions = await prisma.subscription.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    return subscriptions;
  }

  /**
   * Получить все активные подписки
   */
  async getActiveSubscriptions() {
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
  async update(subscriptionId: string, data: Partial<CreateSubscriptionData>) {
    const subscription = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        filters: data.filters as any,
        sources: data.sources,
        updatedAt: new Date()
      }
    });

    return subscription;
  }

  /**
   * Активировать/деактивировать подписку
   */
  async toggle(subscriptionId: string, isActive: boolean) {
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
  async delete(subscriptionId: string) {
    await prisma.subscription.delete({
      where: { id: subscriptionId }
    });

    console.log(`🗑️  Удалена подписка ${subscriptionId}`);
  }

  /**
   * Проверить подписки и найти новые вакансии
   */
  async checkForUpdates() {
    const subscriptions = await this.getActiveSubscriptions();

    console.log(`🔔 Проверка ${subscriptions.length} активных подписок...`);

    const updates: Array<{
      subscription: any;
      newVacancies: any[];
    }> = [];

    for (const sub of subscriptions) {
      // Пропускаем если уведомления выключены
      if (!sub.user.settings?.notificationsOn) {
        continue;
      }

      try {
        // Ищем новые вакансии с момента последнего уведомления
        const since = sub.lastNotified || sub.createdAt;

        const filters = sub.filters as any;
        const newVacancies = await vacancyService.findByFilters({
          keywords: filters.keywords,
          locations: filters.locations,
          salaryMin: filters.salaryMin,
          experience: filters.experience,
          schedule: filters.schedule,
          sources: sub.sources,
          publishedAfter: since,
          limit: sub.user.settings.maxNotifications || 10
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

      } catch (error: any) {
        console.error(`  ❌ Ошибка проверки подписки ${sub.id}:`, error.message);
      }
    }

    console.log(`✅ Проверка завершена: ${updates.length} пользователей получат уведомления`);

    return updates;
  }

  /**
   * Получить статистику по подпискам
   */
  async getStats() {
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
