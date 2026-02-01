/**
 * Универсальный файл для запуска парсеров
 * Поддерживает выбор парсера через аргументы командной строки
 */

import { RabotaMdParser } from './parsers/rabotaMd.js';
import { NineNineNineMdParser } from './parsers/nineNineNineMd.js';
import { MaklerMdParser } from './parsers/maklerMd.js';
import { ParserConfig, Parser, Vacancy } from './types/vacancy.js';
import { getParserConfig, getAvailableParsers } from './settings/parsers.js';
import { VacancyManager, daysAgo } from './utils/vacancyManager.js';

/**
 * Получить экземпляр парсера по имени сайта
 */
function getParser(site: string): Parser {
  switch (site) {
    case 'rabota.md':
      return new RabotaMdParser();
    case '999.md':
      return new NineNineNineMdParser();
    case 'makler.md':
      return new MaklerMdParser({
        headless: true,      // false = видно браузер для отладки
        parseDetails: true,  // Не парсить детали (они не нужны)
      });
    default:
      throw new Error(`Unknown parser: ${site}`);
  }
}

/**
 * Сохранить результаты в файл с учетом актуальности
 */
async function saveResults(
  site: string,
  newVacancies: Vacancy[],
  manager: VacancyManager,
): Promise<string> {
  const filename = `vacancies_${site.replace('.', '_')}.json`;

  // Загружаем существующие вакансии
  const existing = await manager.loadExisting(filename);

  // Объединяем с новыми
  const merged = manager.mergeVacancies(existing, newVacancies);

  // Сохраняем
  await manager.save(filename, merged);

  return filename;
}

/**
 * Вывести статистику с учетом актуальности
 */
function printStatistics(vacancies: Vacancy[], manager: VacancyManager): void {
  console.log('\n' + '='.repeat(60));
  console.log('📊 СТАТИСТИКА');
  console.log('='.repeat(60));

  // Общая статистика актуальности
  const stats = manager.getStats(vacancies);
  console.log('\n📈 Общая статистика:');
  console.log(`   Всего в базе: ${stats.total}`);
  console.log(`   ✅ Активных: ${stats.active}`);
  console.log(`   ❌ Неактивных: ${stats.inactive}`);
  console.log(`   🆕 Новых (за 24ч): ${stats.new}`);
  if (stats.oldInactive > 0) {
    console.log(
      `   🗑️  Будет удалено старых: ${stats.oldInactive} (неактивны > ${manager['options'].inactiveThresholdDays} дней)`,
    );
  }

  // Статистика по источникам
  console.log('\n📍 По источникам:');
  Object.entries(stats.bySource).forEach(([source, count]) => {
    console.log(`   ${source}: ${count}`);
  });

  // Только для активных вакансий
  const activeVacancies = vacancies.filter((v) => v.isActive);

  // Статистика по локациям (если есть)
  const locationStats = new Map<string, number>();
  activeVacancies.forEach((v) => {
    if (v.location) {
      const loc = v.location;
      locationStats.set(loc, (locationStats.get(loc) || 0) + 1);
    }
  });

  if (locationStats.size > 0) {
    console.log('\n📍 По локациям (активные):');
    Array.from(locationStats.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([location, count]) => {
        console.log(`   ${location}: ${count}`);
      });
  }

  // Статистика по зарплатам
  const withSalary = activeVacancies.filter((v) => v.salary).length;
  if (withSalary > 0) {
    console.log(`\n💰 С указанной зарплатой: ${withSalary} из ${activeVacancies.length}`);
  }

  // Статистика по графику работы
  const scheduleStats = new Map<string, number>();
  activeVacancies.forEach((v) => {
    if (v.schedule) {
      scheduleStats.set(v.schedule, (scheduleStats.get(v.schedule) || 0) + 1);
    }
  });

  if (scheduleStats.size > 0) {
    console.log('\n📅 По графику работы (активные):');
    Array.from(scheduleStats.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([schedule, count]) => {
        console.log(`   ${schedule}: ${count}`);
      });
  }
}

