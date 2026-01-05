# 🗄️ Database Documentation

## 📖 Содержание

- [Обзор](#обзор)
- [Схема базы данных](#схема-базы-данных)
- [Таблицы](#таблицы)
- [Работа с Prisma](#работа-с-prisma)
- [Миграции](#миграции)
- [Полезные запросы](#полезные-запросы)

---

## 🎯 Обзор

**База данных:** PostgreSQL  
**ORM:** Prisma  
**Схема:** `prisma/schema.prisma`

**Основные таблицы:**
- `User` - Пользователи Telegram бота
- `UserSettings` - Настройки пользователей
- `Subscription` - Подписки на вакансии
- `Vacancy` - Вакансии (унифицированный формат)
- `ParseLog` - Логи парсинга

---

## 📊 Схема базы данных

### Диаграмма связей

```
┌──────────────┐
│     User     │
├──────────────┤
│ id           │◄─────┐
│ telegramId   │      │
│ username     │      │
│ firstName    │      │
│ lastName     │      │
└──────────────┘      │
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        │              │              │
┌───────▼──────┐ ┌─────▼─────────┐   │
│UserSettings  │ │ Subscription  │   │
├──────────────┤ ├───────────────┤   │
│ userId (FK)  │ │ userId (FK)   │   │
│ language     │ │ filters       │   │
│ notif...     │ │ sources[]     │   │
└──────────────┘ │ isActive      │   │
                 └───────────────┘   │
                                      │
┌─────────────┐                      │
│  Vacancy    │                      │
├─────────────┤                      │
│ id          │                      │
│ title       │                      │
│ company     │                      │
│ salaryMin   │                      │
│ salaryMax   │                      │
│ source      │                      │
│ ...         │                      │
└─────────────┘                      │
                                      │
┌─────────────┐                      │
│  ParseLog   │                      │
├─────────────┤                      │
│ source      │                      │
│ status      │                      │
│ vacancies...│                      │
└─────────────┘                      │
```

---

## 📋 Таблицы

### User - Пользователи

Хранит информацию о пользователях Telegram бота.

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | String (cuid) | Уникальный ID |
| `telegramId` | BigInt | Telegram user ID (уникальный) |
| `username` | String? | Telegram username |
| `firstName` | String? | Имя |
| `lastName` | String? | Фамилия |
| `createdAt` | DateTime | Дата регистрации |
| `updatedAt` | DateTime | Дата обновления |

**Связи:**
- `subscriptions[]` - Подписки пользователя
- `settings` - Настройки пользователя

**Пример:**
```typescript
const user = await prisma.user.create({
  data: {
    telegramId: 123456789n, // BigInt для больших ID
    username: 'johndoe',
    firstName: 'John',
    lastName: 'Doe'
  }
});
```

---

### UserSettings - Настройки пользователей

Персональные настройки каждого пользователя.

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | String (cuid) | Уникальный ID |
| `userId` | String | FK на User |
| `language` | String | Язык интерфейса ("ru", "ro", "en") |
| `notificationsOn` | Boolean | Включены ли уведомления |
| `maxNotifications` | Int | Макс. уведомлений в день |

**По умолчанию:**
- `language`: "ru"
- `notificationsOn`: true
- `maxNotifications`: 10

**Пример:**
```typescript
const settings = await prisma.userSettings.create({
  data: {
    userId: user.id,
    language: 'ru',
    notificationsOn: true,
    maxNotifications: 5
  }
});
```

---

### Subscription - Подписки на вакансии

Подписки пользователей на определенные вакансии.

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | String (cuid) | Уникальный ID |
| `userId` | String | FK на User |
| `isActive` | Boolean | Активна ли подписка |
| `filters` | Json | Фильтры поиска |
| `sources` | String[] | Источники вакансий |
| `lastNotified` | DateTime? | Время последнего уведомления |
| `createdAt` | DateTime | Дата создания |
| `updatedAt` | DateTime | Дата обновления |

**Формат filters (JSON):**
```json
{
  "keywords": ["nodejs", "javascript"],
  "locations": ["chisinau"],
  "salaryMin": 1000,
  "experience": ["between_1_and_3", "between_3_and_6"],
  "schedule": ["remote", "hybrid"]
}
```

**Пример:**
```typescript
const subscription = await prisma.subscription.create({
  data: {
    userId: user.id,
    isActive: true,
    filters: {
      keywords: ['nodejs', 'javascript'],
      salaryMin: 1000,
      locations: ['chisinau']
    },
    sources: ['rabota.md', '999.md']
  }
});
```

---

### Vacancy - Вакансии

Унифицированное хранилище всех вакансий.

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | String (cuid) | Уникальный ID |
| `title` | String | Название вакансии |
| `company` | String | Компания |
| `description` | Text | Описание |
| `location` | String? | Локация |
| `salaryMin` | Int? | Мин. зарплата |
| `salaryMax` | Int? | Макс. зарплата |
| `salaryCurrency` | String? | Валюта (USD, EUR, MDL) |
| `experience` | String? | Опыт работы |
| `employment` | String? | Тип занятости |
| `schedule` | String? | График работы |
| `skills` | String[] | Навыки |
| `source` | String | Источник (rabota.md, 999.md, etc) |
| `sourceId` | String | ID на сайте-источнике |
| `sourceUrl` | String | Ссылка на вакансию |
| `publishedAt` | DateTime | Дата публикации |
| `rawData` | Json | Сырые данные источника |
| `createdAt` | DateTime | Дата добавления в БД |
| `updatedAt` | DateTime | Дата обновления |

**Уникальные индексы:**
- `(source, sourceId)` - предотвращает дубликаты

**Индексы для поиска:**
- `source, publishedAt`
- `location`
- `salaryMin, salaryMax`

**Возможные значения `experience`:**
- `no_experience`
- `between_1_and_3`
- `between_3_and_6`
- `more_than_6`

**Возможные значения `schedule`:**
- `remote` - Удаленная работа
- `office` - Офис
- `hybrid` - Гибрид
- `flexible` - Гибкий график

**Пример:**
```typescript
const vacancy = await prisma.vacancy.create({
  data: {
    title: 'Node.js Developer',
    company: 'Tech Corp',
    description: 'Looking for experienced developer...',
    location: 'Chișinău',
    salaryMin: 1200,
    salaryMax: 2000,
    salaryCurrency: 'USD',
    experience: 'between_3_and_6',
    employment: 'full',
    schedule: 'remote',
    skills: ['Node.js', 'PostgreSQL', 'Docker'],
    source: 'rabota.md',
    sourceId: '12345',
    sourceUrl: 'https://www.rabota.md/...',
    publishedAt: new Date(),
    rawData: { /* дополнительные данные */ }
  }
});
```

---

### ParseLog - Логи парсинга

История всех запусков парсинга.

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | String (cuid) | Уникальный ID |
| `source` | String | Источник парсинга |
| `status` | String | Статус (success, error, partial) |
| `vacanciesFound` | Int | Всего найдено |
| `vacanciesNew` | Int | Новых вакансий |
| `duration` | Int | Длительность (мс) |
| `error` | Text? | Текст ошибки |
| `createdAt` | DateTime | Время запуска |

**Индексы:**
- `(source, createdAt)` - для выборки истории по источнику

**Пример:**
```typescript
const log = await prisma.parseLog.create({
  data: {
    source: 'rabota.md',
    status: 'success',
    vacanciesFound: 250,
    vacanciesNew: 12,
    duration: 45000, // 45 секунд
  }
});
```

---

## 🔧 Работа с Prisma

### Prisma Client

```typescript
import { prisma } from './src/db/index.js';

// Создать
const user = await prisma.user.create({
  data: { telegramId: 123n, firstName: 'John' }
});

// Найти
const user = await prisma.user.findUnique({
  where: { telegramId: 123n }
});

// Обновить
await prisma.user.update({
  where: { id: user.id },
  data: { firstName: 'Jane' }
});

// Удалить
await prisma.user.delete({
  where: { id: user.id }
});
```

### Связи (Relations)

```typescript
// Создать пользователя с настройками
const user = await prisma.user.create({
  data: {
    telegramId: 123n,
    settings: {
      create: {
        language: 'ru',
        notificationsOn: true
      }
    }
  },
  include: { settings: true }
});

// Получить пользователя со всеми подписками
const user = await prisma.user.findUnique({
  where: { id: userId },
  include: {
    subscriptions: true,
    settings: true
  }
});
```

### Фильтрация

```typescript
// Вакансии с зарплатой >= 1000 USD
const vacancies = await prisma.vacancy.findMany({
  where: {
    salaryMin: { gte: 1000 },
    salaryCurrency: 'USD'
  }
});

// Вакансии с ключевыми словами (OR)
const vacancies = await prisma.vacancy.findMany({
  where: {
    OR: [
      { title: { contains: 'nodejs', mode: 'insensitive' } },
      { description: { contains: 'nodejs', mode: 'insensitive' } }
    ]
  }
});

// Удаленная работа в Кишиневе
const vacancies = await prisma.vacancy.findMany({
  where: {
    location: 'Chișinău',
    schedule: 'remote'
  }
});
```

### Upsert (создать или обновить)

```typescript
// Используется в парсерах для избежания дубликатов
const vacancy = await prisma.vacancy.upsert({
  where: {
    source_sourceId: {
      source: 'rabota.md',
      sourceId: '12345'
    }
  },
  create: { /* данные для создания */ },
  update: { /* данные для обновления */ }
});
```

---

## 🔄 Миграции

### Создать миграцию

После изменения `schema.prisma`:

```bash
npm run db:migrate
# Или
npx prisma migrate dev --name название_изменения
```

**Примеры названий:**
- `init` - начальная миграция
- `add_skills_field` - добавлено поле skills
- `create_subscription_table` - создана таблица подписок

### Применить миграции (production)

```bash
npx prisma migrate deploy
```

### Откатить последнюю миграцию

```bash
npx prisma migrate resolve --rolled-back название_миграции
```

### Сбросить БД (осторожно!)

```bash
npx prisma migrate reset
# Удалит ВСЕ данные и применит миграции заново
```

---

## 💻 Полезные запросы

### Статистика по источникам

```typescript
const stats = await prisma.vacancy.groupBy({
  by: ['source'],
  _count: {
    id: true
  },
  _avg: {
    salaryMin: true
  }
});

// Результат:
// [
//   { source: 'rabota.md', _count: { id: 1250 }, _avg: { salaryMin: 850 } },
//   { source: '999.md', _count: { id: 890 }, _avg: { salaryMin: 920 } }
// ]
```

### Топ компаний по количеству вакансий

```typescript
const topCompanies = await prisma.vacancy.groupBy({
  by: ['company'],
  _count: {
    id: true
  },
  orderBy: {
    _count: {
      id: 'desc'
    }
  },
  take: 10
});
```

### Вакансии за последние 7 дней

```typescript
const weekAgo = new Date();
weekAgo.setDate(weekAgo.getDate() - 7);

const recentVacancies = await prisma.vacancy.findMany({
  where: {
    publishedAt: {
      gte: weekAgo
    }
  },
  orderBy: {
    publishedAt: 'desc'
  }
});
```

### Удалить старые вакансии (> 30 дней)

```typescript
const monthAgo = new Date();
monthAgo.setDate(monthAgo.getDate() - 30);

const deleted = await prisma.vacancy.deleteMany({
  where: {
    publishedAt: {
      lt: monthAgo
    }
  }
});

console.log(`Удалено ${deleted.count} вакансий`);
```

### Активные подписки с пользователями

```typescript
const activeSubscriptions = await prisma.subscription.findMany({
  where: {
    isActive: true
  },
  include: {
    user: {
      select: {
        telegramId: true,
        firstName: true,
        username: true
      }
    }
  }
});
```

---

## 🎨 Prisma Studio

Визуальный редактор БД:

```bash
npm run db:studio
```

Откроется в браузере: `http://localhost:5555`

**Возможности:**
- Просмотр всех таблиц
- Редактирование записей
- Фильтрация и сортировка
- Добавление/удаление записей

---

## 🔍 Отладка

### Включить SQL логи

```typescript
// В db/client.ts
export const prisma = new PrismaClient({
  log: ['query', 'error', 'warn']
});
```

### Посмотреть сгенерированный SQL

```typescript
const vacancies = await prisma.vacancy.findMany({
  where: { source: 'rabota.md' }
});

// В консоли появится:
// SELECT * FROM "Vacancy" WHERE "source" = 'rabota.md'
```

---

## 🎯 Best Practices

### 1. Используй транзакции для связанных операций

```typescript
await prisma.$transaction(async (tx) => {
  const user = await tx.user.create({ data: { ... } });
  await tx.userSettings.create({ data: { userId: user.id, ... } });
});
```

### 2. Всегда закрывай соединение

```typescript
try {
  // операции с БД
} finally {
  await prisma.$disconnect();
}
```

### 3. Используй select для оптимизации

```typescript
// ❌ Плохо: загружает все поля
const users = await prisma.user.findMany();

// ✅ Хорошо: только нужные поля
const users = await prisma.user.findMany({
  select: {
    id: true,
    telegramId: true,
    firstName: true
  }
});
```

### 4. Индексы для часто используемых фильтров

```prisma
model Vacancy {
  // ...
  
  @@index([source, publishedAt])  // Для сортировки по дате
  @@index([location])              // Для поиска по локации
  @@index([salaryMin, salaryMax])  // Для фильтра по зарплате
}
```

---

📖 **Читай далее:**
- [Документация по API](./API.md)
- [Документация по Worker](./WORKER.md)
- [Prisma Documentation](https://www.prisma.io/docs)
