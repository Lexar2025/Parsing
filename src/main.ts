/**
 * Главный файл для тестирования парсера
 */

import { RabotaMdParser } from './parsers/rabotaMd.js';
import { ParserConfig } from './types/vacancy.js';
import { log } from './utils/helpers.js';

async function main(): Promise<void> {
  log('=== Запуск тестирования парсера rabota.md ===');

  const parser = new RabotaMdParser();

  // Конфигурация для тестирования
  const config: ParserConfig = {
    baseUrl: 'https://www.rabota.md',
    searchQuery: 'программист', // можно изменить или убрать
    // category: 'it',
    // location: 'chisinau',
    maxPages: 1,
    delay: 1000,
  };

  try {
    // Парсим первую страницу
    const result = await parser.parse(config);

    log(`Результаты парсинга:`);
    log(`Всего найдено: ${result.totalFound}`);
    log(`Получено вакансий: ${result.vacancies.length}`);
    log(`Есть следующая страница: ${result.hasNextPage}`);

    // Выводим первые 5 вакансий
    log('\n=== Первые вакансии ===');
    result.vacancies.slice(0, 5).forEach((vacancy, index) => {
      console.log(`\n--- Вакансия ${index + 1} ---`);
      console.log(`ID: ${vacancy.id}`);
      console.log(`Название: ${vacancy.title}`);
      console.log(`Компания: ${vacancy.company || 'Не указана'}`);
      console.log(`Зарплата: ${vacancy.salary || 'Не указана'}`);
      console.log(`Локация: ${vacancy.location || 'Не указана'}`);
      console.log(`URL: ${vacancy.url}`);
    });

    // Попробуем загрузить детали первой вакансии
    if (result.vacancies.length > 0) {
      log('\n=== Загрузка деталей первой вакансии ===');
      const firstVacancy = result.vacancies[0];
      const details = await parser.parseVacancyDetails(firstVacancy.url);

      console.log('\nДетальная информация:');
      console.log(`Описание: ${details.description?.substring(0, 200)}...`);
    }
  } catch (error) {
    log('Произошла ошибка:', error);
    if (error instanceof Error) {
      console.error(error.stack);
    }
  }

  log('\n=== Тестирование завершено ===');
}

// Запуск
main();
