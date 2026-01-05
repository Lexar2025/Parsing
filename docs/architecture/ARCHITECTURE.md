# 🏛️ Архитектура системы

## 📖 Содержание

- [Общая схема](#общая-схема)
- [Как работает система](#как-работает-система)
- [Сценарии использования](#сценарии-использования)
- [Поток данных](#поток-данных)
- [Компоненты](#компоненты)

---

## 🎯 Общая схема

```
┌────────────────────────────────────────────────────────────────┐
│                         ПОЛЬЗОВАТЕЛЬ                            │
│                    (через Telegram бота)                        │
└───────────────────────────┬────────────────────────────────────┘
                            │
                            │ "Найди вакансии Node.js 
                            │  в Кишиневе с зарплатой 1000$"
                            ▼
┌────────────────────────────────────────────────────────────────┐
│                      TELEGRAM BOT                               │
│                   (будет создан далее)                          │
│  - Принимает запросы                                            │
│  - Формирует фильтры                                            │
│  - Отправляет HTTP запрос в API                                 │
└───────────────────────────┬────────────────────────────────────┘
                            │
                            │ GET /api/vacancies?keywords=nodejs&
                            │     location=chisinau&salaryMin=1000
                            ▼
┌────────────────────────────────────────────────────────────────┐
│                       API SERVER                                │
│                      (Fastify на порту 3000)                    │
│                                                                  │
│  1. Получает запрос с фильтрами                                │
│  2. ПРОВЕРЯЕТ: есть ли данные в БД?                            │
│     └─> Есть и свежие (< 12 часов) → Возвращает из БД         │
│     └─> Нет или старые → Запускает парсинг                     │
│  3. Возвращает результат боту                                   │
└───────────────────────────┬────────────────────────────────────┘
                            │
                   ┌────────┴────────┐
                   │                 │
                   ▼                 ▼
    ┌──────────────────┐  ┌──────────────────┐
    │   PostgreSQL     │  │   Redis Queue    │
    │   (хранение)     │  │   (задачи)       │
    └──────────────────┘  └────────┬─────────┘
            ▲                      │
            │                      │
            │                      ▼
            │         ┌──────────────────────┐
            │         │      WORKER          │
            │         │   (BullMQ процесс)   │
            │         │                       │
            │         │  Выполняет задачи:   │
            │         │  1. Парсинг          │
            │         │  2. Уведомления      │
            │         │  3. Очистка          │
            │         └──────────┬───────────┘
            │                    │
            │                    │ Парсит данные
            │                    ▼
            │         ┌──────────────────────┐
            │         │      PARSERS         │
            │         │                       │
            │         │  ┌────────────────┐  │
            │         │  │  rabota.md     │  │
            │         │  └────────────────┘  │
            │         │  ┌────────────────┐  │
            │         │  │  999.md        │  │
            │         │  └────────────────┘  │
            │         │  ┌────────────────┐  │
            │         │  │  makler.md     │  │
            │         │  └────────────────┘  │
            │         └──────────┬───────────┘
            │                    │
            │                    │ Сырые данные
            │                    ▼
            │         ┌──────────────────────┐
            │         │     ADAPTERS         │
            │         │  (унификация)        │
            │         │                       │
            │         │  Преобразуют в:      │
            │         │  - title             │
            │         │  - company           │
            │         │  - salary            │
            │         │  - location          │
            │         │  - etc...            │
            │         └──────────┬───────────┘
            │                    │
            └────────────────────┘ Сохраняет в БД
```

---

## 🔄 Как работает система

### Сценарий 1: Пользователь ищет вакансии

**Шаг 1: Запрос от пользователя**
```
Пользователь в Telegram боте:
"Найди работу программиста Node.js в Кишиневе с зарплатой от 1000$"
```

**Шаг 2: Бот формирует запрос к API**
```http
GET http://localhost:3000/api/vacancies?keywords=nodejs&location=chisinau&salaryMin=1000&sources=rabota.md,999.md
```

**Шаг 3: API проверяет базу данных**
```typescript
// В VacancyService
async findByFilters(filters) {
  // 1. Ищем в БД
  const vacancies = await prisma.vacancy.findMany({ 
    where: { /* фильтры */ }
  });
  
  // 2. Проверяем свежесть
  const lastParse = await getLastParseTime(filters.sources);
  const isStale = lastParse < Date.now() - (12 * 60 * 60 * 1000); // 12 часов
  
  // 3. Если данные старые - запускаем парсинг в фоне
  if (isStale) {
    await parseQueue.add('parse-job', {
      sources: filters.sources,
      priority: vacancies.length === 0 ? 'high' : 'normal'
    });
  }
  
  // 4. Возвращаем что есть + статус обновления
  return { 
    vacancies, 
    updating: isStale,
    lastUpdate: lastParse 
  };
}
```

**Шаг 4: API возвращает результат**
```json
{
  "success": true,
  "data": [
    {
      "id": "clx123...",
      "title": "Node.js Developer",
      "company": "Tech Corp",
      "location": "Chișinău",
      "salaryMin": 1200,
      "salaryMax": 2000,
      "salaryCurrency": "USD",
      "source": "rabota.md",
      "publishedAt": "2024-01-05T10:30:00Z"
    }
  ],
  "meta": {
    "total": 15,
    "updating": false,
    "lastUpdate": "2024-01-05T08:00:00Z"
  }
}
```

**Шаг 5: Бот показывает результаты пользователю**
```
🔍 Найдено 15 вакансий:

1️⃣ Node.js Developer
   💼 Tech Corp
   📍 Chișinău
   💰 $1200-2000
   🔗 rabota.md

2️⃣ Senior Backend Developer
   ...
```

---

### Сценарий 2: Worker парсит вакансии в фоне

**Автоматический запуск каждые 6 часов:**

```typescript
// Worker запускается
parseQueue.add('periodic-parse', {
  source: 'rabota.md',
  searchQuery: 'it',
  maxPages: 5
}, {
  repeat: { every: 6 * 60 * 60 * 1000 } // 6 часов
});
```

**Процесс парсинга:**

1. **Worker берет задачу из очереди**
   ```typescript
   const job = await parseQueue.getNextJob();
   // job.data = { source: 'rabota.md', ... }
   ```

2. **Запускает парсер**
   ```typescript
   const parser = new RabotaMdParser();
   const result = await parser.parse({
     baseUrl: 'https://www.rabota.md',
     searchQuery: 'it',
     maxPages: 5
   });
   // result.vacancies = [{ title, company, ... }, ...]
   ```

3. **Преобразует через адаптер**
   ```typescript
   const adapter = new RabotaMdAdapter();
   const unified = result.vacancies.map(v => adapter.toPrisma(v));
   ```

4. **Сохраняет в БД (upsert)**
   ```typescript
   for (const vacancy of unified) {
     await prisma.vacancy.upsert({
       where: { 
         source_sourceId: { 
           source: vacancy.source, 
           sourceId: vacancy.sourceId 
         }
       },
       create: vacancy,
       update: vacancy
     });
   }
   ```

5. **Логирует результат**
   ```typescript
   await prisma.parseLog.create({
     data: {
       source: 'rabota.md',
       status: 'success',
       vacanciesFound: result.vacancies.length,
       vacanciesNew: 12,
       duration: 45000 // мс
     }
   });
   ```

---

### Сценарий 3: Подписка на вакансии (будущая функция)

**Пользователь создает подписку:**

```
Пользователь: "Подписаться на вакансии Node.js в Кишиневе"
```

**Бот создает подписку:**
```http
POST /api/subscriptions
{
  "userId": "telegram:123456",
  "filters": {
    "keywords": ["nodejs"],
    "locations": ["chisinau"],
    "salaryMin": 1000
  },
  "sources": ["rabota.md", "999.md"]
}
```

**Worker проверяет подписки каждые 2 часа:**

```typescript
// Задача в Worker
async function checkSubscriptions() {
  // 1. Получить все активные подписки
  const subscriptions = await prisma.subscription.findMany({
    where: { isActive: true },
    include: { user: true }
  });
  
  for (const sub of subscriptions) {
    // 2. Найти новые вакансии
    const newVacancies = await prisma.vacancy.findMany({
      where: {
        // Фильтры из подписки
        ...sub.filters,
        // Только новые с последней проверки
        publishedAt: { gt: sub.lastNotified || sub.createdAt }
      }
    });
    
    if (newVacancies.length > 0) {
      // 3. Отправить уведомление
      await bot.sendMessage(sub.user.telegramId, 
        `🔔 Найдено ${newVacancies.length} новых вакансий!`
      );
      
      // 4. Обновить время последнего уведомления
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { lastNotified: new Date() }
      });
    }
  }
}
```

---

## 📊 Поток данных

### От парсера до пользователя

```
1. Веб-сайт (rabota.md)
   │
   │ HTML страница
   ▼
2. Parser (RabotaMdParser)
   - Извлекает данные с сайта
   │
   │ Сырые данные (разный формат для каждого сайта)
   │ { "Заработок": "500-1000 lei", "Предприятие": "...", ... }
   ▼
3. Adapter (RabotaMdAdapter)
   - Унифицирует формат
   │
   │ Единый формат
   │ { title, company, salaryMin: 500, salaryMax: 1000, ... }
   ▼
4. Database (PostgreSQL)
   - Сохраняет в таблицу Vacancy
   │
   │ Структурированные данные
   ▼
5. API Service (VacancyService)
   - Фильтрует и ищет
   │
   │ Отфильтрованный результат
   ▼
6. API Route (/api/vacancies)
   - Формирует HTTP ответ
   │
   │ JSON
   ▼
7. Telegram Bot
   - Форматирует для пользователя
   │
   │ Красивое сообщение
   ▼
8. Пользователь
```

---

## 🧩 Компоненты и их роли

### 1. Parsers (Парсеры)
**Роль:** Извлечение данных с веб-сайтов

**Что делают:**
- Отправляют HTTP запросы к сайтам
- Парсят HTML через cheerio/jsdom
- Извлекают вакансии
- Кэшируют результаты

**Пример:**
```typescript
const parser = new RabotaMdParser();
const vacancies = await parser.parse({ 
  baseUrl: 'https://www.rabota.md',
  searchQuery: 'it' 
});
// Возвращает: [{ id, title, company, salary, ... }, ...]
```

### 2. Adapters (Адаптеры)
**Роль:** Унификация данных

**Почему нужны:**
- Каждый сайт имеет свой формат данных
- Нужно привести все к единому виду для БД
- Упрощает работу с разными источниками

**Пример:**
```typescript
// rabota.md дает: "Зарплата: 500-1000 lei"
// 999.md дает: "Salary: €800-1500"

// Адаптер преобразует в:
{
  salaryMin: 500,
  salaryMax: 1000,
  salaryCurrency: 'MDL'
}
```

### 3. Database (База данных)
**Роль:** Хранение и быстрый поиск

**Таблицы:**
- `User` - пользователи бота
- `Subscription` - подписки на вакансии
- `Vacancy` - все вакансии (унифицированные)
- `ParseLog` - логи парсинга
- `UserSettings` - настройки пользователей

### 4. API Server
**Роль:** Предоставление данных через HTTP

**Основные эндпоинты:**
- `GET /api/vacancies` - поиск вакансий
- `GET /api/vacancies/:id` - одна вакансия
- `POST /api/subscriptions` - создать подписку
- `GET /api/subscriptions/:userId` - подписки пользователя

### 5. Worker
**Роль:** Фоновые задачи

**Задачи:**
- Периодический парсинг (каждые 6 часов)
- Проверка подписок (каждые 2 часа)
- Отправка уведомлений
- Очистка старых данных

---

## ⏱️ Временные метрики

| Процесс | Время | Частота |
|---------|-------|---------|
| Парсинг 1 страницы | 2-5 сек | По запросу |
| Парсинг 5 страниц | 10-30 сек | Каждые 6 часов |
| Сохранение в БД | 100-500 мс | После парсинга |
| Поиск в БД | 50-200 мс | По запросу |
| API запрос | 100-300 мс | По запросу |
| Проверка подписок | 1-5 сек | Каждые 2 часа |

---

## 🔐 Безопасность и производительность

### Rate Limiting
- Каждый парсер имеет лимит запросов
- Задержки между запросами (1-3 сек)
- BullMQ ограничивает параллельные задачи

### Кэширование
- Парсеры кэшируют страницы (TTL: 24 часа)
- API может кэшировать результаты в Redis
- База данных имеет индексы для быстрого поиска

### Обработка ошибок
- Retry для неудачных парсингов
- Логирование всех ошибок
- Graceful shutdown для сохранения данных

---

## 🎯 Следующие шаги разработки

1. **Создать Telegram бота**
   - Регистрация через BotFather
   - Подключение к API
   - Команды: /search, /subscribe, /my_subscriptions

2. **Реализовать подписки**
   - API эндпоинты для CRUD подписок
   - Worker задача для проверки
   - Уведомления через бота

3. **Добавить ML рекомендации**
   - Анализ истории поиска
   - Рекомендация похожих вакансий
   - Персонализация результатов

---

📖 **Читай далее:**
- [Документация по парсерам](./PARSERS.md)
- [Документация по API](./API.md)
- [Документация по Worker](./WORKER.md)
