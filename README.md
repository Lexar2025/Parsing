# Rabota.md Parser - Парсер вакансий

Многофункциональный парсер вакансий для различных сайтов с работой в Молдове.

## 🚀 Быстрый старт

### Установка зависимостей
```bash
npm install
```

### Сборка проекта
```bash
npm run build
```

### Запуск парсинга
```bash
# Для rabota.md
npm run parse rabota.md

# Для 999.md
npm run parse 999.md

# Для makler.md
npm run parse makler.md
```

## 📋 Доступные команды

### Основные команды
- `npm run build` - Сборка проекта
- `npm run parse <site>` - Парсинг конкретного сайта
- `npm run manage` - Управление базой вакансий
- `npm test` - Запуск тестов

### Команды разработки
- `npm run build:watch` - Сборка с автоматическим обновлением
- `npm run lint` - Проверка кода
- `npm run prettier` - Форматирование кода
- `npm run test:watch` - Тесты в режиме watch

## 🌐 Поддерживаемые сайты

```
┌─────────────────┬──────────────┬────────────────┬──────────────┐
│      Сайт       │   Технология │   Особенности  │    Статус    │
├─────────────────┼──────────────┼────────────────┼──────────────┤
│   rabota.md     │  Puppeteer   │ JS рендеринг   │      ✅      │
│     999.md      │ HTTP/Cheerio │ Быстрый парсинг│      ✅      │
│   makler.md     │ HTTP + Retry │ Антибот защита │   ✅ (fixed)  │
└─────────────────┴──────────────┴────────────────┴──────────────┘
```

### 1. rabota.md
**Парсер:** `RabotaMdParser` (Puppeteer)
- ✅ Поддержка JavaScript-рендеринга
- ✅ Парсинг деталей вакансий
- ✅ Кэширование результатов
- ✅ Управление дубликатами

**Пример использования:**
```bash
npm run parse rabota.md
```

**Настройки в parse.js:**
```javascript
searchQuery: 'Программирование',
maxPages: 10,
delay: 2000,
```

### 2. 999.md
**Парсер:** `NineNineNineMdParser` (HTTP/Cheerio)
- ✅ Быстрый HTTP парсинг
- ✅ Поддержка категорий
- ✅ Парсинг деталей
- ✅ Кэширование

**Пример использования:**
```bash
npm run parse 999.md
```

### 3. makler.md
**Парсер:** `MaklerMdParser` (HTTP с антибот защитой)
- ✅ Обход HTTP 418 защиты
- ✅ Retry логика
- ✅ Случайные задержки
- ✅ Профессиональные фильтры

**⚠️ Особенности:**
Сайт использует антибот защиту. См. [MAKLER_FIX.md](./MAKLER_FIX.md) для решения проблем.

**Пример использования:**
```bash
npm run parse makler.md
```

**Доступные профессии:**
```javascript
'Программисты': 2869,
'Backend': 2870,
'Frontend': 2871,
'Системные администраторы': 2872,
// ... и другие (см. src/parsers/maklerMd.ts)
```

## 📁 Структура проекта

```
Parsing/
├── src/
│   ├── parsers/              # Парсеры для различных сайтов
│   │   ├── rabotaMd.ts       # rabota.md (Puppeteer)
│   │   ├── 999Md.ts          # 999.md (HTTP)
│   │   └── maklerMd.ts       # makler.md (HTTP с защитой)
│   ├── types/                # TypeScript типы
│   │   └── vacancy.ts        # Интерфейсы Vacancy, Parser
│   ├── utils/                # Вспомогательные функции
│   │   └── helpers.ts        # log(), pause(), и др.
│   ├── parse.js              # Главный скрипт парсинга
│   └── manageVacancies.js    # Управление вакансиями
├── cache/                    # Кэш деталей вакансий
│   ├── rabota-md/
│   ├── 999-md/
│   └── makler-md/
├── build/                    # Скомпилированный код
├── vacancies_*.json          # Результаты парсинга
├── test-*.js                 # Тестовые скрипты
├── README.md                 # Основная документация
├── SUMMARY.md                # Краткое резюме изменений
├── MAKLER_FIX.md             # Решение проблем makler.md
├── NEXT_STEPS.md             # Пошаговые инструкции
└── CHEATSHEET.md             # Шпаргалка команд
```

## 🏗️ Архитектура

```
┌─────────────────────────────────────────────────────────────┐
│                         parse.js                             │
│                   (Главная точка входа)                      │
└──────────────────┬──────────────────────────────────────────┘
                   │
       ┌───────────┼───────────┐
       │           │           │
       ▼           ▼           ▼
┌──────────┐ ┌──────────┐ ┌──────────┐
│ Rabota   │ │   999    │ │ Makler   │
│   .md    │ │   .md    │ │   .md    │
│  Parser  │ │  Parser  │ │  Parser  │
└────┬─────┘ └────┬─────┘ └────┬─────┘
     │            │            │
     │ Puppeteer  │ HTTP/      │ HTTP +
     │            │ Cheerio    │ Retry
     │            │            │
     ▼            ▼            ▼
┌─────────────────────────────────────┐
│         Website Parsing             │
│    (HTML → Vacancy Objects)         │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│         Cache System                │
│    (Деталей вакансий TTL 24h)       │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│      vacancies_*.json               │
│   (Результаты парсинга)             │
└─────────────────────────────────────┘
```

