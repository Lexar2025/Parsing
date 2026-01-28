#!/usr/bin/env tsx
/**
 * Скрипт инициализации проекта
 * Автоматически настраивает режим и проверяет зависимости
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const MODE_FILE = join(process.cwd(), '.env.mode');
const ENV_LOCAL = join(process.cwd(), '.env.local');
const ENV_PROD = join(process.cwd(), '.env');
const ENV_EXAMPLE = join(process.cwd(), '.env.example');

console.log('🚀 Инициализация проекта Vacancy Parser...');
console.log('');

// ============================================================================
// 1. Проверка файла режима
// ============================================================================

if (!existsSync(MODE_FILE)) {
  console.log('📝 Файл .env.mode не найден, создаю...');
  writeFileSync(MODE_FILE, 'dev', 'utf-8');
  console.log('✅ Создан файл .env.mode с режимом: dev');
  console.log('');
}

// ============================================================================
// 2. Проверка .env файлов
// ============================================================================

const currentMode = readFileSync(MODE_FILE, 'utf-8').trim();
const envFile = currentMode === 'dev' ? ENV_LOCAL : ENV_PROD;
const envFileName = currentMode === 'dev' ? '.env.local' : '.env';

console.log(`📊 Текущий режим: ${currentMode}`);
console.log('');

if (!existsSync(envFile)) {
  console.log(`⚠️  Файл ${envFileName} не найден!`);
  console.log('');
  
  if (existsSync(ENV_EXAMPLE)) {
    console.log(`💡 Создаю ${envFileName} из шаблона .env.example...`);
    const exampleContent = readFileSync(ENV_EXAMPLE, 'utf-8');
    writeFileSync(envFile, exampleContent, 'utf-8');
    console.log(`✅ Создан файл ${envFileName}`);
    console.log('');
    console.log(`⚠️  ВАЖНО: Откройте ${envFileName} и настройте переменные окружения!`);
    console.log(`   Особенно: DATABASE_URL, REDIS_HOST, REDIS_PORT`);
    console.log('');
  } else {
    console.log('❌ Файл .env.example не найден!');
    console.log('   Создайте файл .env.example или настройте окружение вручную');
    process.exit(1);
  }
} else {
  console.log(`✅ Найден файл конфигурации: ${envFileName}`);
}

// ============================================================================
// 3. Проверка зависимостей
// ============================================================================

console.log('📦 Проверка зависимостей...');
try {
  execSync('node --version', { stdio: 'ignore' });
  console.log('✅ Node.js установлен');
} catch {
  console.log('❌ Node.js не найден! Установите Node.js >= 22.11');
  process.exit(1);
}

try {
  execSync('npm --version', { stdio: 'ignore' });
  console.log('✅ npm установлен');
} catch {
  console.log('❌ npm не найден!');
  process.exit(1);
}

// ============================================================================
// 4. Проверка node_modules
// ============================================================================

if (!existsSync(join(process.cwd(), 'node_modules'))) {
  console.log('⚠️  Зависимости не установлены');
  console.log('📥 Устанавливаю зависимости...');
  console.log('');
  
  try {
    execSync('npm install', { stdio: 'inherit' });
    console.log('');
    console.log('✅ Зависимости установлены');
  } catch {
    console.log('❌ Ошибка установки зависимостей');
    process.exit(1);
  }
} else {
  console.log('✅ Зависимости установлены');
}

// ============================================================================
// 5. Проверка БД и миграций
// ============================================================================

console.log('');
console.log('💾 Проверка базы данных...');
console.log('   Пропускаю - настройте БД вручную после конфигурации');
console.log('   Команда для миграций: npm run db:migrate');
console.log('');

// ============================================================================
// 6. Итоговая информация
// ============================================================================

console.log('✅ Инициализация завершена!');
console.log('');
console.log('📋 Следующие шаги:');
console.log('');

if (currentMode === 'dev') {
  console.log('1. Настройте .env.local:');
  console.log('   - DATABASE_URL (подключение к PostgreSQL)');
  console.log('   - REDIS_HOST и REDIS_PORT');
  console.log('');
  console.log('2. Запустите локальную БД и Redis:');
  console.log('   docker-compose up -d postgres redis');
  console.log('');
  console.log('3. Примените миграции:');
  console.log('   npm run db:migrate');
  console.log('');
  console.log('4. Запустите приложение:');
  console.log('   npm run dev:api     # API сервер');
  console.log('   npm run dev:worker  # Worker (в другом терминале)');
  console.log('');
  console.log('   API будет доступен на: http://localhost:3001');
} else {
  console.log('1. Настройте .env:');
  console.log('   - POSTGRES_PASSWORD');
  console.log('   - REDIS_PASSWORD');
  console.log('');
  console.log('2. Запустите все сервисы:');
  console.log('   docker-compose up -d');
  console.log('');
  console.log('   API будет доступен на: http://localhost:3000');
}

console.log('');
console.log('📚 Документация:');
console.log('   - Режимы работы: docs/guides/MODES.md');
console.log('   - Docker: docs/guides/DOCKER.md');
console.log('   - API: docs/guides/API.md');
console.log('');
console.log('💡 Советы:');
console.log('   - Переключить режим: npm run mode:dev или npm run mode:prod');
console.log('   - Проверить режим: npm run mode');
console.log('   - Health check: http://localhost:[port]/health');
console.log('');
