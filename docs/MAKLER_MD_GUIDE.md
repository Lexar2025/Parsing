# Парсер Makler.md

## Описание

Парсер для сайта makler.md - портала вакансий Приднестровья. Использует HTTP-запросы через axios для извлечения данных о вакансиях.

## Особенности

- ✅ HTTP парсинг (быстрый, не требует браузера)
- ✅ Словарь профессий с ID для точных фильтров
- ✅ Поддержка пагинации (page=0, page=1, page=2, ...)
- ✅ Кэширование результатов (TTL: 24 часа)
- ✅ Проверка дубликатов по ID
- ✅ Детальный парсинг вакансий (опционально)

## Словарь профессий

Парсер использует словарь `MAKLER_PROFESSIONS` для преобразования названий профессий в ID фильтров:

```typescript
const MAKLER_PROFESSIONS = {
  'Программисты': 2869,
  'Backend': 2870,
  'Frontend': 2871,
  'Грузчики': 2878,
  'Повар': 2921,
  'Официанты': 2922,
  // ... и другие (90+ профессий)
};
```

## Структура URL

### Базовый URL
```
https://makler.md/transnistria/job/job-offers?list&list=detail
```

### С фильтром профессии
```
https://makler.md/transnistria/job/job-offers?list&list=detail&field_446[]=2869
```
где `2869` - это ID профессии "Программисты"

### С пагинацией
```
https://makler.md/transnistria/job/job-offers?list&list=detail&field_446[]=2869&page=0
https://makler.md/transnistria/job/job-offers?list&list=detail&field_446[]=2869&page=1
```

### Множественные фильтры
```
https://makler.md/transnistria/job/job-offers?list&list=detail&field_446[]=2869&field_446[]=2871
```
(Программисты + Frontend)

### С удалённой работой
```
https://makler.md/transnistria/job/job-offers?list&list=detail&field_446[]=2869&field_344[]=4619
```
где `field_344[]=4619` - фильтр "Удалённая работа"

## HTML Структура

### Карточка вакансии
```html
<article>
   <div class="ls-detail_time">03 Января 05:58</div>
   <div class="ls-detail_infoBlock">
      <h3 class="ls-detail_antTitle">
         <a href="https://makler.md/ru/job/job-offers/an/588820" class="ls-detail_anUrl">
            Консультант в магазин Vitamin Shop
         </a>
      </h3>
      <div class="subfir">Описание вакансии...</div>
      <div class="ls-detail_anData">
           <span id="pointer_icon">Тирасполь</span>
           <span class="phone_icon">373-77-861032</span>
      </div>
   </div>
</article>
```

### Извлекаемые поля

Из карточки (список вакансий):
- **id** - извлекается из URL (`/an/588820` → `588820`)
- **title** - заголовок вакансии
- **description** - краткое описание из `.subfir`
- **location** - город/регион из `#pointer_icon`
- **contactPerson** - телефон из `.phone_icon`
- **publishedAt** - дата публикации из `.ls-detail_time`
- **url** - полная ссылка на вакансию
- **source** - всегда `'makler.md'`

## Использование

### Базовое использование

```bash
# Все вакансии
npm run parse makler.md

# Конкретная профессия
npm run parse makler.md Программисты
npm run parse makler.md Повар
npm run parse makler.md "Официанты"
```

### Примеры команд

```bash
# IT специалисты
npm run parse makler.md Программисты
npm run parse makler.md Backend
npm run parse makler.md Frontend

# Рабочие специальности
npm run parse makler.md Грузчики
npm run parse makler.md Строитель
npm run parse makler.md Электрик

# Сфера услуг
npm run parse makler.md Повар
npm run parse makler.md Официанты
npm run parse makler.md Бармены

# Медицина
npm run parse makler.md "Медицинская сестра"
npm run parse makler.md Фармацевт
```

## Программное использование

```typescript
import { MaklerMdParser } from './parsers/maklerMd.js';

const parser = new MaklerMdParser({
  concurrency: 3,        // Одновременных запросов
  cacheEnabled: true,    // Использовать кэш
  parseDetails: true,    // Парсить детальные страницы
});

const result = await parser.parse({
  baseUrl: 'https://makler.md',
  searchQuery: 'Программисты',
  maxPages: 10,
  delay: 1000,
});

console.log(`Найдено вакансий: ${result.totalFound}`);
result.vacancies.forEach(v => {
  console.log(`${v.title} - ${v.location}`);
});
```

