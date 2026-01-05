# ⚙️ Worker Documentation

## 📖 Содержание

- [Обзор](#обзор)
- [Как работает Worker](#как-работает-worker)
- [Задачи (Jobs)](#задачи-jobs)
- [Запуск Worker](#запуск-worker)
- [Мониторинг](#мониторинг)
- [Настройка](#настройка)

---

## 🎯 Обзор

**Worker** - это фоновый процесс на **BullMQ**, который выполняет задачи в фоне независимо от API сервера.

**Зачем нужен Worker:**
- Автоматический парсинг вакансий по расписанию
- Проверка подписок и отправка уведомлений
- Очистка старых данных
- Выполнение долгих операций без блокировки API

**Технологии:**
- **BullMQ** - библиотека для работы с очередями
- **Redis** - хранилище очередей и состояний
- **Node.js** - выполнение JavaScript кода

---

## 🔄 Как работает Worker

### Архитектура

```
┌────────────────────────────────────────┐
│             Redis                       │
│  (хранит очередь задач)                │
│                                         │
│  Queue: "parse"                        │
│  ├─ Job #1: { source: 'rabota.md' }   │
│  ├─ Job #2: { source: '999.md' }      │
│  └─ Job #3: { source: 'makler.md' }   │
└────────────────┬───────────────────────┘
                 │
                 │ Worker забирает задачи
                 ▼
┌────────────────────────────────────────┐
│           Worker Process                │
│                                         │
│  1. Берет задачу из очереди            │
│  2. Выполняет (парсинг, уведомления)   │
│  3. Логирует результат                 │
│  4. Берет следующую задачу             │
└────────────────┬───────────────────────┘
                 │
                 │ Сохраняет результат
                 ▼
┌────────────────────────────────────────┐
│          PostgreSQL                     │
│  (сохраняет вакансии и логи)          │
└────────────────────────────────────────┘
```

### Процесс выполнения задачи

```
1. Задача добавляется в очередь
   parseQueue.add('parse-rabota', { source: 'rabota.md' })

2. Worker забирает задачу
   const job = await parseQueue.getNextJob()

3. Выполняет processor
   await parseJobProcessor(job)

4. Processor парсит данные
   const parser = new RabotaMdParser()
   const vacancies = await parser.parse(...)

5. Сохраняет в БД
   await vacancyService.saveVacancies(vacancies)

6. Логирует результат
   await prisma.parseLog.create(...)

7. Задача помечается как completed
   job.moveToCompleted()
```

---

## 📋 Задачи (Jobs)

### 1. Parse Job - Парсинг вакансий

**Файл:** `src/worker/jobs/parseJob.ts`

**Что делает:**
- Парсит вакансии с указанного источника
- Преобразует через адаптеры
- Сохраняет в БД (upsert - создает новые, обновляет существующие)
- Логирует результат

**Данные задачи:**
```typescript
interface ParseJobData {
  source: 'rabota.md' | '999.md' | 'makler.md';
  searchQuery?: string;
  maxPages?: number;
}
```

**Пример добавления задачи:**
```typescript
await parseQueue.add('parse-rabota', {
  source: 'rabota.md',
  searchQuery: 'it',
  maxPages: 5
});
```

**Процесс выполнения:**
```typescript
export async function parseJobProcessor(job: Job<ParseJobData>) {
  const { source, searchQuery, maxPages = 5 } = job.data;
  
  job.log(`Starting parse for ${source}`);
  
  // 1. Получить парсер
  const parser = getParser(source); // rabotaMd, 999md, etc
  
  // 2. Парсить вакансии
  const vacancies = await parser.parse({
    baseUrl: getBaseUrl(source),
    searchQuery,
    maxPages
  });
  
  job.log(`Found ${vacancies.length} vacancies`);
  
  // 3. Сохранить в БД через сервис (использует адаптеры внутри)
  const { created, updated } = await vacancyService.saveVacancies(vacancies);
  
  // 4. Залогировать в ParseLog
  await prisma.parseLog.create({
    data: {
      source,
      status: 'success',
      vacanciesFound: vacancies.length,
      vacanciesNew: created,
      duration: Date.now() - job.processedOn
    }
  });
  
  job.log(`Completed: ${created} new, ${updated} updated`);
  
  return { success: true, created, updated };
}
```

### 2. Periodic Parse - Периодический парсинг

**Автоматически запускается каждые 6 часов (настраивается в .env)**

```typescript
// В worker.ts
await parseQueue.add(
  'periodic-rabota',
  {
    source: 'rabota.md',
    searchQuery: 'it',
    maxPages: 3
  },
  {
    repeat: {
      every: config.worker.parseInterval // 6 часов
    },
    jobId: 'periodic-rabota-parse' // уникальный ID
  }
);
```

**Как работает:**
- Worker автоматически добавляет задачу в очередь каждые 6 часов
- Задача выполняется через `parseJobProcessor`
- Данные обновляются в БД
- Следующая задача планируется автоматически

### 3. Notify Job - Уведомления (в разработке)

**Файл:** `src/worker/jobs/notifyJob.ts` (создадим позже)

**Что будет делать:**
- Проверять подписки пользователей
- Искать новые вакансии по фильтрам
- Отправлять уведомления через Telegram бота
- Обновлять время последнего уведомления

**Пример:**
```typescript
// Задача запускается каждые 2 часа
await notifyQueue.add(
  'check-subscriptions',
  {},
  {
    repeat: {
      every: config.worker.notifyInterval // 2 часа
    }
  }
);
```

**Процесс:**
```typescript
async function notifyJobProcessor(job: Job) {
  // 1. Получить все активные подписки
  const subscriptions = await prisma.subscription.findMany({
    where: { isActive: true },
    include: { user: true }
  });
  
  for (const sub of subscriptions) {
    // 2. Найти новые вакансии с момента последнего уведомления
    const since = sub.lastNotified || sub.createdAt;
    
    const newVacancies = await vacancyService.findByFilters({
      ...sub.filters,
      sources: sub.sources,
      publishedAfter: since
    });
    
    if (newVacancies.length > 0) {
      // 3. Отправить уведомление
      await bot.sendMessage(
        sub.user.telegramId,
        formatVacancies(newVacancies)
      );
      
      // 4. Обновить время
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { lastNotified: new Date() }
      });
    }
  }
}
```

---

## 🚀 Запуск Worker

### Development режим

```bash
npm run dev:worker
```

**Вывод:**
```
🔧 Worker started
📊 Concurrency: 3
⏰ Parse interval: 360 minutes
[BullMQ] Processing job parse-rabota
[BullMQ] Job completed: parse-rabota
```

### Production режим

```bash
npm run build
npm run start:worker
```

### Запуск нескольких Workers

Для масштабирования можно запустить несколько процессов:

```bash
# Терминал 1
npm run dev:worker

# Терминал 2
npm run dev:worker

# Терминал 3
npm run dev:worker
```

BullMQ автоматически распределит задачи между Workers!

---

## 📊 Мониторинг

### Логи Worker

Worker выводит логи в консоль:

```
✅ Job 1234 completed: { success: true, created: 12, updated: 3 }
❌ Job 5678 failed: Parser timeout
⏳ Job 9012 active: Parsing page 3/5...
```

### События Worker

```typescript
// В worker.ts
parseWorker.on('completed', (job) => {
  console.log(`✅ Job ${job.id} completed:`, job.returnvalue);
});

parseWorker.on('failed', (job, err) => {
  console.error(`❌ Job ${job?.id} failed:`, err.message);
});

parseWorker.on('progress', (job, progress) => {
  console.log(`⏳ Job ${job.id} progress: ${progress}%`);
});
```

### Проверка очереди в Redis

```bash
redis-cli

# Посмотреть ключи
> KEYS *

# Количество задач в очереди
> LLEN bull:parse:wait

# Активные задачи
> LLEN bull:parse:active

# Завершенные задачи
> LLEN bull:parse:completed

# Неудачные задачи
> LLEN bull:parse:failed
```

### Bull Board (опционально)

Визуальный интерфейс для мониторинга очередей:

```bash
npm install @bull-board/api @bull-board/fastify
```

```typescript
// Добавь в server.ts
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { FastifyAdapter } from '@bull-board/fastify';

const serverAdapter = new FastifyAdapter();

createBullBoard({
  queues: [
    new BullMQAdapter(parseQueue)
  ],
  serverAdapter
});

serverAdapter.setBasePath('/admin/queues');
fastify.register(serverAdapter.registerPlugin(), { 
  prefix: '/admin/queues' 
});
```

Открой: `http://localhost:3000/admin/queues`

---

## ⚙️ Настройка

### В .env файле

```env
# Worker
WORKER_CONCURRENCY=3           # Сколько задач выполнять параллельно
PARSE_INTERVAL=21600000        # Интервал парсинга (6 часов в мс)
NOTIFY_INTERVAL=7200000        # Интервал проверки подписок (2 часа в мс)

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

### Concurrency (параллельность)

```typescript
// В worker.ts
const parseWorker = new Worker('parse', parseJobProcessor, {
  connection: redisConnection,
  concurrency: 3  // Выполнять до 3 задач одновременно
});
```

**Рекомендации:**
- `concurrency: 1` - для медленных парсеров
- `concurrency: 3-5` - оптимально для большинства случаев
- `concurrency: 10+` - если много быстрых задач

### Rate Limiting

```typescript
const parseWorker = new Worker('parse', parseJobProcessor, {
  connection: redisConnection,
  limiter: {
    max: 10,         // максимум 10 задач
    duration: 60000  // за 60 секунд (1 минуту)
  }
});
```

### Retry стратегия

```typescript
await parseQueue.add('parse-job', data, {
  attempts: 3,           // попыток при ошибке
  backoff: {
    type: 'exponential',
    delay: 2000          // начальная задержка 2 сек
  }
});
```

**Exponential backoff:**
- Попытка 1: выполняется сразу
- Попытка 2: через 2 секунды
- Попытка 3: через 4 секунды
- Попытка 4: через 8 секунд

---

## 🐛 Troubleshooting

### Worker не запускается

**Проблема:** `Error: connect ECONNREFUSED 127.0.0.1:6379`

**Решение:** Redis не запущен. Запусти Redis:
```bash
docker start redis
# Или
sudo service redis-server start
```

---

### Задачи не выполняются

**Проблема:** Worker запущен, но задачи висят в очереди

**Причины:**
1. **Worker не слушает очередь:**
   ```typescript
   // Проверь что имя очереди совпадает
   const queue = new Queue('parse');    // ← Имя
   const worker = new Worker('parse');  // ← Должно совпадать
   ```

2. **Ошибка в processor:**
   ```bash
   # Смотри логи Worker
   npm run dev:worker
   ```

3. **Очередь заполнена:**
   ```bash
   # Очисти очередь
   redis-cli FLUSHALL
   ```

---

### Задачи выполняются дважды

**Проблема:** Одна задача выполняется несколько раз

**Причины:**
1. **Запущено несколько Workers без правильной настройки**
2. **Задача не помечается как completed**

**Решение:**
```typescript
// Используй уникальные jobId для периодических задач
await queue.add('periodic', data, {
  jobId: 'unique-periodic-task',  // ← Уникальный ID
  repeat: { every: 60000 }
});
```

---

### Redis память заполнена

**Проблема:** `OOM command not allowed`

**Решение:** Настрой политику вытеснения в `redis.conf`:
```conf
maxmemory 256mb
maxmemory-policy allkeys-lru
```

---

## 🎯 Best Practices

### 1. Используй jobId для уникальных задач

```typescript
await queue.add('unique-task', data, {
  jobId: `parse-${source}-${Date.now()}`
});
```

### 2. Добавляй прогресс

```typescript
export async function parseJobProcessor(job: Job) {
  for (let page = 1; page <= maxPages; page++) {
    await job.updateProgress((page / maxPages) * 100);
    // ...
  }
}
```

### 3. Логируй все

```typescript
job.log(`Starting parse for ${source}`);
job.log(`Page ${page}/${maxPages}`);
job.log(`Found ${vacancies.length} vacancies`);
```

### 4. Обрабатывай ошибки

```typescript
try {
  const result = await parser.parse(...);
} catch (error) {
  job.log(`Error: ${error.message}`);
  await prisma.parseLog.create({
    data: { status: 'error', error: error.message }
  });
  throw error; // Чтобы BullMQ знал что задача провалилась
}
```

### 5. Используй приоритеты

```typescript
// Высокий приоритет для срочных задач
await queue.add('urgent-parse', data, {
  priority: 1  // Чем меньше число - тем выше приоритет
});

// Низкий приоритет для фоновых задач
await queue.add('background-parse', data, {
  priority: 10
});
```

---

## 📈 Масштабирование

### Горизонтальное масштабирование

Запусти несколько Workers на разных серверах:

**Сервер 1:**
```bash
REDIS_HOST=redis.example.com npm run start:worker
```

**Сервер 2:**
```bash
REDIS_HOST=redis.example.com npm run start:worker
```

BullMQ автоматически распределит нагрузку!

### Разделение очередей

Создай разные очереди для разных задач:

```typescript
// Очередь для парсинга
const parseQueue = new Queue('parse');

// Очередь для уведомлений
const notifyQueue = new Queue('notify');

// Очередь для очистки
const cleanupQueue = new Queue('cleanup');

// Запусти отдельные Workers
const parseWorker = new Worker('parse', parseJobProcessor);
const notifyWorker = new Worker('notify', notifyJobProcessor);
const cleanupWorker = new Worker('cleanup', cleanupJobProcessor);
```

---

📖 **Читай далее:**
- [Документация по API](./API.md)
- [Документация по парсерам](./PARSERS.md)
- [Redis Setup](./REDIS_SETUP.md)
