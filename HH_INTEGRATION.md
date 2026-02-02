# HeadHunter API Integration

## Обзор

Интеграция с HeadHunter (hh.ru) добавлена как **дополнительный источник** для поиска работы **за границей**. В отличие от других парсеров (rabota.md, 999.md, makler.md), HH использует официальный REST API.

## Использование

### API запрос

```http
GET /api/vacancies?keywords=Программист&source=hh.ru
```

**Параметры:**
- `keywords` - поисковый запрос (обязательно)
- `source=hh.ru` - указываем HH как источник
- `limit` - количество вакансий (по умолчанию 10, макс 100)
- `page` - номер страницы

**Пример:**
```bash
curl "http://localhost:3000/api/vacancies?keywords=Программист&source=hh.ru&limit=10"
```

## Файлы интеграции

```
src/
├── parsers/
│   ├── hhRu.ts               # Парсер (главный файл)
│   └── adapters/
│       ├── hh.adapter.ts     # Адаптер для маппинга в БД
│       └── index.ts          # Регистрация адаптера
├── types/
│   └── types.ts              # Интерфейсы HH (HHVacancy, HHSearchParams...)
├── worker/jobs/
│   └── parseJob.ts           # Добавлен case 'hh.ru'
├── api/routes/
│   └── vacancies.ts          # Обновлён тип VacancySource
└── shared/managers/
    └── vacancyManager.ts     # Добавлена поддержка hh.ru
```

## Особенности

- **Источник**: Официальный API HH.ru (`https://api.hh.ru`)
- **География**: Все вакансии помечаются `workLocationType = "За границей"`
- **Лимиты**: Максимум 100 вакансий за запрос, 2000 результатов на поиск
- **Rate Limit**: HH имеет ограничения по количеству запросов

## Тестирование

```bash
# 1. Запуск сервера
npm run dev

# 2. Тестовый запрос
curl "http://localhost:3000/api/vacancies?keywords=Программист&source=hh.ru&limit=5"

# 3. Проверка в БД
# SELECT * FROM "Vacancy" WHERE source = 'hh.ru' LIMIT 10;
```

## Маппинг данных

| Поле HH           | Поле БД            |
|-------------------|--------------------|
| `name`            | `title`            |
| `employer.name`   | `company`          |
| `area.name`       | `location`         |
| `salary.*`        | `salaryMin/Max`    |
| `experience.name` | `experience`       |
| `employment.name` | `employment`       |
| `schedule.name`   | `schedule`         |
| `snippet.*`       | `description`      |
| `professional_roles` | `skills`        |

Все вакансии с HH автоматически получают `workLocationType = "За границей"`.
