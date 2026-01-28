#!/usr/bin/env tsx
/**
 * Утилита переключения режимов (dev/prod)
 * 
 * Использование:
 *   tsx scripts/switch-mode.ts dev    - переключиться в режим разработки
 *   tsx scripts/switch-mode.ts prod   - переключиться в продакшен режим
 *   tsx scripts/switch-mode.ts        - показать текущий режим
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const MODE_FILE = join(process.cwd(), '.env.mode');
const VALID_MODES = ['dev', 'prod'] as const;
type Mode = typeof VALID_MODES[number];

function getCurrentMode(): Mode | null {
  if (!existsSync(MODE_FILE)) {
    return null;
  }
  
  try {
    const content = readFileSync(MODE_FILE, 'utf-8').trim().toLowerCase();
    return VALID_MODES.includes(content as Mode) ? (content as Mode) : null;
  } catch (error) {
    console.error('❌ Ошибка чтения файла режима:', error);
    return null;
  }
}

function setCurrentMode(mode: Mode): boolean {
  try {
    writeFileSync(MODE_FILE, mode, 'utf-8');
    console.log(`✅ Режим успешно переключен на: ${mode === 'dev' ? 'development' : 'production'}`);
    console.log(`   Файл .env.mode обновлен`);
    console.log('');
    
    // Показываем информацию о режиме
    if (mode === 'dev') {
      console.log('💡 В режиме разработки:');
      console.log('   - Используется .env.local');
      console.log('   - Подключение к локальной БД и Redis');
      console.log('   - Расширенное логирование');
      console.log('   - Hot reload доступен');
      console.log('');
      console.log('   Команды для запуска:');
      console.log('   npm run dev:api     - API сервер');
      console.log('   npm run dev:worker  - Worker');
    } else {
      console.log('💡 В продакшен режиме:');
      console.log('   - Используется .env');
      console.log('   - Подключение к контейнерам (Docker)');
      console.log('   - Минимальное логирование');
      console.log('   - Оптимизированная производительность');
      console.log('');
      console.log('   Команды для запуска:');
      console.log('   docker-compose up -d  - запуск всех сервисов');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Ошибка записи файла режима:', error);
    return false;
  }
}

function showCurrentMode(): void {
  const mode = getCurrentMode();
  
  console.log('📊 Текущий режим приложения:');
  console.log('');
  
  if (mode) {
    const modeName = mode === 'dev' ? 'DEVELOPMENT' : 'PRODUCTION';
    const modeEmoji = mode === 'dev' ? '🔧' : '🚀';
    
    console.log(`${modeEmoji} Режим: ${modeName}`);
    console.log(`   Файл конфигурации: ${mode === 'dev' ? '.env.local' : '.env'}`);
    console.log('');
    
    // Показываем содержимое соответствующего .env файла
    const envFile = mode === 'dev' ? '.env.local' : '.env';
    const envPath = join(process.cwd(), envFile);
    
    if (existsSync(envPath)) {
      console.log(`📄 Содержимое ${envFile}:`);
      console.log('');
      
      const envContent = readFileSync(envPath, 'utf-8');
      const lines = envContent.split('\n');
      
      // Показываем только важные переменные
      const importantKeys = [
        'NODE_ENV',
        'DATABASE_URL',
        'REDIS_HOST',
        'PORT',
        'API_URL'
      ];
      
      lines.forEach(line => {
        if (!line.trim() || line.startsWith('#')) return;
        
        const key = line.split('=')[0].trim();
        if (importantKeys.includes(key)) {
          // Скрываем пароли
          let value = line.split('=')[1] || '';
          if (key.includes('PASSWORD') || key.includes('TOKEN')) {
            value = '***hidden***';
          }
          console.log(`   ${key}=${value}`);
        }
      });
    }
  } else {
    console.log('⚠️  Файл .env.mode не найден или содержит неверное значение');
    console.log('   Создайте файл .env.mode с содержимым "dev" или "prod"');
  }
  
  console.log('');
  console.log('🔧 Доступные команды:');
  console.log('   tsx scripts/switch-mode.ts dev   - переключиться в режим разработки');
  console.log('   tsx scripts/switch-mode.ts prod  - переключиться в продакшен режим');
}

function validateMode(mode: string): mode is Mode {
  return VALID_MODES.includes(mode as Mode);
}

// Основная логика
const args = process.argv.slice(2);
const command = args[0];

if (!command) {
  // Показать текущий режим
  showCurrentMode();
  process.exit(0);
}

if (!validateMode(command)) {
  console.error('❌ Неверный режим. Доступные режимы: dev, prod');
  console.log('');
  console.log('Использование:');
  console.log('  tsx scripts/switch-mode.ts dev   - режим разработки');
  console.log('  tsx scripts/switch-mode.ts prod  - продакшен режим');
  console.log('  tsx scripts/switch-mode.ts       - показать текущий режим');
  process.exit(1);
}

// Переключить режим
setCurrentMode(command);
process.exit(0);
