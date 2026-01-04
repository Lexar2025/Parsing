/**
 * Конфигурация приложения
 */

export const config = {
  // Database
  database: {
    url: process.env.DATABASE_URL || '',
  },
  
  // API
  api: {
    port: parseInt(process.env.API_PORT || '3000'),
    host: process.env.API_HOST || '0.0.0.0',
  },
  
  // Redis (для BullMQ)
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  },
  
  // Worker
  worker: {
    concurrency: parseInt(process.env.WORKER_CONCURRENCY || '3'),
    parseInterval: parseInt(process.env.PARSE_INTERVAL || '21600000'), // 6 часов в мс
    notifyInterval: parseInt(process.env.NOTIFY_INTERVAL || '7200000'), // 2 часа в мс
  },
  
  // Parser
  parser: {
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
    enabled: true,
    ttl: 60 * 60 * 12, // 12 часов в секундах
  },
  
  // Telegram (добавим позже когда будет бот)
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
  },
} as const;

// Валидация обязательных переменных
function validateConfig() {
  const required = ['DATABASE_URL'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

validateConfig();
