# Makler.md - Быстрый старт

Краткое руководство по парсингу вакансий из Приднестровья с сайта makler.md.

## Установка и сборка

```bash
# Установить зависимости (если еще не установлены)
npm install

# Собрать проект
npm run build
```

## Основные команды

### Парсинг всех вакансий

```bash
npm run parse makler.md
```

### Парсинг конкретной профессии

```bash
npm run parse makler.md Программисты
npm run parse makler.md Повар
npm run parse makler.md "Медицинская сестра"
```

## Популярные профессии

```bash
# IT
npm run parse makler.md Программисты
npm run parse makler.md Backend
npm run parse makler.md Frontend

# Строительство
npm run parse makler.md Электрик
npm run parse makler.md Сантехник
npm run parse makler.md Грузчики

# Общепит
npm run parse makler.md Повар
npm run parse makler.md Официанты

# Торговля
npm run parse makler.md Продавцы
npm run parse makler.md Кассиры

# Медицина
npm run parse makler.md "Медицинская сестра"
npm run parse makler.md Фармацевт
```

## Управление вакансиями

```bash
# Статистика
npm run manage stats makler_md

# Активные вакансии
npm run manage active makler_md

# Новые вакансии (за 24 часа)
npm run manage new makler_md

# Очистить старые неактивные
npm run manage cleanup makler_md
```

## Результаты

Результаты сохраняются в файл:
```
vacancies_makler_md.json
```

## Структура данных

```json
{
  "id": "588820",
  "title": "Консультант в магазин Vitamin Shop",
  "description": "Требуется консультант...",
  "location": "Тирасполь",
  "contactPerson": "373-77-861032",
  "publishedAt": "2026-01-03T05:58:00.000Z",
  "url": "https://makler.md/ru/job/job-offers/an/588820",
  "source": "makler.md",
  "firstSeenAt": "2026-01-03T10:00:00.000Z",
  "lastSeenAt": "2026-01-03T10:00:00.000Z",
  "isActive": true
}
```

## Что парсится?

✅ Заголовок вакансии  
✅ Описание  
✅ Локация (Тирасполь, Бендеры, и т.д.)  
✅ Контактный телефон  
✅ Дата публикации  
✅ Полная ссылка на вакансию  

## Особенности

- **Быстрый**: использует HTTP запросы (не браузер)
- **Точные фильтры**: 90+ категорий профессий
- **Кэширование**: результаты кэшируются на 24 часа
- **Умный поиск**: автоматически находит похожие профессии
- **Регистронезависимый**: "ПОВАР" = "повар" = "Повар"

## Примеры вывода

```
📊 Начинаю парсинг страниц (макс: 10)

📄 Парсинг страницы 1/10...
   URL: https://makler.md/transnistria/job/job-offers?list&list=detail&field_446[]=2869
   ✅ Найдено: 25 (новых: 25, дубликатов: 0)
   📊 Всего уникальных: 25

📄 Парсинг страницы 2/10...
   URL: https://makler.md/transnistria/job/job-offers?list&list=detail&field_446[]=2869&page=1
   ✅ Найдено: 20 (новых: 20, дубликатов: 0)
   📊 Всего уникальных: 45

============================================================
📊 ИТОГО: Найдено 45 вакансий
✅ Уникальных: 45 вакансий
============================================================

📈 Общая статистика:
   Всего в базе: 45
   ✅ Активных: 45
   🆕 Новых (за 24ч): 45

📍 По локациям (активные):
   Тирасполь: 30
   Бендеры: 10
   Рыбница: 5
```

## Полный список профессий

См. файл: [MAKLER_PROFESSIONS.md](MAKLER_PROFESSIONS.md)

Или используйте команду:
```bash
# Показать все доступные парсеры и категории
npm run parse --help
```

## Troubleshooting

### Профессия не найдена?
Проверьте написание или используйте частичное совпадение:
```bash
npm run parse makler.md "програм"  # найдет "Программисты"
```

### Мало вакансий?
Увеличьте количество страниц в конфигурации:
```typescript
// src/config/parsers.ts
'makler.md': {
  maxPages: 20,  // вместо 10
}
```

### Ошибки HTTP?
Увеличьте задержку между запросами:
```typescript
// src/config/parsers.ts
'makler.md': {
  delay: 2000,  // вместо 1000
}
```

## Программное использование

```typescript
import { MaklerMdParser } from './parsers/maklerMd.js';

const parser = new MaklerMdParser();

const result = await parser.parse({
  baseUrl: 'https://makler.md',
  searchQuery: 'Программисты',
  maxPages: 10,
  delay: 1000,
});

console.log(`Найдено: ${result.totalFound} вакансий`);
```

## Дополнительные ресурсы

- [Полное руководство](MAKLER_MD_GUIDE.md)
- [Список профессий](MAKLER_PROFESSIONS.md)
- [Общая документация](README.md)

---

**Приднестровье** 🇲🇩  
**Последнее обновление:** Январь 2026
