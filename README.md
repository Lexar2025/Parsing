# Парсер Вакансий для Rabota.md

Проект для парсинга вакансий с сайта rabota.md и других job-порталов.

## Установка

```bash
npm install
```

## Структура проекта

```
Parsing/
├── src/                      # Исходный код
│   ├── main.ts              # Точка входа для тестирования
│   ├── parsers/             # Парсеры для разных сайтов
│   │   └── rabotaMd.ts     # Парсер для rabota.md
│   ├── types/              # TypeScript типы
│   │   └── vacancy.ts      # Типы для вакансий
│   └── utils/              # Утилиты
│       └── helpers.ts      # Вспомогательные функции
├── __tests__/              # Тесты
│   ├── unit/              
│   │   └── helpers.test.ts
│   └── vitest.config.ts
├── build/                  # Скомпилированный код (создается при сборке)
└── node-typescript-boilerplate-main/  # Исходный шаблон (для справки)
```

## Запуск

### Режим разработки
```bash
npm run build:watch   # Компиляция с отслеживанием изменений
npm start            # Запуск скомпилированного кода
```

### Или просто:
```bash
npm run build && npm start
```

### Тестирование
```bash
npm test              # Запуск тестов
npm run test:coverage # Тесты с покрытием
npm run test:watch    # Тесты в watch режиме
```

### Проверка кода
```bash
npm run lint          # Проверка ESLint
npm run prettier      # Форматирование кода
```

## Использование

```typescript
import { RabotaMdParser } from './parsers/rabotaMd.js';

const parser = new RabotaMdParser();

const result = await parser.parse({
  baseUrl: 'https://www.rabota.md',
  searchQuery: 'программист',
  maxPages: 1,
});

console.log(`Найдено вакансий: ${result.vacancies.length}`);
```

## Следующие шаги

1. ✅ Базовая структура проекта
2. ✅ Парсер rabota.md (базовая версия)
3. ⏳ Тестирование на реальном сайте
4. ⏳ Уточнение CSS селекторов
5. ⏳ Добавление пагинации
6. ⏳ Интеграция с Telegram ботом
7. ⏳ Добавление других сайтов (hh.ru, и т.д.)
8. ⏳ База данных для хранения вакансий

## Зависимости

- **axios** - HTTP клиент для запросов
- **cheerio** - jQuery-подобный парсинг HTML
- **typescript** - TypeScript компилятор
- **vitest** - Быстрый фреймворк для тестирования
- **eslint** - Линтер для проверки кода
- **prettier** - Форматирование кода
