# ⚙️ Worker Documentation

## 📖 Содержание

- [Обзор](#обзор)
- [Как работает Worker](#как-работает-worker)
- [Задачи (Jobs)](#задачи-jobs)
- [Система подписок](#система-подписок)
- [Словари профессий](#словари-профессий)
- [Запуск Worker](#запуск-worker)
- [Мониторинг](#мониторинг)
- [Настройка](#настройка)

---

## 🎯 Обзор

**Worker** - это фоновый процесс на **BullMQ**, который выполняет задачи в фоне независимо от API сервера.

**Зачем нужен Worker:**
- ✅ Автоматический парсинг вакансий по расписанию (каждые 6 часов)
- ✅ Проверка подписок и отправка уведомлений (каждые 2 часа)
- ✅ Очистка старых данных и кэшей
- ✅ Семантический поиск через словари профессий
- ✅ Выполнение долгих операций без блокировки API

**Технологии:**
- **BullMQ** - библиотека для работы с очередями
- **Redis** - хранилище очередей и состояний
- **Node.js** - выполнение JavaScript кода
- **Prisma** - работа с базой данных

---

## 🔄 Как работает Worker

### Архитектура

```
┌────────────────────────────────────────────────────────┐
│                         Redis                           │
│  (хранит очередь задач, кэши, состояния)               │
│                                                         │
│  Queues:                                               │
│  ├─ "parse"     - задачи парсинга                     │
│  ├─ "notify"    - задачи уведомлений                  │
│  └─ "semantic"  - задачи семантического поиска        │
└────────────────┬───────────────────────────────────────┘
                 │
                 │ Workers забирают задачи
                 ▼
┌────────────────────────────────────────────────────────┐
│                       Worker Cluster                    │
│                                                         │
│  parseWorker:    Парсинг вакансий                      │
│  notifyWorker:   Проверка подписок и уведомления       │
│  semanticWorker: Обновление словарей профессий         │
│                                                         │
│  Concurrency: 3 задачи одновременно на каждый Worker  │
│  Auto-recovery: автоматический перезапуск при падении │
└────────────────┬───────────────────────────────────────┘
                 │
                 │ Сохраняет результаты
                 ▼
┌────────────────────────────────────────────────────────┐
│                      PostgreSQL                        │
│  (сохраняет вакансии, подписки, логи, словари)        │
└────────────────────────────────────────────────────────┘
```

### Процесс выполнения задачи

```
1. Задача добавляется в очередь
   parseQueue.add('parse-rabota', { source: 'rabota.md' }, {
     repeat: { every: config.worker.parseInterval },
     jobId: 'periodic-rabota-parse'
   })

2. Worker забирает задачу
   const job = await parseQueue.getNextJob()

3. Выполняет processor с обработкой ошибок
   try {
     await parseJobProcessor(job)
   } catch (error) {
     job.log(`Error: ${error.message}`)
     await logErrorToDB(job, error)
     throw error // для retry
   }

4. Processor парсит данные через VacancyManager
   const result = await vacancyManager.parseSource(source, {
     searchQuery,
     maxPages
   })

5. Сохраняет в БД и обновляет кэш
   await result.save()
   await cacheService.invalidateCacheForSource(source)

6. Задача помечается как completed
   job.moveToCompleted()
   job.log(`Completed: ${result.created} new, ${result.updated} updated`)
```

---

## 📋 Задачи (Jobs)

### 1. Parse Job - Парсинг вакансий

**Файл:** `src/worker/jobs/parseJob.ts`

**Что делает:**
- ✅ Парсит вакансии с указанного источника через VacancyManager
- ✅ Использует встроенные адаптеры для унификации данных
- ✅ Сохраняет в БД с upsert (создает новые, обновляет существующие)
- ✅ Логирует результат в ParseLog
- ✅ Автоматически инвалидирует кэш для этого источника

**Данные задачи:**
```typescript
interface ParseJobData {
  source: 'rabota.md' | '999.md' | 'makler.md';
  searchQuery?: string;           // Поисковый запрос, например "it"
  maxPages?: number;              // Максимальное количество страниц
  priority?: 'high' | 'normal';   // Приоритет задачи
}
```

**Пример добавления задачи:**
```typescript
// Единоразовая задача
await parseQueue.add('parse-now-rabota', {
  source: 'rabota.md',
  searchQuery: 'nodejs',
  maxPages: 3,
  priority: 'high'
}, {
  attempts: 3, // Количество попыток при ошибке
  backoff: { type: 'exponential', delay: 2000 }
});

// Периодическая задача (каждые 6 часов)
await parseQueue.add('periodic-999', {
  source: '999.md',
  searchQuery: 'developer',
  maxPages: 5
}, {
  repeat: { every: config.worker.parseInterval },
  jobId: 'periodic-999-parse' // Уникальный ID для избежания дубликатов
});
```

**Процесс выполнения:**
```typescript
export async function parseJobProcessor(job: Job<ParseJobData>) {
  const { source, searchQuery, maxPages = 5 } = job.data;
  
  job.log(`🔍 Starting parse for ${source} with query: ${searchQuery || 'all'}`);
  
  try {
    // 1. Используем VacancyManager для умного парсинга
    const result = await vacancyManager.parseSource(source, {
      searchQuery,
      maxPages,
      force: job.opts.priority === 'high'
    });
    
    job.log(`✅ Found ${result.total} vacancies: ${result.created} new, ${result.updated} updated`);
    
    // 2. Залогировать в ParseLog
    await prisma.parseLog.create({
      data: {
        source,
        status: 'success',
        vacanciesFound: result.total,
        vacanciesNew: result.created,
        vacanciesUpdated: result.updated,
        duration: Date.now() - job.processedOn,
        searchQuery,
        error: null
      }
    });
    
    // 3. Инвалидировать кэш для этого источника
    await cacheService.invalidateCacheForSource(source);
    
    return {
      success: true,
      created: result.created,
      updated: result.updated,
      total: result.total,
      source
    };
    
  } catch (error) {
    job.log(`❌ Parse failed: ${error.message}`);
    
    // Логируем ошибку в БД
    await prisma.parseLog.create({
      data: {
        source,
        status: 'error',
        vacanciesFound: 0,
        vacanciesNew: 0,
        duration: Date.now() - job.processedOn,
        searchQuery,
        error: error.message?.substring(0, 500) || 'Unknown error'
      }
    });
    
    throw error; // BullMQ будет делать retry
  }
}
```

### 2. Notify Job - Уведомления о подписках

**Файл:** `src/worker/jobs/notifyJob.ts` ✅ **Полностью реализован**

**Что делает:**
- ✅ Проверяет все активные подписки пользователей
- ✅ Ищет новые вакансии по фильтрам подписок
- ✅ Отправляет уведомления через Telegram бота
- ✅ Обновляет время последнего уведомления
- ✅ Учитывает настройки пользователя (частота, максимальное количество)

**Данные задачи:**
```typescript
interface NotifyJobData {
  userId?: string;                // Опционально: конкретный пользователь
  force?: boolean;                // Принудительная проверка всех подписок
  maxNotifications?: number;      // Максимальное количество уведомлений за раз
}
```

**Процесс выполнения:**
```typescript
export async function notifyJobProcessor(job: Job<NotifyJobData>) {
  const { userId, force = false, maxNotifications = 10 } = job.data;
  
  job.log(`🔔 Starting notifications check${userId ? ` for user ${userId}` : ''}`);
  
  try {
    // 1. Получаем подписки для проверки
    const subscriptions = await subscriptionManager.getActiveSubscriptions({
      userId,
      force
    });
    
    job.log(`📊 Found ${subscriptions.length} active subscriptions to check`);
    
    if (subscriptions.length === 0) {
      return { success: true, checked: 0, notified: 0 };
    }
    
    let notifiedCount = 0;
    
    // 2. Проверяем каждую подписку
    for (const sub of subscriptions) {
      const userSettings = sub.user.settings || {};
      
      // Пропускаем если уведомления выключены
      if (!userSettings.notificationsOn) {
        continue;
      }
      
      // Пропускаем если еще не прошло время с последнего уведомления
      if (!force && sub.lastNotified && 
          Date.now() - new Date(sub.lastNotified).getTime() < userSettings.notificationCooldown) {
        continue;
      }
      
      job.log(`🔍 Checking subscription ${sub.id} for user ${sub.user.telegramId}`);
      
      // 3. Ищем новые вакансии
      const since = sub.lastNotified || sub.createdAt;
      const filters = sub.filters as any;
      
      const newVacancies = await vacancyManager.findNewVacancies({
        ...filters,
        sources: sub.sources,
        publishedAfter: since,
        limit: Math.min(maxNotifications, userSettings.maxNotificationsPerBatch || 5)
      });
      
      if (newVacancies.length === 0) {
        continue;
      }
      
      job.log(`📧 Found ${newVacancies.length} new vacancies for subscription ${sub.id}`);
      
      // 4. Форматируем и отправляем уведомление
      const message = formatNotificationMessage(newVacancies, sub.filters);
      
      try {
        await telegramBot.sendMessage(
          sub.user.telegramId.toString(),
          message,
          {
            disable_web_page_preview: true,
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [{
                  text: '✅ Посмотреть все',
                  callback_data: `show_all_${sub.id}`
                }]
              ]
            }
          }
        );
        
        notifiedCount++;
        
        // 5. Обновляем время последнего уведомления
        await subscriptionManager.updateLastNotified(sub.id);
        
        job.log(`✅ Notified user ${sub.user.telegramId} about ${newVacancies.length} vacancies`);
        
        // Задержка между уведомлениями чтобы не спамить
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        job.log(`❌ Failed to notify user ${sub.user.telegramId}: ${error.message}`);
        
        // Если ошибка связана с блокировкой бота, отключаем уведомления для этого пользователя
        if (error.message.includes('blocked') || error.message.includes('kicked')) {
          await prisma.user.update({
            where: { id: sub.userId },
            data: { 
              settings: { 
                update: { notificationsOn: false } 
              } 
            }
          });
          job.log(`🔕 Disabled notifications for user ${sub.user.telegramId} (blocked bot)`);
        }
      }
    }
    
    return { 
      success: true, 
      checked: subscriptions.length, 
      notified: notifiedCount,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    job.log(`❌ Notify job failed: ${error.message}`);
    throw error;
  }
}
```

### 3. Semantic Dictionary Job - Обновление словарей

**Файл:** `src/worker/jobs/semanticJob.ts` ✅ **Полностью реализован**

**Что делает:**
- ✅ Автоматически собирает словари профессий из вакансий
- ✅ Обновляет ProfessionDictionary в БД
- ✅ Строит маппинг между разными источниками
- ✅ Оптимизирует семантический поиск

**Процесс выполнения:**
```typescript
export async function semanticJobProcessor(job: Job) {
  job.log('🔄 Starting semantic dictionary update');
  
  try {
    // 1. Получаем все вакансии за последний месяц
    const recentVacancies = await prisma.vacancy.findMany({
      where: {
        publishedAt: { 
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) 
        }
      },
      select: {
        title: true,
        skills: true,
        source: true
      }
    });
    
    job.log(`🧾 Analyzing ${recentVacancies.length} recent vacancies`);
    
    // 2. Обработка через ProfessionDictionaryService
    const result = await professionDictionaryService.updateDictionaries(recentVacancies);
    
    job.log(`✅ Updated dictionaries:`);
    job.log(`   - rabota.md: ${result.rabotaMd.count} professions`);
    job.log(`   - 999.md: ${result.nineNineNineMd.count} professions`);
    job.log(`   - makler.md: ${result.maklerMd.count} professions`);
    job.log(`   - Cross-mapping: ${result.crossMapping.count} mappings`);
    
    return {
      success: true,
      updated: {
        rabotaMd: result.rabotaMd.count,
        nineNineNineMd: result.nineNineNineMd.count,
        maklerMd: result.maklerMd.count,
        crossMapping: result.crossMapping.count
      },
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    job.log(`❌ Semantic update failed: ${error.message}`);
    throw error;
  }
}
```

---

## 📋 Система подписок

### Как работает подписка

```
1. Пользователь создает подписку через Telegram бота:
   /subscribe keywords=nodejs location=chisinau salaryMin=1000

2. Подписка сохраняется в БД:
   Subscription {
     userId: 'telegram_123456',
     filters: {
       keywords: ['nodejs'],
       locations: ['chisinau'],
       salaryMin: 1000
     },
     sources: ['rabota.md', '999.md'],
     isActive: true,
     createdAt: '2024-01-05T12:30:00Z',
     lastNotified: null
   }

3. Worker проверяет подписки каждые 2 часа:
   - Берет все активные подписки
   - Для каждой подписки ищет вакансии опубликованные после lastNotified
   - Если есть новые вакансии - отправляет уведомление
   - Обновляет lastNotified

4. Пользователь получает уведомление:
   🔔 Найдено 3 новых вакансий!
   
   1️⃣ Node.js Developer
      💼 Tech Corp
      📍 Chișinău
      💰 $1200-2000
      🔗 https://rabota.md/...
   
   [Кнопка "Посмотреть все"]
```

### Модель подписки в БД

```prisma
model Subscription {
  id          String    @id @default(cuid())
  userId      String
  user        User      @relation(fields: [userId], references: [id])
  filters     Json?     // { keywords: [], locations: [], salaryMin: number, ... }
  sources     String[]  // ['rabota.md', '999.md']
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())
  lastNotified DateTime?
  lastChecked DateTime?
}
```

### Настройки пользователя для подписок

```prisma
model UserSettings {
  id                   String   @id @default(cuid())
  userId               String   @unique
  user                 User     @relation(fields: [userId], references: [id])
  notificationsOn      Boolean  @default(true)
  notificationCooldown Int      @default(7200000) // 2 часа в мс
  maxNotificationsPerBatch Int @default(5)
  language             String   @default('ru')
}
```

---

## 📚 Словари профессий

### Зачем нужны словари

Словари профессий решают проблему **разного написания одних и тех же профессий** на разных сайтах:

```
rabota.md:    "Программист Node.js", "Node.js Developer"
999.md:       "Разработчик NodeJS", "NodeJS программист"
makler.md:    "Node.js специалист", "Backend разработчик (Node.js)"

Все это → "nodejs developer" в едином формате для поиска
```

### Архитектура словарей

```
┌────────────────────────────────────────────────────────┐
│                  ProfessionDictionary                   │
│                                                         │
│  source: 'rabota.md'                                   │
│  originalProfession: 'Программист Node.js'             │
│  normalizedProfession: 'nodejs developer'             │
│  similarityScore: 0.95                                 │
│                                                         │
│  source: '999.md'                                      │
│  originalProfession: 'Разработчик NodeJS'              │
│  normalizedProfession: 'nodejs developer'             │
│  similarityScore: 0.92                                 │
└────────────────────────────────────────────────────────┘
          ▲
          │
┌────────────────────────────────────────────────────────┐
│              CrossSourceMapping                        │
│                                                         │
│  sourceProfession: 'Программист Node.js' (rabota.md)    │
│  targetProfession: 'Разработчик NodeJS' (999.md)        │
│  mappingScore: 0.88                                     │
│                                                         │
│  sourceProfession: 'Node.js Developer' (rabota.md)     │
│  targetProfession: 'Backend разработчик (Node.js)'     │
│  mappingScore: 0.75                                     │
└────────────────────────────────────────────────────────┘
```

### Как работает семантический поиск

```typescript
// Пользователь ищет: "программист джава"
const keywords = ['программист', 'джава'];

// 1. Нормализуем запрос
const normalized = professionDictionaryService.normalizeQuery(keywords);
// → ['java', 'developer']

// 2. Ищем точные совпадения
const exactMatches = await prisma.vacancy.findMany({
  where: {
    OR: [
      { title: { contains: 'java', mode: 'insensitive' } },
      { skills: { has: 'java' } }
    ]
  }
});

// 3. Ищем по словарю (семантический поиск)
const semanticMatches = await professionDictionaryService.findSimilarVacancies({
  normalizedKeywords: ['java', 'developer'],
  minSimilarity: 0.7
});

// 4. Объединяем результаты
const results = [...exactMatches, ...semanticMatches].slice(0, limit);
```

### API для словарей

**GET** `/api/dictionaries/professions`

Получить все профессии из словаря:

```json
{
  "success": true,
  "data": [
    {
      "source": "rabota.md",
      "originalProfession": "Программист Node.js",
      "normalizedProfession": "nodejs developer",
      "count": 45,
      "lastSeen": "2024-01-05T10:30:00Z"
    },
    {
      "source": "999.md",
      "originalProfession": "Разработчик NodeJS", 
      "normalizedProfession": "nodejs developer",
      "count": 23,
      "lastSeen": "2024-01-04T15:20:00Z"
    }
  ]
}
```

**POST** `/api/dictionaries/professions/sync`

Принудительно обновить словари:

```json
{
  "success": true,
  "data": {
    "updated": {
      "rabotaMd": 1245,
      "nineNineNineMd": 890,
      "maklerMd": 340,
      "crossMapping": 567
    }
  }
}
```

### Настройки словарей в .env

```env
# Семантический поиск
SEMANTIC_SEARCH_ENABLED=true
SEMANTIC_SIMILARITY_THRESHOLD=0.7
DICTIONARY_UPDATE_INTERVAL=86400000  # 24 часа
```

---

## 🚀 Запуск Worker

### Development режим

```bash
npm run dev:worker
```

**Вывод:**
```
🔧 Worker cluster started
📊 Parse concurrency: 3
📊 Notify concurrency: 1  
📊 Semantic concurrency: 1
⏰ Parse interval: 360 minutes (6 hours)
⏰ Notify interval: 120 minutes (2 hours) 
⏰ Dictionary update: 1440 minutes (24 hours)

[BullMQ] Parse worker ready for 'parse' queue
[BullMQ] Notify worker ready for 'notify' queue  
[BullMQ] Semantic worker ready for 'semantic' queue
```

### Production режим

```bash
# Собрать проект
npm run build

# Запустить Worker как сервис
npm run start:worker

# Или через PM2 для автоперезапуска
pm2 start dist/src/worker/worker.js --name vacancy-worker
```

### Запуск с разными конфигурациями

```bash
# Только парсинг (без уведомлений)
WORKER_MODE=parse npm run dev:worker

# Только уведомления (для тестирования)
WORKER_MODE=notify npm run dev:worker

# Полный режим (по умолчанию)
npm run dev:worker
```

---

## 📊 Мониторинг

### Логи Worker

Worker выводит подробные логи с цветовой кодировкой:

```
🔍 [ParseJob] Starting parse for 999.md with query: developer
✅ [ParseJob] Found 125 vacancies: 12 new, 3 updated
📊 [ParseLog] Created parse log entry #12345

🔔 [NotifyJob] Starting notifications check
📊 [NotifyJob] Found 15 active subscriptions to check  
📧 [NotifyJob] Found 3 new vacancies for subscription #678
✅ [NotifyJob] Notified user 123456 about 3 vacancies

🔄 [SemanticJob] Starting semantic dictionary update
🧾 [SemanticJob] Analyzing 1250 recent vacancies
✅ [SemanticJob] Updated dictionaries: rabota.md: 456, 999.md: 321, makler.md: 189
```

### Мониторинг через Redis CLI

```bash
# Статус очередей
redis-cli --scan --pattern 'bull:*'
# bull:parse:wait
# bull:parse:active  
# bull:parse:completed
# bull:notify:wait
# bull:notify:active
# bull:notify:completed
# bull:semantic:wait
# bull:semantic:active
# bull:semantic:completed

# Количество задач в очереди
redis-cli llen bull:parse:wait
redis-cli llen bull:notify:wait

# Последние завершенные задачи
redis-cli lrange bull:parse:completed -10 -1
```

### Bull Board (визуальный мониторинг)

```typescript
// src/worker/monitor.ts
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [
    new BullMQAdapter(parseQueue),
    new BullMQAdapter(notifyQueue), 
    new BullMQAdapter(semanticQueue)
  ],
  serverAdapter
});

// Добавить в экспресс приложение
app.use('/admin/queues', serverAdapter.getRouter());
```

Открой: `http://localhost:3000/admin/queues`

### Health Check

**GET** `/health/worker`

```json
{
  "status": "ok",
  "timestamp": "2024-01-05T12:30:00Z",
  "queues": {
    "parse": {
      "waiting": 2,
      "active": 1,
      "completed": 145,
      "failed": 3
    },
    "notify": {
      "waiting": 0,
      "active": 0,
      "completed": 89,
      "failed": 1
    },
    "semantic": {
      "waiting": 0,
      "active": 0,
      "completed": 12,
      "failed": 0
    }
  },
  "lastParse": "2024-01-05T10:00:00Z",
  "lastNotify": "2024-01-05T11:30:00Z",
  "lastSemanticUpdate": "2024-01-04T23:45:00Z"
}
```

---

## ⚙️ Настройка

### В .env файле

```env
# Worker
WORKER_CONCURRENCY=3                # Сколько задач выполнять параллельно для parse
NOTIFY_WORKER_CONCURRENCY=1         # Параллельность для уведомлений
PARSE_INTERVAL=21600000             # Интервал парсинга (6 часов в мс)
NOTIFY_INTERVAL=7200000             # Интервал проверки подписок (2 часа в мс)
SEMANTIC_UPDATE_INTERVAL=86400000   # Обновление словарей (24 часа в мс)

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Telegram для уведомлений
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_BOT_ENABLED=true

# Семантический поиск
SEMANTIC_SEARCH_ENABLED=true
SEMANTIC_SIMILARITY_THRESHOLD=0.7
```

### Конфигурация через config module

```typescript
// src/shared/config/index.ts
export const config = {
  worker: {
    concurrency: parseInt(process.env.WORKER_CONCURRENCY || '3'),
    notifyConcurrency: parseInt(process.env.NOTIFY_WORKER_CONCURRENCY || '1'),
    parseInterval: parseInt(process.env.PARSE_INTERVAL || '21600000'), // 6 часов
    notifyInterval: parseInt(process.env.NOTIFY_INTERVAL || '7200000'), // 2 часа
    semanticUpdateInterval: parseInt(process.env.SEMANTIC_UPDATE_INTERVAL || '86400000'),
    mode: process.env.WORKER_MODE || 'full' // 'parse', 'notify', 'semantic', 'full'
  },
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    enabled: process.env.TELEGRAM_BOT_ENABLED === 'true'
  },
  semantic: {
    enabled: process.env.SEMANTIC_SEARCH_ENABLED === 'true',
    similarityThreshold: parseFloat(process.env.SEMANTIC_SIMILARITY_THRESHOLD || '0.7')
  }
};
```

### Retry стратегия

```typescript
// Настройка retry для всех очередей
const baseJobOptions = {
  attempts: 3,                      // 3 попытки при ошибке
  backoff: {
    type: 'exponential',            // экспоненциальная задержка
    delay: 2000                     // начальная задержка 2 сек
  },
  removeOnComplete: {               // удалять завершенные задачи
    age: 86400,                     // после 24 часов
    count: 1000                     // оставлять последние 1000
  },
  removeOnFail: {                   // удалять проваленные задачи
    age: 172800,                    // после 48 часов
    count: 100                      // оставлять последние 100
  }
};

// Использование
await parseQueue.add('parse-job', data, {
  ...baseJobOptions,
  priority: job.data.priority === 'high' ? 1 : 10
});
```

---

## 🐛 Troubleshooting

### Worker не подключается к Redis

**Симптомы:** `Error: connect ECONNREFUSED 127.0.0.1:6379`

**Решение:**
```bash
# Проверить статус Redis
redis-cli ping
# Если не отвечает:
sudo service redis-server start
# Или через Docker:
docker start redis
```

### Задачи зависают в очереди

**Симптомы:** Задачи висят в `wait` или `active` статусе долго

**Проверка:**
```bash
# Посмотреть активные задачи
redis-cli lrange bull:parse:active 0 -1

# Проверить логи Worker
npm run dev:worker
```

**Решения:**
1. **Перезапустить Worker:**
   ```bash
   # Убить текущий процесс и запустить заново
   npm run dev:worker
   ```

2. **Очистить зависшие задачи:**
   ```bash
   # Очистить активные задачи (осторожно!)
   redis-cli del bull:parse:active
   ```

3. **Проверить блокировки:**
   ```bash
   # Проверить блокировки Redis
   redis-cli info clients
   ```

### Уведомления не отправляются

**Симптомы:** Задачи notify выполняются успешно, но пользователи не получают сообщений

**Проверка:**
```typescript
// Проверить настройки Telegram
console.log('Telegram bot enabled:', config.telegram.enabled);
console.log('Bot token exists:', !!config.telegram.botToken);

// Проверить права бота
try {
  const me = await telegramBot.getMe();
  console.log('Bot info:', me);
} catch (error) {
  console.error('Telegram API error:', error.message);
}
```

**Решения:**
1. **Проверить токен бота:**
   ```env
   TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
   ```

2. **Проверить блокировки:**
   ```typescript
   // В коде отправки уведомления
   try {
     await bot.sendMessage(userId, message);
   } catch (error) {
     if (error.response?.statusCode === 403) {
       console.log(`User ${userId} blocked the bot`);
       // Отключить уведомления для этого пользователя
       await prisma.user.update({
         where: { telegramId: userId },
         data: { settings: { update: { notificationsOn: false } } }
       });
     }
   }
   ```

3. **Проверить лимиты Telegram:**
   - Максимум 30 сообщений в секунду для ботов
   - Добавить задержку между уведомлениями:
     ```typescript
     for (const sub of subscriptions) {
       // ... отправка уведомления
       await new Promise(resolve => setTimeout(resolve, 1000)); // 1 сек задержки
     }
     ```

### Словари не обновляются

**Симптомы:** Семантический поиск не находит похожие профессии

**Проверка:**
```bash
# Проверить последнее обновление словарей
npm run db:studio
# Посмотреть таблицу ProfessionDictionary, отсортировать по lastUpdated

# Запустить принудительное обновление
curl -X POST http://localhost:3000/api/dictionaries/professions/sync
```

**Решения:**
1. **Проверить интервал обновления:**
   ```env
   SEMANTIC_UPDATE_INTERVAL=86400000 # 24 часа
   ```

2. **Проверить права доступа к БД:**
   ```typescript
   // В semanticJobProcessor
   try {
     await prisma.professionDictionary.findMany();
   } catch (error) {
     console.error('Database permission error:', error.message);
   }
   ```

3. **Увеличить количество обрабатываемых вакансий:**
   ```typescript
   // В semanticJobProcessor
   const recentVacancies = await prisma.vacancy.findMany({
     where: {
       publishedAt: { 
         gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // 90 дней вместо 30
       }
     },
     take: 10000 // Максимальное количество
   });
   ```

---

## 🎯 Best Practices

### 1. Используй разные очереди для разных задач

```typescript
// Плохо - одна очередь для всего
const queue = new Queue('all-tasks');

// Хорошо - разделение по типам задач
const parseQueue = new Queue('parse');
const notifyQueue = new Queue('notify');
const semanticQueue = new Queue('semantic');
```

### 2. Добавляй прогресс для долгих задач

```typescript
export async function parseJobProcessor(job: Job) {
  const totalPages = job.data.maxPages || 5;
  
  for (let page = 1; page <= totalPages; page++) {
    // ... парсинг страницы
    
    // Обновляем прогресс
    const progress = Math.round((page / totalPages) * 100);
    await job.updateProgress(progress);
    job.log(`🔄 Progress: ${progress}% (${page}/${totalPages} pages)`);
  }
}
```

### 3. Используй idempotency для периодических задач

```typescript
// Плохо - могут создаваться дубликаты
await queue.add('periodic-task', data, {
  repeat: { every: 3600000 }
});

// Хорошо - уникальный jobId предотвращает дубликаты
await queue.add('periodic-task', data, {
  repeat: { every: 3600000 },
  jobId: 'unique-periodic-task-id' // например: 'periodic-rabota-parse-v1'
});
```

### 4. Логируй всё в структурированном формате

```typescript
// Плохо - неструктурированные логи
console.log(`Parse completed for ${source}, found ${count} vacancies`);

// Хорошо - структурированные логи
job.log(JSON.stringify({
  event: 'parse_completed',
  source,
  vacanciesFound: count,
  newVacancies: created,
  updatedVacancies: updated,
  duration: Date.now() - startTime,
  timestamp: new Date().toISOString()
}));
```

### 5. Настрой автоматическое восстановление

```typescript
// В worker.ts
parseWorker.on('error', (error) => {
  console.error('Worker crashed:', error.message);
  
  // Автоматический перезапуск через 5 секунд
  setTimeout(() => {
    console.log('🔄 Restarting crashed worker...');
    startWorker(); // твоя функция запуска worker
  }, 5000);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutdown signal received');
  await parseWorker.close();
  await notifyWorker.close();
  await semanticWorker.close();
  await prisma.$disconnect();
  process.exit(0);
});
```

---

## 📈 Масштабирование

### Горизонтальное масштабирование

**Сценарий:** Нужно обрабатывать 100+ подписок каждые 2 часа

**Решение:** Запустить несколько Workers на разных серверах

```bash
# Сервер 1
REDIS_HOST=redis-prod.example.com npm run start:worker

# Сервер 2  
REDIS_HOST=redis-prod.example.com npm run start:worker

# Сервер 3
REDIS_HOST=redis-prod.example.com npm run start:worker
```

BullMQ автоматически распределит задачи между всеми Workers!

### Вертикальное масштабирование

**Сценарий:** Нужно быстрее парсить вакансии

**Решение:** Увеличить concurrency и оптимизировать код

```typescript
// config.ts
export const config = {
  worker: {
    concurrency: 10, // вместо 3
    parseInterval: 10800000 // 3 часа вместо 6
  }
};

// В parseJobProcessor - оптимизация
async function parseJobProcessor(job: Job) {
  // Использовать Promise.all для параллельной обработки страниц
  const pages = Array.from({ length: maxPages }, (_, i) => i + 1);
  const results = await Promise.allSettled(
    pages.map(page => parser.parsePage(page))
  );
}
```

### Разделение очередей по приоритетам

```typescript
// Очереди с разными приоритетами
const highPriorityQueue = new Queue('parse-high');
const normalPriorityQueue = new Queue('parse-normal');
const lowPriorityQueue = new Queue('parse-low');

// Workers с разными настройками
const highPriorityWorker = new Worker('parse-high', processor, {
  concurrency: 1, // Меньше concurrency для высокого приоритета
  limiter: { max: 5, duration: 1000 } // Ограничение 5 задач/сек
});

const normalPriorityWorker = new Worker('parse-normal', processor, {
  concurrency: 3
});
```

---

📖 **Читай далее:**
- [Документация по API](./API.md)
- [Документация по парсерам](./PARSERS.md)
- [Интеграция с Telegram ботом](./BOT_INTEGRATION.md)
- [Документация по словарям](./PROFESSION_DICTIONARY.md)