## 🔧 Настройка парсинга

### Конфигурация в parse.js

```javascript
const configs = {
  'rabota.md': {
    parser: new RabotaMdParser({
      headless: true,          // Без UI браузера
      cacheEnabled: true,      # Кэширование деталей
      cacheTTLSeconds: 86400,  // 24 часа
    }),
    config: {
      searchQuery: 'Программирование',
      maxPages: 10,
      delay: 2000,
    },
  },
  // ...
};
```

### ParserConfig опции

```typescript
interface ParserConfig {
  searchQuery?: string;    // Поисковый запрос или профессия
  maxPages?: number;       // Максимум страниц (default: 10)
  delay?: number;          // Задержка между запросами (мс)
  category?: string;       // Категория (для 999.md)
}
```

### ParserOptions опции

```typescript
interface ParserOptions {
  headless?: boolean;       // Режим браузера (только Puppeteer)
  concurrency?: number;     // Параллельных запросов (default: 3)
  cacheEnabled?: boolean;   // Включить кэш (default: true)
  cacheDir?: string;        // Директория кэша
  cacheTTLSeconds?: number; // Время жизни кэша (default: 86400)
  parseDetails?: boolean;   // Парсить детали (default: true)
}
```

## 📊 Формат результатов

### Vacancy объект

```typescript
interface Vacancy {
  id: string;
  title: string;
  description?: string;
  salary?: string;
  location?: string;
  company?: string;
  url: string;
  publishedAt?: Date;
  expiresAt?: Date;
  contactPerson?: string;
  phone?: string;
  email?: string;
  source: string;        // 'rabota.md' | '999.md' | 'makler.md'
  isActive: boolean;
  foundAt: Date;
  lastChecked: Date;
}
```

### Файл результатов (vacancies_*.json)

```json
{
  "vacancies": [...],
  "stats": {
    "total": 150,
    "active": 145,
    "inactive": 5,
    "sources": {
      "rabota.md": 50,
      "999.md": 60,
      "makler.md": 40
    },
    "byCategory": {...},
    "newVacancies": 10
  }
}
```

## 🐛 Отладка и решение проблем

### makler.md возвращает HTTP 418

Это антибот защита. См. подробное руководство: [MAKLER_FIX.md](./MAKLER_FIX.md)

**Быстрое решение:**
```bash
# Тестируем разные заголовки
node test-makler-headers.js

# Тестируем с Puppeteer
node test-makler-puppeteer.js

# После успеха - пересобираем и парсим
npm run build
npm run parse makler.md
```

### Puppeteer ошибки

**Проблема:** Chromium не установлен
```bash
# Windows
npx puppeteer browsers install chrome

# Linux
sudo apt-get install chromium-browser
```

**Проблема:** Timeout ошибки
Увеличьте timeout в коде:
```typescript
await page.goto(url, { 
  waitUntil: 'networkidle2', 
  timeout: 60000  // 60 секунд
});
```

### Нет вакансий в результатах

1. Проверьте селекторы (могли измениться)
2. Запустите с `headless: false` для отладки
3. Проверьте, не блокирует ли сайт
4. Увеличьте задержки между запросами

## 🧪 Тестирование

### Запуск всех тестов
```bash
npm test
```

### Запуск с покрытием
```bash
npm run test:coverage
```

### Тестирование конкретного парсера
```bash
# Тест Puppeteer
npm run test:puppeteer

# Тест makler.md
node test-makler-headers.js
node test-makler-puppeteer.js
```

## 📦 Зависимости

### Основные
- `puppeteer` - Управление браузером
- `axios` - HTTP запросы
- `cheerio` - HTML парсинг
- `jsdom` - DOM манипуляции
- `p-limit` - Контроль concurrency

### Разработка
- `typescript` - Типизация
- `vitest` - Тестирование
- `eslint` - Линтинг
- `prettier` - Форматирование

## 🔄 Workflow

### Типичный процесс работы

1. **Разработка нового парсера:**
```bash
# Создайте файл src/parsers/newsite.ts
# Реализуйте Parser interface
# Добавьте в src/parse.js
```

2. **Тестирование:**
```bash
npm run build
npm run parse newsite
```

3. **Отладка:**
```bash
# Если не работает - создайте тестовый скрипт
# test-newsite.js для отладки
node test-newsite.js
```

4. **Проверка качества:**
```bash
npm run lint
npm run prettier
npm test
```

## 📝 Лицензия

Apache-2.0

## 👨‍💻 Разработка

### Добавление нового сайта

1. Создайте парсер в `src/parsers/yoursite.ts`
2. Реализуйте интерфейс `Parser`
3. Добавьте конфигурацию в `src/parse.js`
4. Создайте тесты
5. Обновите документацию

### Структура парсера

```typescript
export class YourSiteParser implements Parser {
  async parse(config: ParserConfig): Promise<ParseResult> {
    // Ваша логика
  }
}
```

## 🤝 Вклад

Pull requests приветствуются! Для больших изменений сначала откройте issue.

## 📞 Поддержка

При возникновении проблем:
1. Проверьте документацию
2. Посмотрите существующие issues
3. Создайте новый issue с подробным описанием
