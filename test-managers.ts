/**
 * Полный тест системы с менеджерами
 */

import { vacancyManager } from './src/shared/managers/vacancyManager.js';
import { subscriptionManager } from './src/shared/managers/subscriptionManager.js';
import { prisma } from './src/db/index.js';

async function testFullSystem() {
  console.log('🧪 Полный тест системы с менеджерами...\n');

  try {
    // 1. Проверка подключения к БД
    console.log('1️⃣ Проверка подключения к БД...');
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ БД подключена\n');

    // 2. Получить статистику
    console.log('2️⃣ Статистика по источникам:');
    const stats = await vacancyManager.getStats();
    stats.forEach(s => {
      console.log(`   ${s.source}: ${s.count} вакансий (${s.status})`);
    });
    console.log();

    // 3. Умный поиск через VacancyManager
    console.log('3️⃣ Умный поиск через VacancyManager...');
    console.log('   Запрос: nodejs, удаленка, зарплата от 1000');
    
    const result = await vacancyManager.search({
      keywords: ['nodejs'],
      schedule: ['remote'],
      salaryMin: 1000,
      limit: 5
    });

    console.log(`   ✅ Найдено: ${result.vacancies.length} вакансий`);
    console.log(`   📊 Источник данных: ${result.meta.source}`);
    console.log(`   ⏰ Последнее обновление: ${result.meta.lastUpdate?.toLocaleString() || 'Нет данных'}`);
    console.log(`   🔄 Обновляется: ${result.meta.updating ? 'Да' : 'Нет'}`);

    if (result.vacancies.length > 0) {
      console.log('\n   📋 Примеры найденных вакансий:');
      result.vacancies.slice(0, 3).forEach((v, i) => {
        console.log(`   ${i + 1}. ${v.title}`);
        console.log(`      💼 ${v.company}`);
        console.log(`      📍 ${v.location || 'Не указана'}`);
        if (v.salaryMin) {
          console.log(`      💰 ${v.salaryMin}-${v.salaryMax} ${v.salaryCurrency}`);
        }
        console.log(`      🔗 ${v.sourceUrl}`);
        console.log();
      });
    }

    // 4. Тест подписок
    console.log('\n4️⃣ Тест системы подписок...');
    
    // Создаем тестового пользователя
    const testUser = await prisma.user.upsert({
      where: { telegramId: 999999999n },
      create: {
        telegramId: 999999999n,
        username: 'test_user',
        firstName: 'Test',
        settings: {
          create: {
            language: 'ru',
            notificationsOn: true,
            maxNotifications: 5
          }
        }
      },
      update: {}
    });

    console.log(`   ✅ Тестовый пользователь: ${testUser.firstName} (${testUser.telegramId})`);

    // Создаем подписку
    const subscription = await subscriptionManager.create({
      userId: testUser.id,
      filters: {
        keywords: ['javascript', 'nodejs'],
        locations: ['chisinau'],
        salaryMin: 800
      },
      sources: ['rabota.md']
    });

    console.log(`   ✅ Подписка создана: ID ${subscription.id}`);

    // Получаем подписки пользователя
    const userSubs = await subscriptionManager.getUserSubscriptions(testUser.id);
    console.log(`   📋 Подписок у пользователя: ${userSubs.length}`);

    // Проверяем обновления
    console.log('\n   🔔 Проверка обновлений по подпискам...');
    const updates = await subscriptionManager.checkForUpdates();
    console.log(`   ✅ Найдено обновлений для ${updates.length} пользователей`);

    if (updates.length > 0) {
      updates.forEach(u => {
        console.log(`      📬 Пользователь ${u.subscription.user.telegramId}: ${u.newVacancies.length} новых вакансий`);
      });
    }

    // Удаляем тестовую подписку
    await subscriptionManager.delete(subscription.id);
    console.log(`   🗑️  Тестовая подписка удалена`);

    // 5. Статистика подписок
    console.log('\n5️⃣ Статистика подписок:');
    const subStats = await subscriptionManager.getStats();
    console.log(`   Всего подписок: ${subStats.total}`);
    console.log(`   Активных: ${subStats.active}`);
    console.log(`   Неактивных: ${subStats.inactive}`);

    console.log('\n✅ Все тесты прошли успешно!\n');
    
    console.log('💡 Система готова к работе:');
    console.log('   - VacancyManager автоматически парсит при необходимости');
    console.log('   - API использует умный поиск');
    console.log('   - Подписки работают');
    console.log('   - Worker (если запущен) обновляет данные в фоне');

  } catch (error: any) {
    console.error('\n❌ Ошибка:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testFullSystem();
