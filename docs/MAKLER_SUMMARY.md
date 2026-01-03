# Добавлен парсер Makler.md

## Что было сделано

### ✅ Создан новый парсер

**Файл:** `src/parsers/maklerMd.ts`

Основные особенности:
- HTTP парсинг через axios + JSDOM (быстрый и легковесный)
- Словарь профессий с 90+ категориями
- Поддержка точных фильтров по ID (field_446[])
- Пагинация (page=0, page=1, page=2, ...)
- Парсинг дат публикации в формате "03 Января 05:58"
- Кэширование с TTL 24 часа
- Автоматический поиск по частичному совпадению
- Регистронезависимый поиск

### ✅ Обновлены типы

**Файл:** `src/types/vacancy.ts`
- Добавлен тип источника `'makler.md'`

### ✅ Добавлена конфигурация

**Файл:** `src/config/parsers.ts`
- Добавлена конфигурация для makler.md:
  - baseUrl: https://makler.md
  - defaultCategory: "Программисты"
  - maxPages: 10
  - delay: 1000ms
  - concurrency: 3
  - cacheEnabled: true

### ✅ Интегрирован в систему

**Файл:** `src/parse.ts`
- Добавлен импорт `MaklerMdParser`
- Добавлен case в функцию `getParser()`
- Обновлены типы для поддержки 'makler.md'

### ✅ Создана документация

**Файлы:**
1. `docs/MAKLER_MD_GUIDE.md` - полное руководство
2. `docs/MAKLER_PROFESSIONS.md` - словарь всех профессий
3. `docs/MAKLER_QUICK_START.md` - быстрый старт
4. Обновлен `docs/README.md` - добавлена информация о новом парсере

## Структура словаря профессий

```typescript
export const MAKLER_PROFESSIONS: Record<string, number> = {
  // IT (8 категорий)
  'Программисты': 2869,
  'Backend': 2870,
  'Frontend': 2871,
  // ... и еще 87 профессий
};
```

## Формат URL

```
Базовый:
https://makler.md/transnistria/job/job-offers?list&list=detail

С фильтром:
https://makler.md/transnistria/job/job-offers?list&list=detail&field_446[]=2869

С пагинацией:
https://makler.md/transnistria/job/job-offers?list&list=detail&field_446[]=2869&page=1
```

## HTML структура

```html
<article>
   <div class="ls-detail_time">03 Января 05:58</div>
   <div class="ls-detail_infoBlock">
      <h3 class="ls-detail_antTitle">
         <a href="/ru/job/job-offers/an/588820" class="ls-detail_anUrl">
            Консультант в магазин Vitamin Shop
         </a>
      </h3>
      <div class="subfir">Описание...</div>
      <div class="ls-detail_anData">
           <span id="pointer_icon">Тирасполь</span>
           <span class="phone_icon">373-77-861032</span>
      </div>
   </div>
</article>
```

## Извлекаемые поля

- `id` - из URL (/an/588820 → "588820")
- `title` - заголовок вакансии
- `description` - краткое описание
- `location` - город/регион
- `contactPerson` - телефон
- `publishedAt` - дата публикации (Date объект)
- `url` - полная ссылка
- `source` - всегда "makler.md"

## Использование

```bash
# Все вакансии
npm run parse makler.md

# Конкретная профессия
npm run parse makler.md Программисты
npm run parse makler.md Повар
npm run parse makler.md "Медицинская сестра"

# Управление
npm run manage stats makler_md
npm run manage active makler_md
npm run manage new makler_md
npm run manage cleanup makler_md
```

## Особенности реализации

### 1. Умный поиск профессий
```typescript
private findProfessionId(profession: string): number | null {
  // Точное совпадение
  // Частичное совпадение
  // null если не найдено (парсим все)
}
```

### 2. Парсинг дат
```typescript
private parseDate(dateStr: string | undefined): Date | undefined {
  // "03 Января 05:58" → Date(2026, 0, 3, 5, 58)
  // Автоматически корректирует год если дата в будущем
}
```

### 3. Проверка дубликатов
```typescript
private removeDuplicates(vacancies: Vacancy[]): Vacancy[] {
  // Использует Set для отслеживания ID
  // Гарантирует уникальность результатов
}
```

### 4. Кэширование
```typescript
private async parseVacancyDetailsWithCache(url: string) {
  // MD5 хэш URL как имя файла
  // Проверка TTL
  // Автоматическое обновление
}
```

## Результаты в файле

```json
[
  {
    "id": "588820",
    "title": "Консультант в магазин Vitamin Shop",
    "description": "Требуется консультант в магазин...",
    "location": "Тирасполь",
    "contactPerson": "373-77-861032",
    "publishedAt": "2026-01-03T05:58:00.000Z",
    "url": "https://makler.md/ru/job/job-offers/an/588820",
    "source": "makler.md",
    "firstSeenAt": "2026-01-03T10:00:00.000Z",
    "lastSeenAt": "2026-01-03T10:00:00.000Z",
    "isActive": true
  }
]
```

## Преимущества

✅ **Быстрый** - HTTP запросы без браузера  
✅ **Точный** - словарь с 90+ профессиями  
✅ **Гибкий** - поддержка частичного поиска  
✅ **Эффективный** - кэширование результатов  
✅ **Надежный** - проверка дубликатов и ошибок  

## Совместимость

- Работает со всеми существующими утилитами
- Использует VacancyManager для отслеживания актуальности
- Совместим с общей системой кэширования
- Поддерживает все команды manage

## Категории профессий

- **IT и Технологии** - 8 категорий
- **Дизайн и Креатив** - 8 категорий
- **Строительство и Ремонт** - 14 категорий
- **Логистика и Транспорт** - 5 категорий
- **Медицина и Здоровье** - 9 категорий
- **Общепит и Гостеприимство** - 5 категорий
- **Торговля и Продажи** - 7 категорий
- **Бизнес и Управление** - 6 категорий
- **Охрана** - 2 категории
- **Образование** - 2 категории
- **Юриспруденция и СМИ** - 2 категории
- **Госслужба** - 2 категории
- **Другое** - 2 категории

**Всего:** 90+ категорий

## Файлы проекта

```
src/parsers/maklerMd.ts           - Основной парсер
src/types/vacancy.ts              - Обновленные типы
src/config/parsers.ts             - Конфигурация
src/parse.ts                      - Интеграция

docs/MAKLER_MD_GUIDE.md          - Полное руководство
docs/MAKLER_PROFESSIONS.md       - Словарь профессий
docs/MAKLER_QUICK_START.md       - Быстрый старт
docs/README.md                   - Обновленная главная документация

cache/makler-md/                 - Директория кэша
vacancies_makler_md.json         - Результаты парсинга
```

## Команды для сборки

```bash
# Установка зависимостей
npm install

# Сборка проекта
npm run build

# Запуск парсера
npm run parse makler.md Программисты

# Просмотр статистики
npm run manage stats makler_md
```

## Тестирование

```bash
# Тест с программистами
npm run parse makler.md Программисты

# Тест с поварами
npm run parse makler.md Повар

# Тест без категории (все вакансии)
npm run parse makler.md
```

---

**Дата:** Январь 2026  
**Версия:** v0.4.0  
**Статус:** ✅ Готово к использованию
