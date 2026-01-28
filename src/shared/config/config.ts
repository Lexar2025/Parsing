/**
 * Улучшенная конфигурация приложения с поддержкой режимов
 * 
 * Поддерживаемые режимы:
 * - dev: локальная разработка, .env.local, локальная БД/Redis
 * - prod: продакшен, .env, Docker контейнеры
 */

import dotenv from 'dotenv';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// ============================================================================
// 1. Определяем текущий режим
// ============================================================================

const MODE_FILE = join(process.cwd(), '.env.mode');
const DEFAULT_MODE = 'dev' as const;

function getMode(): 'dev' | 'prod' {
  if (existsSync(MODE_FILE)) {
    try {
      const content = readFileSync(MODE_FILE, 'utf-8').trim().toLowerCase();
      if (content === 'prod' || content === 'production') {
        return 'prod';
      }
      if (content === 'dev' || content === 'development') {
        return 'dev';
      }
    } catch (error) {
      console.warn('⚠️  Не удалось прочитать .env.mode, использую режим по умолчанию:', DEFAULT_MODE);
    }
  }
  
  // Если файл не существует, проверяем NODE_ENV
  if (process.env.NODE_ENV === 'production') {
    return 'prod';
  }
  
  return DEFAULT_MODE;
}

export const MODE = getMode();
export const IS_DEV = MODE === 'dev';
export const IS_PROD = MODE === 'prod';

// ============================================================================
// 2. Загружаем соответствующий .env файл
// ============================================================================

const envFile = IS_DEV ? '.env.local' : '.env';
const envPath = join(process.cwd(), envFile);

if (!existsSync(envPath)) {
  console.error(`❌ Файл конфигурации не найден: ${envPath}`);
  console.error(`   Создайте файл ${envFile} на основе .env.example`);
  process.exit(1);
}

const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error(`❌ Ошибка загрузки ${envFile}:`, result.error);
  process.exit(1);
}

console.log(`✅ Загружен режим: ${MODE === 'dev' ? 'DEVELOPMENT' : 'PRODUCTION'}`);
console.log(`   Файл конфигурации: ${envFile}`);

// ============================================================================
// 3. Валидация обязательных переменных
// ============================================================================

function validateRequiredVars(): void {
  const required = ['DATABASE_URL', 'REDIS_HOST', 'REDIS_PORT'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Отсутствуют обязательные переменные окружения:');
    missing.forEach(key => console.error(`   - ${key}`));
    console.error('');
    console.error(`   Проверьте файл ${envFile}`);
    process.exit(1);
  }
}

validateRequiredVars();

// ============================================================================
// 4. Экспортируем конфигурацию
// ============================================================================

export const config = {
  mode: MODE,
  isDev: IS_DEV,
  isProd: IS_PROD,
  
  // Database
  database: {
    url: process.env.DATABASE_URL!,
    maxPoolSize: parseInt(process.env.DATABASE_POOL_SIZE || '10'),
  },
  
  // Redis
  redis: {
    host: process.env.REDIS_HOST || (IS_DEV ? 'localhost' : 'redis'),
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0'),
  },
  
  // API Server
  api: {
    port: parseInt(process.env.PORT || process.env.API_PORT || '3000'),
    host: process.env.HOST || process.env.API_HOST || (IS_DEV ? 'localhost' : '0.0.0.0'),
    url: process.env.API_URL || `http://${process.env.HOST || 'localhost'}:${process.env.PORT || '3000'}`,
  },
  
  // Worker
  worker: {
    concurrency: parseInt(process.env.WORKER_CONCURRENCY || '3'),
    parseInterval: parseInt(process.env.PARSE_INTERVAL || '21600000'), // 6 часов в мс
    notifyInterval: parseInt(process.env.NOTIFY_INTERVAL || '7200000'), // 2 часа в мс
  },
  
  // Parsing
  parser: {
    maxPages: parseInt(process.env.MAX_PAGES || '10'),
    parseDelay: parseInt(process.env.PARSE_DELAY || '1500'),
    rateLimit: {
      'rabota.md': 10, // запросов в минуту
      '999.md': 15,
      'makler.md': 15,
    },
    timeout: 30000, // 30 секунд
    retries: 3,
  },
  
  // Cache
  cache: {
    enabled: process.env.CACHE_ENABLED !== 'false',
    ttl: parseInt(process.env.CACHE_TTL || '43200'), // 12 часов в секундах
    maxResults: parseInt(process.env.CACHE_MAX_RESULTS || '1000'),
  },
  
  // Puppeteer
  puppeteer: {
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
    skipDownload: process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD === 'true',
    headless: process.env.PUPPETEER_HEADLESS !== 'false',
  },
  
  // Telegram (для будущих уведомлений)
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
  },
  
  // Logging
  logging: {
    level: IS_DEV ? 'debug' : (process.env.LOG_LEVEL || 'info'),
    prettyPrint: IS_DEV,
  },
} as const;

// ============================================================================
// 5. Вывод информации о конфигурации
// ============================================================================

if (IS_DEV) {
  console.log('🔧 Режим разработки:');
  console.log(`   БД: ${config.database.url.replace(/\/\/.*@/, '//***@')}`);
  console.log(`   Redis: ${config.redis.host}:${config.redis.port}`);
  console.log(`   API: http://${config.api.host}:${config.api.port}`);
  console.log(`   Логирование: ${config.logging.level}`);
} else {
  console.log('🚀 Режим продакшена:');
  console.log(`   Redis: ${config.redis.host}:${config.redis.port}`);
  console.log(`   API: http://${config.api.host}:${config.api.port}`);
}

console.log('');
