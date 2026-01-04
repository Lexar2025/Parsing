/**
 * Тестовый скрипт для проверки всей системы
 */

import { prisma } from './src/db/index.js';
import { RabotaMdParser } from './src/parsers/rabotaMd.js';
import { vacancyService } from './src/api/services/vacancy.service.js';

async function testSystem() {
  console.log('🧪 Тестирование системы...\n');

  try {
    // 1. Проверка подключения к БД
    console.log('1️⃣ Проверка подключения к БД...');
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ БД подключена\n');

    // 2. Парсинг вакансий
    console.log('2️⃣ Парсинг вакансий с rabota.md...');
    const parser = new RabotaMdParser({
      parseDetails: false, // Без деталей для скорости
      cacheEnabled: true,
    });

    const result = await parser.parse({
      baseUrl: 'https://www.rabota.md',
      searchQuery: 'Программист',
      maxPages: 1, // Только первая страница для теста
    });

    console.log(`✅ Найдено вакансий: ${result.vacancies.length}\n`);

    // 3. Сохранение в БД через адаптер
    console.log('3️⃣ Сохранение в БД...');
    const { created, updated } = await vacancyService.saveVacancies(result.vacancies);
    console.log(`✅ Создано: ${created}, Обновлено: ${updated}\n`);

    // 4. Поиск вакансий
    console.log('4️⃣ Поиск вакансий через сервис...');
    const vacancies = await vacancyService.findByFilters({
      sources: ['rabota.md'],
      limit: 5,
    });
    console.log(`✅ Найдено в БД: ${vacancies.length}`);
    
    if (vacancies.length > 0) {
      console.log('\n📋 Пример вакансии:');
      const v = vacancies[0];
      console.log(`   Заголовок: ${v.title}`);
      console.log(`   Компания: ${v.company}`);
      console.log(`   Локация: ${v.location || 'Не указана'}`);
      console.log(`   Зарплата: ${v.salaryMin || '?'} - ${v.salaryMax || '?'} ${v.salaryCurrency || ''}`);
      console.log(`   Источник: ${v.source}`);
    }

    // 5. Статистика
    console.log('\n5️⃣ Статистика по источникам:');
    const stats = await vacancyService.getStats();
    stats.forEach(s => {
      console.log(`   ${s.source}: ${s.count} вакансий`);
    });

    console.log('\n✅ Все тесты прошли успешно!');
    
  } catch (error: any) {
    console.error('\n❌ Ошибка:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testSystem();
