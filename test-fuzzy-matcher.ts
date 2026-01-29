/**
 * Примеры использования fuzzy-matcher
 * Этот файл можно запустить для тестирования функций нормализации
 */

import {
  findMatchingSkills,
  findMatchingExperience,
  findMatchingEmployment,
  findMatchingCurrency,
  findMatchingSchedule,
  extractSkillsFromDescription,
  getAvailableSkills,
  getAvailableExperienceLevels,
  getAvailableEmploymentTypes,
  getAvailableCurrencies,
  getAvailableScheduleTypes,
} from './src/utils/fuzzy-matcher.js';

console.log('🎯 Тестирование fuzzy-matcher\n');

// ========================================
// 1. Тестирование навыков (Skills)
// ========================================
console.log('1️⃣ Навыки (Skills)');
console.log('==================\n');

const skillTests = [
  'JS',
  'javascript',
  'реакт',
  'react.js',
  'пайтон',
  'Python',
  'джава',
  'Java Developer',
  'typescript',
  'node',
  'нода',
];

skillTests.forEach(test => {
  const result = findMatchingSkills(test);
  console.log(`"${test}" → ${JSON.stringify(result)}`);
});

console.log('\n📝 Извлечение навыков из описания:\n');

const descriptions = [
  'Нужен разработчик на JavaScript и Python с опытом работы с React',
  'Required: Java, Spring Boot, PostgreSQL, Docker',
  'Căutăm specialist în React, Node.js și MongoDB',
];

descriptions.forEach(desc => {
  const skills = extractSkillsFromDescription(desc);
  console.log(`"${desc}"\n → Навыки: ${JSON.stringify(skills)}\n`);
});

// ========================================
// 2. Тестирование опыта (Experience)
// ========================================
console.log('\n2️⃣ Опыт работы (Experience)');
console.log('===========================\n');

const experienceTests = [
  'без опыта',
  'fără experiență',
  'no experience',
  'Junior',
  'джуниор',
  '1-3 года',
  '3-6 лет',
  'middle',
  'мидл',
  'Senior Developer',
  'более 6 лет',
  'peste 6 ani',
];

experienceTests.forEach(test => {
  const result = findMatchingExperience(test);
  console.log(`"${test}" → ${result}`);
});

// ========================================
// 3. Тестирование занятости (Employment)
// ========================================
console.log('\n3️⃣ Тип занятости (Employment)');
console.log('=============================\n');

const employmentTests = [
  'полная занятость',
  'full time',
  'normă întreagă',
  'частичная',
  'part-time',
  'проектная работа',
  'freelance',
  'стажировка',
  'internship',
];

employmentTests.forEach(test => {
  const result = findMatchingEmployment(test);
  console.log(`"${test}" → ${result}`);
});

// ========================================
// 4. Тестирование валют (Currency)
// ========================================
console.log('\n4️⃣ Валюты (Currency)');
console.log('===================\n');

const currencyTests = [
  'MDL',
  'lei',
  'леев',
  'USD',
  '$',
  'доллар',
  'EUR',
  '€',
  'евро',
  'RUB',
  '₽',
  'рубль',
];

currencyTests.forEach(test => {
  const result = findMatchingCurrency(test);
  console.log(`"${test}" → ${result}`);
});

// ========================================
// 5. Тестирование графика (Schedule)
// ========================================
console.log('\n5️⃣ График работы (Schedule)');
console.log('==========================\n');

const scheduleTests = [
  'удаленная работа',
  'remote',
  'la distanță',
  'офис',
  'office',
  'birou',
  'гибридный график',
  'hybrid',
  'mixt',
  'гибкий',
  'flexible',
];

scheduleTests.forEach(test => {
  const result = findMatchingSchedule(test);
  console.log(`"${test}" → ${result}`);
});

// ========================================
// 6. Статистика доступных значений
// ========================================
console.log('\n6️⃣ Статистика');
console.log('=============\n');

console.log(`Всего навыков в базе: ${getAvailableSkills().length}`);
console.log(`Уровни опыта: ${getAvailableExperienceLevels().join(', ')}`);
console.log(`Типы занятости: ${getAvailableEmploymentTypes().join(', ')}`);
console.log(`Валюты: ${getAvailableCurrencies().join(', ')}`);
console.log(`Графики работы: ${getAvailableScheduleTypes().join(', ')}`);

console.log('\n✅ Тестирование завершено!\n');

// ========================================
// 7. Примеры комплексного использования
// ========================================
console.log('7️⃣ Комплексный пример (как в адаптере)');
console.log('=======================================\n');

const vacancyExample = {
  title: 'Senior JavaScript Developer',
  description: 'Мы ищем опытного разработчика на JavaScript, React и Node.js',
  experience: 'более 6 лет',
  schedule: 'full time',
  workPlace: 'гибридный график',
  salary: '2000-3000 USD',
};

console.log('📄 Пример вакансии:');
console.log(JSON.stringify(vacancyExample, null, 2));
console.log('\n📊 Результаты нормализации:\n');

const normalizedVacancy = {
  title: vacancyExample.title,
  skills: extractSkillsFromDescription(vacancyExample.description),
  experience: findMatchingExperience(vacancyExample.experience),
  employment: findMatchingEmployment(vacancyExample.schedule),
  schedule: findMatchingSchedule(vacancyExample.workPlace),
  currency: findMatchingCurrency(vacancyExample.salary),
};

console.log(JSON.stringify(normalizedVacancy, null, 2));

console.log('\n🎉 Все готово для использования в адаптерах!\n');