async function main(): Promise<void> {
  // Получаем аргументы командной строки
  const args = process.argv.slice(2);
  const siteArg = args[0];

  // Если сайт не указан или указан help, показываем справку
  if (!siteArg || siteArg === '--help' || siteArg === '-h') {
    console.log('🔍 Универсальный парсер вакансий\n');
    console.log('Использование:');
    console.log('  npm run parse <site> [category]\n');
    console.log('Доступные сайты:');
    getAvailableParsers().forEach((site) => {
      const config = getParserConfig(site as '999.md' | 'rabota.md' | 'makler.md');
      console.log(`  - ${site} (по умолчанию: ${config.defaultCategory || 'все'})`);
    });
    console.log('\nПримеры:');
    console.log('  npm run parse rabota.md программист');
    console.log('  npm run parse 999.md Грузчик');
    process.exit(0);
  }

  // Проверяем, что сайт поддерживается
  const availableParsers = getAvailableParsers();
  if (!availableParsers.includes(siteArg)) {
    console.error(`❌ Неизвестный сайт: ${siteArg}`);
    console.log(`\nДоступные сайты: ${availableParsers.join(', ')}`);
    process.exit(1);
  }

  const site = siteArg;
  const category = args[1];

  console.log(`🚀 Запуск парсера для ${site}\n`);
  console.log('='.repeat(60));

  try {
    // Получаем конфигурацию для сайта
    const siteConfig = getParserConfig(site as '999.md' | 'rabota.md' | 'makler.md');

    // Создаем экземпляр парсера
    const parser = getParser(site);

    // Формируем конфигурацию для парсинга
    const config: ParserConfig = {
      baseUrl: siteConfig.baseUrl,
      searchQuery: category || siteConfig.defaultCategory,
      maxPages: siteConfig.maxPages,
      delay: siteConfig.delay,
    };

    console.log(`📋 Категория: ${config.searchQuery || 'все'}`);
    console.log(`📄 Макс. страниц: ${config.maxPages}`);
    console.log(`⏱️  Задержка: ${config.delay}мс`);
    console.log('='.repeat(60) + '\n');

    const startTime = Date.now();

    // Создаем менеджер вакансий
    const manager = new VacancyManager({
      inactiveThresholdDays: 7, // Удалять неактивные старше 7 дней
      autoCleanup: true, // Автоматически удалять при сохранении
    });

    // Парсим вакансии
    const result = await parser.parse(config);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    // Итоговая статистика
    console.log('\n' + '='.repeat(60));
    console.log('📊 РЕЗУЛЬТАТЫ ПАРСИНГА');
    console.log('='.repeat(60));
    console.log(`⏱️  Время выполнения: ${duration} сек`);
    console.log(`📋 Всего найдено вакансий: ${result.totalFound}`);
    console.log(`🆕 Новых в этом парсинге: ${result.totalFound}`);
    console.log(`📄 Страниц обработано: ${config.maxPages}`);

    // Сохраняем результаты с учетом актуальности
    const filename = await saveResults(site, result.vacancies, manager);

    // Загружаем финальный результат для статистики
    const finalVacancies = await manager.loadExisting(filename);

    // Дополнительная статистика
    printStatistics(finalVacancies, manager);

    console.log(`\n✅ Результаты сохранены в файл: ${filename}`);

    // Выводим примеры АКТИВНЫХ вакансий
    const activeVacancies = finalVacancies.filter((v) => v.isActive);
    console.log('\n' + '='.repeat(60));
    console.log('📋 ПРИМЕРЫ АКТИВНЫХ ВАКАНСИЙ (первые 5):');
    console.log('='.repeat(60) + '\n');

    activeVacancies.slice(0, 5).forEach((vacancy, index) => {
      console.log(`${index + 1}. ${vacancy.title}`);
      if (vacancy.company) console.log(`   🏢 ${vacancy.company}`);
      if (vacancy.location) console.log(`   📍 ${vacancy.location}`);
      if (vacancy.salary) console.log(`   💰 ${vacancy.salary}`);
      if (vacancy.schedule) console.log(`   📅 ${vacancy.schedule}`);
      if (vacancy.experience) console.log(`   💼 ${vacancy.experience}`);
      
      // Показываем когда была найдена
      const daysOld = daysAgo(vacancy.firstSeenAt);
      if (daysOld === 0) {
        console.log(`   🆕 Новая вакансия`);
      } else if (daysOld < 7) {
        console.log(`   📅 ${daysOld} дн. назад`);
      }
      
      console.log(`   🔗 ${vacancy.url}`);
      console.log('');
    });

    console.log('='.repeat(60));
    console.log('✅ Парсинг завершен успешно!');
    console.log('='.repeat(60));
  } catch (error: unknown) {
    console.error('\n❌ Произошла ошибка:');
    if (error instanceof Error) {
      console.error(error.message);
      console.error(error.stack);
    } else {
      console.error(String(error));
    }
    process.exit(1);
  }
}

// Запуск
main();
