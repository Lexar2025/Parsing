# 🗄️ Database Documentation

## 📖 Содержание

- [Обзор](#обзор)
- [Схема базы данных](#схема-базы-данных)
- [Таблицы](#таблицы)
- [Работа с Prisma](#работа-с-prisma)
- [Миграции](#миграции)
- [Полезные запросы](#полезные-запросы)
- [Производительность и оптимизация](#производительность-и-оптимизация)

---

## 🎯 Обзор

**База данных:** PostgreSQL 15+  
**ORM:** Prisma 5.0+  
**Схема:** `prisma/schema.prisma`

**Основные таблицы:**
- ✅ `User` - Пользователи Telegram бота
- ✅ `UserSettings` - Настройки пользователей (обновлено)
- ✅ `Subscription` - Подписки на вакансии
- ✅ `Vacancy` - Вакансии (унифицированный формат, добавлены поля для семантики)
- ✅ `ParseLog` - Логи парсинга
- ✅ `ProfessionDictionary` - Словарь профессий (новое)
- ✅ `CrossSourceMapping` - Маппинг профессий между источниками (новое)
- ✅ `ProfessionSynonyms` - Синонимы профессий для поиска (новое)

**Статистика (текущее состояние):**
- 📁 **Таблиц:** 8
- 🔗 **Индексы:** 24+
- 📊 **Записей в продакшене:** 50,000+ (вакансии), 5,000+ (пользователи)

---

## 📊 Схема базы данных

### Полная диаграмма связей

```
┌──────────────┐
│     User     │
├──────────────┤
│ id           │◄───────┐
│ telegramId   │        │
│ username     │        │
│ firstName    │        │
│ lastName     │        │
│ createdAt    │        │
│ updatedAt    │        │
└──────────────┘        │
                        │
        ┌───────────────┼──────────────────┐
        │               │                  │
        │               │                  │
┌───────▼───────┐ ┌─────▼───────────┐    │
│UserSettings   │ │ Subscription     │    │
├───────────────┤ ├──────────────────┤    │
│ userId (FK)   │ │ userId (FK)      │    │
│ language      │ │ filters          │    │
│ notificationsOn│ │ sources[]        │    │
│ maxNotifications│ │ isActive         │    │
│ notificationCooldown│ │ lastNotified     │    │
│ maxNotificationsPerBatch│ │ lastChecked     │    │
│ updatedAt     │ │ createdAt        │    │
└───────────────┘ │ updatedAt        │    │
                  └──────────────────┘    │
                                          │
┌────────────────┐                       │
│   Vacancy      │                       │
├────────────────┤                       │
│ id             │                       │
│ title          │                       │
│ company        │                       │
│ description    │                       │
│ location       │                       │
│ salaryMin      │                       │
│ salaryMax      │                       │
│ salaryCurrency │                       │
│ experience     │                       │
│ employment     │                       │
│ schedule       │                       │
│ skills         │                       │
│ source         │                       │
│ sourceId       │                       │
│ sourceUrl      │                       │
│ publishedAt    │                       │
│ normalizedTitle│                       │
│ semanticScore  │                       │
│ rawData        │                       │
│ createdAt      │                       │
│ updatedAt      │                       │
└────────────────┘                       │
        ▲                                 │
        │                                 │
┌───────┴────────┐                        │
│  ParseLog      │                        │
├────────────────┤                        │
│ id             │                        │
│ source         │                        │
│ status         │                        │
│ vacanciesFound │                        │
│ vacanciesNew   │                        │
│ vacanciesUpdated│                        │
│ duration       │                        │
│ error          │                        │
│ searchQuery    │                        │
│ createdAt      │                        │
└────────────────┘                        │
                                          │
┌─────────────────────────────────────────┼─────────────────────────────────────┐
│        Словари профессий                │                                     │
└─────────────────────────────────────────┼─────────────────────────────────────┘
                                          │
┌──────────────────────┐    ┌─────────────┴──────────────┐    ┌──────────────────┐
│ProfessionDictionary  │    │    CrossSourceMapping      │    │ProfessionSynonyms │
├──────────────────────┤    ├────────────────────────────┤    ├──────────────────┤
│ id                   │    │ id                         │    │ id               │
│ source               │    │ sourceProfessionId (FK)    │    │ normalizedProfession│
│ originalProfession   │    │ targetProfessionId (FK)    │    │ synonyms[]       │
│ normalizedProfession │    │ mappingScore               │    │ createdAt        │
│ normalizedKeywords[] │    │ confidence                 │    │ updatedAt        │
│ similarityScore      │    │ createdAt                  │    └──────────────────┘
│ count                │    │ updatedAt                  │             │
│ firstSeen            │    └────────────────────────────┘             │
│ lastSeen             │                                                 │
│ lastUpdated          │                                                 │
└──────────────────────┘                                                 │
        ▲                                                                │
        │                                                                │
        └────────────────────────────────────────────────────────────────┘
```

---

## 📋 Таблицы

### User - Пользователи (обновлено)

Хранит информацию о пользователях Telegram бота.

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | String (cuid) | Уникальный ID |
| `telegramId` | BigInt | Telegram user ID (уникальный, отрицательный для групп) |
| `username` | String? | Telegram username |
| `firstName` | String? | Имя |
| `lastName` | String? | Фамилия |
| `isBot` | Boolean | Является ли пользователь ботом |
| `languageCode` | String? | Язык пользователя из Telegram |
| `createdAt` | DateTime | Дата регистрации |
| `updatedAt` | DateTime | Дата обновления |

**Индексы:**
- `telegramId` (unik) - для быстрого поиска по Telegram ID
- `username` - для поиска по имени пользователя

**Пример:**
```typescript
const user = await prisma.user.upsert({
  where: { telegramId: BigInt(msg.from.id) },
  create: {
    telegramId: BigInt(msg.from.id),
    username: msg.from.username,
    firstName: msg.from.first_name,
    lastName: msg.from.last_name,
    isBot: msg.from.is_bot,
    languageCode: msg.from.language_code
  },
  update: {
    username: msg.from.username,
    firstName: msg.from.first_name,
    lastName: msg.from.last_name,
    isBot: msg.from.is_bot,
    languageCode: msg.from.language_code,
    updatedAt: new Date()
  }
});
```

---

### UserSettings - Настройки пользователей (полностью обновлено)

Персональные настройки каждого пользователя с поддержкой продвинутых возможностей.

| Поле | Тип | Описание | По умолчанию |
|------|-----|----------|--------------|
| `id` | String (cuid) | Уникальный ID | - |
| `userId` | String | FK на User (unik) | - |
| `language` | String | Язык интерфейса ("ru", "ro", "en") | "ru" |
| `notificationsOn` | Boolean | Включены ли уведомления | true |
| `notificationCooldown` | Int | Задержка между уведомлениями (мс) | 7200000 (2 часа) |
| `maxNotificationsPerBatch` | Int | Макс. уведомлений за один раз | 5 |
| `maxNotificationsPerDay` | Int | Макс. уведомлений в день | 20 |
| `semanticSearchEnabled` | Boolean | Включить семантический поиск | true |
| `defaultSources` | String[] | Источники по умолчанию | ["rabota.md", "999.md"] |
| `defaultSalaryCurrency` | String | Валюта по умолчанию | "USD" |
| `updatedAt` | DateTime | Дата обновления | now() |

**Пример:**
```typescript
const settings = await prisma.userSettings.upsert({
  where: { userId: user.id },
  create: {
    userId: user.id,
    language: user.languageCode || 'ru',
    notificationsOn: true,
    notificationCooldown: 7200000, // 2 часа
    maxNotificationsPerBatch: 5,
    maxNotificationsPerDay: 20,
    semanticSearchEnabled: true,
    defaultSources: ['rabota.md', '999.md']
  },
  update: {
    language: user.languageCode || 'ru',
    updatedAt: new Date()
  }
});
```

---

### Subscription - Подписки на вакансии (обновлено)

Подписки пользователей на определенные вакансии с расширенной функциональностью.

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | String (cuid) | Уникальный ID |
| `userId` | String | FK на User |
| `isActive` | Boolean | Активна ли подписка |
| `filters` | Json | Фильтры поиска (расширенный формат) |
| `sources` | String[] | Источники вакансий |
| `lastNotified` | DateTime? | Время последнего уведомления |
| `lastChecked` | DateTime? | Время последней проверки |
| `notificationCount` | Int | Количество отправленных уведомлений |
| `createdAt` | DateTime | Дата создания |
| `updatedAt` | DateTime | Дата обновления |

**Формат filters (JSON) - обновленный:**
```json
{
  "keywords": ["nodejs", "javascript"],
  "locations": ["chisinau", "balti"],
  "salaryMin": 1000,
  "salaryMax": 3000,
  "salaryCurrency": "USD",
  "experience": ["between_1_and_3", "between_3_and_6"],
  "schedule": ["remote", "hybrid"],
  "employment": ["full"],
  "skills": ["typescript", "docker"],
  "excludeKeywords": ["senior", "lead"],
  "useSemanticSearch": true,
  "semanticSimilarity": 0.75
}
```

**Индексы:**
- `(userId, isActive)` - для быстрого поиска активных подписок
- `(lastNotified)` - для поиска подписок, требующих уведомления

**Пример:**
```typescript
const subscription = await prisma.subscription.create({
  data: {
    userId: user.id,
    isActive: true,
    filters: {
      keywords: ['nodejs', 'typescript'],
      salaryMin: 1000,
      locations: ['chisinau'],
      useSemanticSearch: true,
      semanticSimilarity: 0.8
    },
    sources: ['rabota.md', '999.md'],
    lastNotified: null,
    notificationCount: 0
  }
});
```

---

### Vacancy - Вакансии (расширено для семантики)

Унифицированное хранилище всех вакансий с поддержкой семантического поиска.

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | String (cuid) | Уникальный ID |
| `title` | String | Название вакансии (оригинальное) |
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
| **`normalizedTitle`** | String | Нормализованное название для семантики |
| **`semanticScore`** | Float? | Степень соответствия семантическому запросу |
| **`professionIds`** | String[]? | Ссылки на ProfessionDictionary записи |
| `createdAt` | DateTime | Дата добавления в БД |
| `updatedAt` | DateTime | Дата обновления |

**Уникальные индексы:**
- `(source, sourceId)` - предотвращает дубликаты

**Индексы для поиска:**
- `normalizedTitle` - для семантического поиска
- `source, publishedAt` - для сортировки по дате
- `location` - для поиска по локации
- `salaryMin, salaryMax` - для фильтра по зарплате
- `skills` - для поиска по навыкам
- `professionIds` - для поиска по словарям профессий

**Пример:**
```typescript
const vacancy = await prisma.vacancy.upsert({
  where: { source_sourceId: { source: 'rabota.md', sourceId: '12345' } },
  create: {
    title: 'Программист Node.js',
    company: 'Tech Corp',
    description: 'Looking for experienced developer...',
    location: 'Chișinău',
    salaryMin: 1200,
    salaryMax: 2000,
    salaryCurrency: 'USD',
    experience: 'between_3_and_6',
    employment: 'full',
    schedule: 'remote',
    skills: ['Node.js', 'PostgreSQL', 'Docker', 'TypeScript'],
    source: 'rabota.md',
    sourceId: '12345',
    sourceUrl: 'https://www.rabota.md/...',
    publishedAt: new Date(),
    rawData: { /* дополнительные данные */ },
    normalizedTitle: 'nodejs developer',
    professionIds: ['clx123...', 'cly456...'] // Ссылки на ProfessionDictionary
  },
  update: {
    title: 'Программист Node.js',
    company: 'Tech Corp',
    description: 'Looking for experienced developer...',
    normalizedTitle: 'nodejs developer',
    updatedAt: new Date()
  }
});
```

---

### ParseLog - Логи парсинга (обновлено)

История всех запусков парсинга с детальной статистикой.

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | String (cuid) | Уникальный ID |
| `source` | String | Источник парсинга |
| `status` | String | Статус (success, error, partial, timeout) |
| `vacanciesFound` | Int | Всего найдено |
| `vacanciesNew` | Int | Новых вакансий |
| **`vacanciesUpdated`** | Int | Обновленных вакансий |
| `duration` | Int | Длительность (мс) |
| `error` | Text? | Текст ошибки |
| **`searchQuery`** | String? | Поисковый запрос |
| **`pagesProcessed`** | Int | Количество обработанных страниц |
| **`successRate`** | Float | Процент успешных парсингов |
| `createdAt` | DateTime | Время запуска |

**Индексы:**
- `(source, createdAt)` - для выборки истории по источнику
- `(status)` - для анализа ошибок
- `(createdAt)` - для хронологического порядка

**Пример:**
```typescript
const log = await prisma.parseLog.create({
  data: {
    source: 'rabota.md',
    status: 'success',
    vacanciesFound: 250,
    vacanciesNew: 12,
    vacanciesUpdated: 45,
    duration: 45000, // 45 секунд
    searchQuery: 'it',
    pagesProcessed: 5,
    successRate: 0.98
  }
});
```

---

### ProfessionDictionary - Словарь профессий (новое)

Нормализованные названия профессий для семантического поиска.

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | String (cuid) | Уникальный ID |
| `source` | String | Источник (rabota.md, 999.md, makler.md) |
| `originalProfession` | String | Оригинальное название из источника |
| `normalizedProfession` | String | Нормализованное название для поиска |
| `normalizedKeywords` | String[] | Ключевые слова для поиска |
| `similarityScore` | Float | Точность маппинга (0.0 - 1.0) |
| `count` | Int | Количество встреч в вакансиях |
| `avgSalaryMin` | Float? | Средняя минимальная зарплата |
| `avgSalaryMax` | Float? | Средняя максимальная зарплата |
| `commonSkills` | String[] | Частые навыки для этой профессии |
| `firstSeen` | DateTime | Когда впервые встретилась |
| `lastSeen` | DateTime | Когда последний раз встречалась |
| `lastUpdated` | DateTime | Когда последний раз обновлялась |

**Уникальные индексы:**
- `(source, originalProfession)` - уникальность для источника

**Индексы:**
- `normalizedProfession` - для быстрого поиска
- `source` - для фильтрации по источникам
- `count` - для сортировки по популярности

**Пример:**
```typescript
const entry = await prisma.professionDictionary.upsert({
  where: {
    source_originalProfession: {
      source: 'rabota.md',
      originalProfession: 'Программист Node.js'
    }
  },
  create: {
    source: 'rabota.md',
    originalProfession: 'Программист Node.js',
    normalizedProfession: 'nodejs developer',
    normalizedKeywords: ['nodejs', 'developer', 'backend', 'javascript'],
    similarityScore: 0.95,
    count: 45,
    avgSalaryMin: 1200,
    avgSalaryMax: 2000,
    commonSkills: ['Node.js', 'TypeScript', 'PostgreSQL', 'Docker']
  },
  update: {
    count: { increment: 1 },
    lastSeen: new Date(),
    avgSalaryMin: 1250, // обновляем среднее
    avgSalaryMax: 2100
  }
});
```

---

### CrossSourceMapping - Маппинг профессий (новое)

Связывает профессии из разных источников для кросс-поиска.

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | String (cuid) | Уникальный ID |
| `sourceProfessionId` | String | ID профессии-источника (FK) |
| `targetProfessionId` | String | ID профессии-цели (FK) |
| `mappingScore` | Float | Точность маппинга (0.0 - 1.0) |
| `confidence` | Float | Уверенность в маппинге (0.0 - 1.0) |
| `createdAt` | DateTime | Дата создания |
| `updatedAt` | DateTime | Дата обновления |

**Уникальные индексы:**
- `(sourceProfessionId, targetProfessionId)` - уникальность пары

**Индексы:**
- `sourceProfessionId` - для поиска всех маппингов для профессии
- `targetProfessionId` - для поиска всех источников для профессии
- `mappingScore` - для сортировки по точности

**Пример:**
```typescript
const mapping = await prisma.crossSourceMapping.create({
  data: {
    sourceProfessionId: 'clx123...', // "Программист Node.js" (rabota.md)
    targetProfessionId: 'cly456...', // "Разработчик NodeJS" (999.md)
    mappingScore: 0.88,
    confidence: 0.91
  }
});

// Получение всех маппингов для профессии
const mappings = await prisma.crossSourceMapping.findMany({
  where: { sourceProfessionId: 'clx123...' },
  include: {
    targetProfession: {
      select: {
        originalProfession: true,
        source: true,
        normalizedProfession: true
      }
    }
  },
  orderBy: { mappingScore: 'desc' }
});
```

---

### ProfessionSynonyms - Синонимы профессий (новое)

Синонимы для улучшения семантического поиска и обработки запросов.

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | String (cuid) | Уникальный ID |
| `normalizedProfession` | String | Нормализованное название (unik) |
| `synonyms` | String[] | Список синонимов для поиска |
| `createdAt` | DateTime | Дата создания |
| `updatedAt` | DateTime | Дата обновления |

**Пример:**
```typescript
const synonyms = await prisma.professionSynonyms.upsert({
  where: { normalizedProfession: 'nodejs developer' },
  create: {
    normalizedProfession: 'nodejs developer',
    synonyms: [
      'node.js developer',
      'node js developer',
      'backend js developer',
      'javascript backend developer',
      'node backend engineer'
    ]
  },
  update: {
    synonyms: [
      'node.js developer',
      'node js developer', 
      'backend js developer',
      'javascript backend developer',
      'node backend engineer',
      'fullstack node developer' // добавлен новый синоним
    ],
    updatedAt: new Date()
  }
});
```

---

## 🔧 Работа с Prisma

### Prisma Client (обновлено)

```typescript
import { prisma } from './src/db/index.js';

// Создать с транзакцией
const userWithSettings = await prisma.$transaction(async (tx) => {
  const user = await tx.user.create({
    data: {
      telegramId: 123456789n,
      username: 'johndoe',
      firstName: 'John',
      lastName: 'Doe'
    }
  });
  
  const settings = await tx.userSettings.create({
    data: {
      userId: user.id,
      language: 'ru',
      notificationsOn: true,
      notificationCooldown: 7200000
    }
  });
  
  return { user, settings };
});

// Найти с включением связанных данных
const user = await prisma.user.findUnique({
  where: { telegramId: 123456789n },
  include: {
    settings: true,
    subscriptions: {
      where: { isActive: true },
      include: { user: { select: { firstName: true } } }
    }
  }
});

// Семантический поиск вакансий
const vacancies = await prisma.vacancy.findMany({
  where: {
    OR: [
      { normalizedTitle: { contains: 'nodejs', mode: 'insensitive' } },
      { skills: { has: 'nodejs' } },
      { professionIds: { hasSome: ['clx123...', 'cly456...'] } } // через словари
    ]
  },
  orderBy: [
    { semanticScore: 'desc' }, // сначала самые релевантные
    { publishedAt: 'desc' }   // потом по дате
  ],
  take: 10
});
```

### Работа со словарями

```typescript
// Найти похожие профессии
const similarProfessions = await prisma.professionDictionary.findMany({
  where: {
    OR: [
      { normalizedProfession: { contains: 'nodejs', mode: 'insensitive' } },
      { normalizedKeywords: { has: 'nodejs' } }
    ],
    similarityScore: { gte: 0.7 }
  },
  orderBy: { similarityScore: 'desc' },
  take: 5
});

// Получить кросс-маппинг для профессии
const mappings = await prisma.crossSourceMapping.findMany({
  where: { sourceProfessionId: professionId },
  include: {
    targetProfession: {
      select: {
        id: true,
        source: true,
        originalProfession: true,
        normalizedProfession: true
      }
    }
  },
  orderBy: { mappingScore: 'desc' }
});

// Поиск вакансий через словари
const targetProfessions = ['nodejs developer', 'backend developer'];
const professionIds = await prisma.professionDictionary.findMany({
  where: { normalizedProfession: { in: targetProfessions } },
  select: { id: true }
});

const vacancies = await prisma.vacancy.findMany({
  where: {
    professionIds: { hasSome: professionIds.map(p => p.id) },
    salaryMin: { gte: 1000 }
  },
  include: {
    sourceProfessions: true // если нужна информация о профессиях
  }
});
```

### Upsert с обновлением статистики

```typescript
// Обновление словаря с инкрементом счетчика
const profession = await prisma.professionDictionary.upsert({
  where: {
    source_originalProfession: {
      source: 'rabota.md',
      originalProfession: professionName
    }
  },
  create: {
    source: 'rabota.md',
    originalProfession: professionName,
    normalizedProfession: normalized,
    normalizedKeywords: keywords,
    similarityScore: 0.95,
    count: 1,
    firstSeen: new Date(),
    lastSeen: new Date()
  },
  update: {
    count: { increment: 1 },
    lastSeen: new Date(),
    avgSalaryMin: (currentAvg * currentCount + newSalary) / (currentCount + 1),
    avgSalaryMax: (currentAvgMax * currentCount + newSalaryMax) / (currentCount + 1)
  }
});
```

---

## 🔄 Миграции

### История последних миграций

| Миграция | Дата | Описание |
|----------|------|----------|
| `20260125000000_init` | 25.01.2026 | Начальная схема |
| `20260125120000_add_subscription_table` | 25.01.2026 | Добавлена таблица подписок |
| `20260125140000_add_user_settings` | 25.01.2026 | Добавлены настройки пользователей |
| `20260125160000_add_parse_log_fields` | 25.01.2026 | Расширены поля логов парсинга |
| `20260125180000_add_semantic_search` | 25.01.2026 | **НОВОЕ** Добавлены поля для семантического поиска в Vacancy |
| `20260125200000_create_profession_dictionary` | 25.01.2026 | **НОВОЕ** Создана таблица ProfessionDictionary |
| `20260125220000_create_cross_mapping` | 25.01.2026 | **НОВОЕ** Создана таблица CrossSourceMapping |
| `20260126000000_create_synonyms` | 26.01.2026 | **НОВОЕ** Создана таблица ProfessionSynonyms |
| `20260126020000_add_vacancy_profession_ids` | 26.01.2026 | **НОВОЕ** Добавлено поле professionIds в Vacancy |

### Создать миграцию

После изменения `schema.prisma`:

```bash
# Development (с сбросом данных)
npm run db:migrate
# или
npx prisma migrate dev --name add_semantic_fields

# Production (только применение миграций)
npx prisma migrate deploy
```

**Примеры названий миграций:**
- `add_semantic_fields_to_vacancy` - добавление полей для семантики
- `create_profession_dictionary_tables` - создание таблиц словарей
- `add_notification_cooldown_to_settings` - добавление поля в настройки

### Откатить последнюю миграцию

```bash
# Development
npx prisma migrate dev --name rollback_migration --create-only
# Затем отредактировать файл миграции и применить

# Production (осторожно!)
npx prisma migrate resolve --rolled-back 20260126020000_add_vacancy_profession_ids
```

### Сбросить БД (только для разработки)

```bash
npx prisma migrate reset --force
# Удалит ВСЕ данные и применит все миграции заново
```

---

## 💻 Полезные запросы

### Статистика по словарям профессий

```typescript
const dictionaryStats = await prisma.professionDictionary.groupBy({
  by: ['source', 'normalizedProfession'],
  _count: {
    id: true
  },
  _avg: {
    similarityScore: true,
    avgSalaryMin: true,
    avgSalaryMax: true
  },
  orderBy: {
    _count: { id: 'desc' }
  },
  take: 10
});

// Результат:
// [
//   { 
//     source: 'rabota.md',
//     normalizedProfession: 'nodejs developer',
//     _count: { id: 45 },
//     _avg: { similarityScore: 0.93, avgSalaryMin: 1250, avgSalaryMax: 2100 }
//   },
//   // ...
// ]
```

### Найти вакансии по семантическому запросу

```typescript
// Пользователь ищет "программист джава"
const query = "программист джава";

// 1. Находим похожие профессии в словаре
const similarProfessions = await prisma.professionDictionary.findMany({
  where: {
    OR: [
      { normalizedProfession: { contains: 'java', mode: 'insensitive' } },
      { normalizedKeywords: { hasSome: ['java', 'developer'] } }
    ],
    similarityScore: { gte: 0.7 }
  },
  select: { id: true, normalizedProfession: true, similarityScore: true },
  orderBy: { similarityScore: 'desc' },
  take: 10
});

// 2. Ищем вакансии по этим профессиям
const professionIds = similarProfessions.map(p => p.id);

const vacancies = await prisma.vacancy.findMany({
  where: {
    professionIds: { hasSome: professionIds },
    publishedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // за последний месяц
  },
  include: {
    sourceProfessions: {
      select: {
        originalProfession: true,
        normalizedProfession: true,
        similarityScore: true
      }
    }
  },
  orderBy: [
    { semanticScore: 'desc' }, // релевантность
    { publishedAt: 'desc' }   // свежесть
  ],
  take: 20
});
```

### Аналитика по подпискам и уведомлениям

```typescript
// Статистика по подпискам пользователей
const subscriptionStats = await prisma.subscription.groupBy({
  by: ['userId'],
  _count: {
    id: true // количество подписок
  },
  _sum: {
    notificationCount: true // общее количество уведомлений
  },
  having: {
    notificationCount: { gt: { _sum: 0 } } // только те, кто получал уведомления
  },
  orderBy: {
    _sum: { notificationCount: 'desc' }
  },
  take: 10
});

// Активные подписки, требующие уведомления
const now = new Date();
const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

const subscriptionsToNotify = await prisma.subscription.findMany({
  where: {
    isActive: true,
    OR: [
      { lastNotified: null }, // никогда не уведомляли
      { lastNotified: { lt: twoHoursAgo } } // последнее уведомление было больше 2 часов назад
    ]
  },
  include: {
    user: {
      include: {
        settings: true
      }
    }
  },
  take: 100 // ограничиваем для производительности
});
```

### Обновление словарей на основе новых вакансий

```typescript
// Сбор статистики для обновления словарей
const recentVacancies = await prisma.vacancy.findMany({
  where: {
    publishedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
  },
  select: {
    title: true,
    source: true,
    salaryMin: true,
    salaryMax: true,
    skills: true,
    normalizedTitle: true
  },
  take: 10000
});

// Группировка по профессиям
const professionStats = recentVacancies.reduce((acc, vacancy) => {
  const key = `${vacancy.source}:${vacancy.normalizedTitle}`;
  
  if (!acc[key]) {
    acc[key] = {
      count: 0,
      totalSalaryMin: 0,
      totalSalaryMax: 0,
      skills: new Set<string>()
    };
  }
  
  acc[key].count++;
  if (vacancy.salaryMin) acc[key].totalSalaryMin += vacancy.salaryMin;
  if (vacancy.salaryMax) acc[key].totalSalaryMax += vacancy.salaryMax;
  vacancy.skills?.forEach(skill => acc[key].skills.add(skill));
  
  return acc;
}, {} as Record<string, { count: number; totalSalaryMin: number; totalSalaryMax: number; skills: Set<string> }>);

// Обновление словаря
for (const [key, stats] of Object.entries(professionStats)) {
  const [source, normalizedProfession] = key.split(':');
  
  await prisma.professionDictionary.upsert({
    where: {
      source_originalProfession: {
        source,
        originalProfession: normalizedProfession // для simplicity используем normalized как original
      }
    },
    create: {
      source,
      originalProfession: normalizedProfession,
      normalizedProfession,
      normalizedKeywords: normalizedProfession.split(' '),
      similarityScore: 0.9,
      count: stats.count,
      avgSalaryMin: stats.totalSalaryMin / stats.count,
      avgSalaryMax: stats.totalSalaryMax / stats.count,
      commonSkills: Array.from(stats.skills),
      firstSeen: new Date(),
      lastSeen: new Date()
    },
    update: {
      count: stats.count,
      avgSalaryMin: stats.totalSalaryMin / stats.count,
      avgSalaryMax: stats.totalSalaryMax / stats.count,
      commonSkills: Array.from(stats.skills),
      lastSeen: new Date()
    }
  });
}
```

---

## ⚡ Производительность и оптимизация

### Индексы для высокой производительности

```prisma
model Vacancy {
  // Основные индексы
  @@index([source, sourceId], map: "Vacancy_source_sourceId_idx")
  @@index([publishedAt], map: "Vacancy_publishedAt_idx")
  @@index([location], map: "Vacancy_location_idx")
  @@index([salaryMin, salaryMax], map: "Vacancy_salary_idx")
  
  // Индексы для семантического поиска
  @@index([normalizedTitle], map: "Vacancy_normalizedTitle_idx")
  @@index([professionIds], map: "Vacancy_professionIds_idx")
  @@index([semanticScore, publishedAt], map: "Vacancy_semantic_score_idx")
  
  // Комбинированные индексы для частых запросов
  @@index([source, publishedAt, salaryMin], map: "Vacancy_source_date_salary_idx")
  @@index([location, schedule, experience], map: "Vacancy_location_schedule_idx")
}

model ProfessionDictionary {
  @@index([normalizedProfession], map: "ProfDict_normalized_idx")
  @@index([source, normalizedProfession], map: "ProfDict_source_normalized_idx")
  @@index([similarityScore], map: "ProfDict_similarity_idx")
  @@index([count], map: "ProfDict_count_idx")
}

model Subscription {
  @@index([userId, isActive], map: "Subscription_user_active_idx")
  @@index([lastNotified], map: "Subscription_last_notified_idx")
  @@index([lastChecked], map: "Subscription_last_checked_idx")
}
```

### Оптимизация запросов

**❌ Плохой запрос (N+1 проблема):**
```typescript
const users = await prisma.user.findMany();
for (const user of users) {
  const settings = await prisma.userSettings.findUnique({ // отдельный запрос для КАЖДОГО пользователя
    where: { userId: user.id }
  });
  // ...
}
```

**✅ Хороший запрос (include):**
```typescript
const users = await prisma.user.findMany({
  include: {
    settings: true // все настройки загружаются за один запрос
  }
});
```

**✅ Оптимизированный запрос для семантического поиска:**
```typescript
// Вместо множества запросов к словарям
const searchTerm = 'nodejs developer';
const minSimilarity = 0.7;

// Один запрос для поиска подходящих профессий
const matchingProfessions = await prisma.professionDictionary.findMany({
  where: {
    OR: [
      { normalizedProfession: { contains: searchTerm, mode: 'insensitive' } },
      { normalizedKeywords: { has: searchTerm.split(' ')[0] } }
    ],
    similarityScore: { gte: minSimilarity }
  },
  select: { id: true }
});

const professionIds = matchingProfessions.map(p => p.id);

// Один запрос для поиска вакансий
const vacancies = await prisma.vacancy.findMany({
  where: {
    professionIds: { hasSome: professionIds }
  },
  take: 50,
  orderBy: { publishedAt: 'desc' }
});
```

### Кэширование тяжелых запросов

```typescript
import { cacheService } from './src/api/services/cache.service.js';

async function getPopularProfessions() {
  const cacheKey = 'db:popular_professions';
  
  // Пробуем получить из кэша
  const cached = await cacheService.get(cacheKey);
  if (cached) return JSON.parse(cached);
  
  // Если нет в кэше - делаем запрос
  const stats = await prisma.professionDictionary.findMany({
    where: { count: { gte: 10 } }, // только популярные
    orderBy: { count: 'desc' },
    take: 100,
    select: {
      normalizedProfession: true,
      count: true,
      avgSalaryMin: true,
      avgSalaryMax: true
    }
  });
  
  // Кэшируем результат
  await cacheService.set(cacheKey, JSON.stringify(stats), 3600); // 1 час
  
  return stats;
}
```

### Пакетная обработка

```typescript
// ❌ Плохо: отдельные запросы для каждой вакансии
for (const vacancy of vacancies) {
  await prisma.vacancy.upsert({ /* ... */ });
}

// ✅ Хорошо: пакетная обработка
const batchResults = await prisma.$transaction(
  vacancies.map(vacancy => 
    prisma.vacancy.upsert({
      where: { source_sourceId: { source: vacancy.source, sourceId: vacancy.sourceId } },
      create: vacancy,
      update: vacancy
    })
  )
);

// ✅ Еще лучше: bulk insert/update (Prisma 5.0+)
await prisma.vacancy.createMany({
  data: vacancies.map(v => ({
    ...v,
    id: undefined // Prisma сгенерирует свои ID
  })),
  skipDuplicates: true
});
```

---

## 🎯 Best Practices

### 1. Используй транзакции для связанных операций

```typescript
// Создание пользователя и его данных
await prisma.$transaction(async (tx) => {
  const user = await tx.user.create({ data: { /* ... */ } });
  await tx.userSettings.create({ data: { userId: user.id, /* ... */ } });
  await tx.subscription.create({ data: { userId: user.id, /* ... */ } });
  
  return user;
});
```

### 2. Всегда закрывай соединение

```typescript
async function withPrisma<T>(operation: (prisma: PrismaClient) => Promise<T>): Promise<T> {
  try {
    return await operation(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

// Использование
const users = await withPrisma(async (client) => {
  return client.user.findMany();
});
```

### 3. Используй select и include для оптимизации

```typescript
// ✅ Только нужные поля
const users = await prisma.user.findMany({
  select: {
    id: true,
    telegramId: true,
    firstName: true,
    settings: {
      select: {
        language: true,
        notificationsOn: true
      }
    }
  }
});
```

### 4. Валидация данных перед сохранением

```typescript
function validateVacancyData(data: any) {
  if (!data.title || typeof data.title !== 'string') {
    throw new Error('Title is required and must be a string');
  }
  
  if (data.salaryMin && data.salaryMin < 0) {
    throw new Error('Salary cannot be negative');
  }
  
  if (data.source && !['rabota.md', '999.md', 'makler.md'].includes(data.source)) {
    throw new Error('Invalid source');
  }
}

// Использование
validateVacancyData(vacancyData);
await prisma.vacancy.create({ data: vacancyData });
```

### 5. Резервное копирование и восстановление

```bash
# Создать дамп
pg_dump -h localhost -U postgres vacancy > backup_$(date +%Y%m%d).sql

# Восстановить из дампа
psql -h localhost -U postgres vacancy < backup_20260126.sql

# Prisma seed для тестовых данных
npx prisma db seed
```

---

## 🐛 Troubleshooting

### Общие проблемы и решения

**1. Проблема:** `Unique constraint violation: source_sourceId`

**Решение:** Используй upsert вместо create:
```typescript
await prisma.vacancy.upsert({
  where: { source_sourceId: { source, sourceId } },
  create: { /* ... */ },
  update: { /* ... */ }
});
```

**2. Проблема:** `Query timed out` при сложных запросах

**Решение:** 
- Добавь индексы для часто используемых фильтров
- Разбей запрос на несколько маленьких
- Используй пагинацию

```typescript
// Вместо
const allVacancies = await prisma.vacancy.findMany();

// Используй
let page = 1;
const batchSize = 1000;
let results = [];

do {
  const batch = await prisma.vacancy.findMany({
    skip: (page - 1) * batchSize,
    take: batchSize
  });
  
  results.push(...batch);
  page++;
  
} while (batch.length === batchSize);
```

**3. Проблема:** `Foreign key constraint failed` при удалении

**Решение:** Настрой каскадное удаление в схеме:
```prisma
model User {
  id      String         @id
  // ...
  settings UserSettings?
  
  @@map("users")
}

model UserSettings {
  id      String @id
  userId  String @unique
  user    User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@map("user_settings")
}
```

**4. Проблема:** `Connection refused` к PostgreSQL

**Решение:**
```bash
# Проверить статус PostgreSQL
sudo systemctl status postgresql

# Перезапустить
sudo systemctl restart postgresql

# Проверить логи
sudo tail -f /var/log/postgresql/postgresql-15-main.log
```

**5. Проблема:** `Type mismatch` при работе с BigInt (Telegram ID)

**Решение:** Всегда используй BigInt для Telegram ID:
```typescript
// ❌ Плохо
where: { telegramId: 123456789 }

// ✅ Хорошо  
where: { telegramId: BigInt(123456789) }

// ✅ Лучше - из сообщения Telegram
where: { telegramId: BigInt(msg.from.id) }
```

---

📖 **Читай далее:**
- [Документация по API](./API.md)
- [Документация по Worker](./WORKER.md)
- [Документация по словарям](./PROFESSION_DICTIONARY.md)
- [Prisma Documentation](https://www.prisma.io/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)