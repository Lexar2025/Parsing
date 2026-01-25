/**
 * Job для проверки подписок и отправки уведомлений
 */

import { Job } from 'bullmq';
import { subscriptionManager } from '../../shared/managers/subscriptionManager.js';

export async function notifyJobProcessor(job: Job): Promise<{
  success: boolean;
  checked: number;
  notifications: number;
}> {
  job.log('🔔 Начинаю проверку подписок...');

  try {
    // Проверяем подписки и получаем updates
    const updates = await subscriptionManager.checkForUpdates();

    job.log(`✅ Найдено обновлений для ${updates.length} пользователей`);

    // Здесь должна быть отправка уведомлений через Telegram бота
    // Пока просто логируем
    for (const update of updates) {
      const { subscription, newVacancies } = update;
      
      job.log(
        `  📬 Пользователь ${subscription.user.telegramId}: ` +
        `${newVacancies.length} новых вакансий`
      );

      // TODO: Отправить через бота
      // await bot.sendMessage(subscription.user.telegramId, formatVacancies(newVacancies));
    }

    return {
      success: true,
      checked: updates.length,
      notifications: updates.reduce((sum, u) => sum + u.newVacancies.length, 0)
    };

  } catch (error: unknown) {
    job.log(`❌ Ошибка проверки подписок: ${(error as Error).message}`);
    throw error;
  }
}