## Конфигурация

```typescript
export const PARSER_CONFIGS = {
  'makler.md': {
    name: 'Makler.md',
    baseUrl: 'https://makler.md',
    defaultCategory: 'Программисты',
    maxPages: 10,           // Макс. страниц для парсинга
    delay: 1000,            // Задержка между запросами (мс)
    concurrency: 3,         // Одновременные запросы
    cacheEnabled: true,     // Использовать кэш
  },
};
```

## Парсинг даты

Парсер автоматически преобразует даты из формата `"03 Января 05:58"` в JavaScript `Date`:

```typescript
// Пример:
"03 Января 05:58" → Date(2026, 0, 3, 5, 58)
```

Если дата в будущем (например, 03 января при текущей дате 02 января), автоматически устанавливается прошлый год.

## Кэширование

- Кэш хранится в папке: `cache/makler-md/`
- TTL по умолчанию: 24 часа
- Формат: JSON файлы с хэшем URL в имени
- Автоматическая очистка устаревшего кэша

## Статистика

После парсинга выводится детальная статистика:

```
📊 ИТОГО: Найдено 85 вакансий
✅ Уникальных: 82 вакансии
🗑️  Удалено дубликатов: 3

📈 Общая статистика:
   Всего в базе: 150
   ✅ Активных: 82
   ❌ Неактивных: 68
   🆕 Новых (за 24ч): 12

📍 По локациям (активные):
   Тирасполь: 45
   Бендеры: 20
   Рыбница: 10
   Дубоссары: 7
```

## Управление вакансиями

```bash
# Статистика
npm run manage stats makler_md

# Показать активные вакансии
npm run manage active makler_md

# Показать новые вакансии (за 24ч)
npm run manage new makler_md

# Очистить старые неактивные (>7 дней)
npm run manage cleanup makler_md
```

## Структура данных

```typescript
interface Vacancy {
  id: string;                  // "588820"
  title: string;               // "Консультант в магазин Vitamin Shop"
  description?: string;        // Краткое описание
  location?: string;           // "Тирасполь"
  contactPerson?: string;      // "373-77-861032"
  publishedAt?: Date;          // Date(2026, 0, 3, 5, 58)
  url: string;                 // Полная ссылка
  source: 'makler.md';
  
  // Поля актуальности
  firstSeenAt?: Date;          // Когда впервые найдена
  lastSeenAt?: Date;           // Когда найдена последний раз
  isActive?: boolean;          // Активна ли сейчас
}
```

## Частые вопросы

**Q: Профессия не найдена в словаре?**  
A: Парсер автоматически попробует частичное совпадение. Если не найдено, будут спарсены все вакансии.

**Q: Как добавить новую профессию?**  
A: Добавьте в словарь `MAKLER_PROFESSIONS` в файле `src/parsers/maklerMd.ts`.

**Q: Как узнать ID профессии?**  
A: Откройте страницу с фильтрами на makler.md и найдите соответствующий `<input>` элемент с `name="field_446[]"`.

**Q: Почему не все вакансии найдены?**  
A: Проверьте:
- Правильность написания профессии
- Увеличьте `maxPages` в конфигурации
- Убедитесь что на сайте есть вакансии по этой профессии

## Производительность

- **Скорость**: ~2-3 сек на страницу (с задержкой 1000мс)
- **Память**: ~50-100MB для 100 вакансий
- **Кэш**: Значительно ускоряет повторные запросы

## Ограничения

- Не поддерживается комплексная фильтрация (пока)
- Детальная страница вакансии парсится минимально
- Нет поддержки дополнительных полей (образование, опыт, график)

## Roadmap

- [ ] Добавить парсинг детальных полей
- [ ] Поддержка фильтра "Удалённая работа"
- [ ] Комбинированные фильтры
- [ ] Экспорт найденных профессий
- [ ] Автоматическое обновление словаря профессий

---

**Последнее обновление:** Январь 2026
