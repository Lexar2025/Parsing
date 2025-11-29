/**
 * Универсальный файл для запуска парсеров
 * Поддерживает выбор парсера через аргументы командной строки
 */

import { RabotaMdParser } from './parsers/rabotaMd.js';
import { NineNineNineMdParser } from './parsers/nineNineNineMd.js';
import { ParserConfig, Parser } from './types/vacancy.js';
import { getParserConfig, getAvailableParsers } from './config/parsers.js';
import * as fs from 'fs';

/**
 * Получить экземпляр парсера по имени сайта
 */
function getParser(site: string): Parser {
  switch (site) {
    case 'rabota.md':
      return new RabotaMdParser();
    case '999.md':
      return new NineNineNineMdParser();
    default:
      throw new Error(`Unknown parser: ${site}`);
  }
}

/**
 * Сохранить результаты в файл
 */
function saveResults(site: string, vacancies: any[]): string {
  const filename = `vacancies_${site.replace('.', '_')}.json`;
  const resultsJson = JSON.stringify(vacancies, null, 2);
  fs.writeFileSync(filename, resultsJson, 'utf-8');
  return filename;
}

/**
 * Вывести статистику
 */
function printStatistics(vacancies: any[]): void {
  console.log('\n' + '='.repeat(60));
  console.log('📊 СТАТИСТИКА');
  console.log('='.repeat(60));

  // Статистика по источникам
  const sourceStats = new Map<string, number>();
  vacancies.forEach((v) => {
    const source = v.source || 'unknown';
    sourceStats.set(source, (sourceStats.get(source) || 0) + 1);
  });

  console.log('\n📍 По источникам:');
  Array.from(sourceStats.entries()).forEach(([source, count]) => {
    console.log(`   ${source}: ${count}`);
  });

  // Статистика по локациям (если есть)
  const locationStats = new Map<string, number>();
  vacancies.forEach((v) => {
    if (v.location) {
      const loc = v.location;
      locationStats.set(loc, (locationStats.get(loc) || 0) + 1);
    }
  });

  if (locationStats.size > 0) {
    console.log('\n📍 По локациям:');
    Array.from(locationStats.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([location, count]) => {
        console.log(`   ${location}: ${count}`);
      });
  }

  // Статистика по зарплатам
  const withSalary = vacancies.filter((v) => v.salary).length;
  if (withSalary > 0) {
    console.log(`\n💰 С указанной зарплатой: ${withSalary} из ${vacancies.length}`);
  }

  // Статистика по графику работы
  const scheduleStats = new Map<string, number>();
  vacancies.forEach((v) => {
    if (v.schedule) {
      scheduleStats.set(v.schedule, (scheduleStats.get(v.schedule) || 0) + 1);
    }
  });

  if (scheduleStats.size > 0) {
    console.log('\n📅 По графику работы:');
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
      const config = getParserConfig(site as any);
      console.log(`  - ${site} (по умолчанию: ${config.defaultCategory || 'все'})`);
    });
    console.log('\nПримеры:');
    console.log('  npm run parse rabota.md программист');
    console.log('  npm run parse 999.md Загрузчик');
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
    const siteConfig = getParserConfig(site as any);

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

    // Парсим вакансии
    const result = await parser.parse(config);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    // Итоговая статистика
    console.log('\n' + '='.repeat(60));
    console.log('📊 РЕЗУЛЬТАТЫ ПАРСИНГА');
    console.log('='.repeat(60));
    console.log(`⏱️  Время выполнения: ${duration} сек`);
    console.log(`📋 Всего найдено вакансий: ${result.totalFound}`);
    console.log(`📄 Страниц обработано: ${config.maxPages}`);

    // Дополнительная статистика
    printStatistics(result.vacancies);

    // Сохраняем результаты
    const filename = saveResults(site, result.vacancies);
    console.log(`\n✅ Результаты сохранены в файл: ${filename}`);

    // Выводим примеры вакансий
    console.log('\n' + '='.repeat(60));
    console.log('📋 ПРИМЕРЫ ВАКАНСИЙ (первые 5):');
    console.log('='.repeat(60) + '\n');

    result.vacancies.slice(0, 5).forEach((vacancy, index) => {
      console.log(`${index + 1}. ${vacancy.title}`);
      if (vacancy.company) console.log(`   🏢 ${vacancy.company}`);
      if (vacancy.location) console.log(`   📍 ${vacancy.location}`);
      if (vacancy.salary) console.log(`   💰 ${vacancy.salary}`);
      if (vacancy.schedule) console.log(`   📅 ${vacancy.schedule}`);
      if (vacancy.experience) console.log(`   💼 ${vacancy.experience}`);
      console.log(`   🔗 ${vacancy.url}`);
      console.log('');
    });

    console.log('='.repeat(60));
    console.log('✅ Парсинг завершен успешно!');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('\n❌ Произошла ошибка:');
    if (error instanceof Error) {
      console.error(error.message);
      console.error(error.stack);
    } else {
      console.error(error);
    }
    process.exit(1);
  }
}

// Запуск
main();
