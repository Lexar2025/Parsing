# Анализ интеграции hh.ru в основной проект

## Дата анализа: 28 января 2026

## 1. Текущее состояние

### Основной проект (Parsing)
- **Тип**: Парсеры веб-сайтов (HTML scraping)
- **Источники**: rabota.md, 999.md, makler.md (локальные молдавские сайты)
- **Архитектура**:
  - `src/parsers/` - парсеры для разных сайтов
  - `src/parsers/adapters/` - адаптеры для унификации данных
  - `src/types/vacancy.ts` - типы вакансий
  - `src/settings/parsers.ts` - конфигурация парсеров
  - `src/parse.ts` - основной скрипт запуска парсеров
  - `src/api/` - API для работы с данными
  - База данных: Prisma + PostgreSQL
  - Кэширование: Redis

### Проект hh.ru
- **Тип**: API клиент (REST API)
- **Источник**: hh.ru (российский сайт вакансий)
- **Архитектура**:
  - `api/hh-api.ts` - клиент для работы с API hh.ru
  - `api/services/` - сервисы кэширования
  - `types/` - типы для вакансий hh.ru
  - `constants/dictionary.ts` - справочники
  - Использует: axios для запросов

## 2. Ключевые различия

| Аспект | Основной проект | hh.ru проект |
|--------|----------------|--------------|
| **Тип источника** | HTML парсинг (Puppeteer) | REST API |
| **География** | Молдова (локальные) | Россия (международные) |
| **Аутентификация** | Не требуется | Не требуется (публичное API) |
| **Частота запросов** | Ограничена задержками | Ограничена лимитами API |
| **Структура данных** | Разная для каждого сайта | Единый формат API |
| **Типы вакансий** | `Vacancy` (упрощенный) | `IHHVacancy` (детальный) |

## 3. Бизнес-требования

### Сценарий использования
1. **Локальный поиск** (по умолчанию): парсинг только молдавских сайтов
2. **Международный поиск** (опционально): включение парсинга с hh.ru при запросе "за рубежом"

### Условия активации hh.ru
- Пользователь явно указывает поиск "за рубежом"
- Или в фильтрах указаны регионы России
- Или в настройках включена опция "Международный поиск"

## 4. Предлагаемая архитектура

### 4.1. Объединенная структура проекта

```
src/
├── parsers/                          # Все парсеры
│   ├── adapters/                     # Адаптеры для унификации
│   │   ├── base.adapter.ts
│   │   ├── 999.adapter.ts
│   │   ├── rabota.adapter.ts
│   │   ├── makler.adapter.ts
│   │   └── hh.adapter.ts            # НОВЫЙ: адаптер для hh.ru
│   ├── web/                          # Веб-парсеры
│   │   ├── rabotaMd.ts
│   │   ├── nineNineNineMd.ts
│   │   └── maklerMd.ts
│   └── api/                          # API-парсеры
│       └── hhRu.ts                   # НОВЫЙ: парсер для hh.ru
├── api/
│   ├── services/
│   │   ├── hh-api.service.ts         # НОВЫЙ: сервис для hh.ru
│   │   └── ...
│   └── ...
├── types/
│   ├── vacancy.ts                    # Общий тип + расширения
│   └── hh/                           # Специфичные типы hh.ru
│       ├── vacancy.interface.ts
│       ├── vacancy.response.ts
│       └── ...
├── settings/
│   ├── parsers.ts                    # Обновленная конфигурация
│   └── search-strategy.ts            # НОВЫЙ: стратегия поиска
└── utils/
    └── search-strategy/              # НОВЫЙ: утилиты для стратегии
```

### 4.2. Обновленная модель данных

#### Общий интерфейс вакансии (расширенный)
```typescript
// src/types/vacancy.ts

export type Source = 
  | 'rabota.md' 
  | '999.md' 
  | 'makler.md' 
  | 'hh.ru'        // НОВЫЙ
  | 'other';

export interface Vacancy {
  // ... существующие поля ...
  source: Source;
  
  // Новые поля для международного поиска
  country?: string;          // Страна (для hh.ru)
  city?: string;             // Город (более детально)
  remote?: boolean;          // Удаленная работа
  relocation?: boolean;      // Возможность релокации
  
  // Расширенные поля зарплаты
  salaryFrom?: number;       // Минимальная зарплата (число)
  salaryTo?: number;         // Максимальная зарплата (число)
  salaryCurrency?: string;   // Валюта (для международных)
  
  // Тип занятости (унифицированный)
  employmentType?: 'full' | 'part' | 'project' | 'probation' | 'internship';
  
  // Опыт работы (унифицированный)
  experience?: 'no_experience' | 'between_1_and_3' | 'between_3_and_6' | 'more_than_6';
  
  // График работы (унифицированный)
  schedule?: 'fullDay' | 'shift' | 'flexible' | 'remote' | 'flyInFlyOut';
  
  // hh.ru специфичные поля (опционально)
  hhId?: string;             // ID вакансии в hh.ru
  employerId?: string;       // ID работодателя в hh.ru
  premium?: boolean;         // Премиум вакансия
  archived?: boolean;        // В архиве
}
```

### 4.3. Стратегия поиска

#### Файл: `src/settings/search-strategy.ts`
```typescript
export interface SearchStrategy {
  name: 'local' | 'international' | 'hybrid';
  enabledSources: Source[];
  defaultCountry?: string;
  includeRemote?: boolean;
  includeRelocation?: boolean;
}

export const SEARCH_STRATEGIES: Record<string, SearchStrategy> = {
  local: {
    name: 'local',
    enabledSources: ['rabota.md', '999.md', 'makler.md'],
    defaultCountry: 'Moldova',
    includeRemote: true,
    includeRelocation: false,
  },
  international: {
    name: 'international',
    enabledSources: ['hh.ru'],
    defaultCountry: 'Russia',
    includeRemote: true,
    includeRelocation: true,
  },
  hybrid: {
    name: 'hybrid',
    enabledSources: ['rabota.md', '999.md', 'makler.md', 'hh.ru'],
    defaultCountry: undefined,
    includeRemote: true,
    includeRelocation: true,
  },
};

export function getSearchStrategy(
  query?: string,
  filters?: SearchFilters
): SearchStrategy {
  // Определяем стратегию на основе запроса и фильтров
  
  // Если запрос содержит "за рубежом", "за границей", "заграница"
  if (query?.toLowerCase().includes('за рубежом') || 
      query?.toLowerCase().includes('за границей') ||
      query?.toLowerCase().includes('заграница')) {
    return SEARCH_STRATEGIES.international;
  }
  
  // Если в фильтрах указаны российские регионы
  if (filters?.area?.country === 'Russia' || filters?.area?.id?.startsWith('1')) {
    return SEARCH_STRATEGIES.international;
  }
  
  // По умолчанию - локальный поиск
  return SEARCH_STRATEGIES.local;
}
```

### 4.4. Адаптер для hh.ru

#### Файл: `src/parsers/adapters/hh.adapter.ts`
```typescript
import { BaseVacancyAdapter } from './base.adapter';
import { IHHVacancy } from '../../../types/hh/vacancy.interface';
import { Vacancy } from '../../types/vacancy';

export class HHVacancyAdapter extends BaseVacancyAdapter {
  sourceName = 'hh.ru';

  toPrisma(vacancy: IHHVacancy): Prisma.VacancyCreateInput {
    return {
      id: vacancy.id,
      title: vacancy.name,
      company: vacancy.employer.name,
      salary: this.formatSalary(vacancy.salary),
      salaryFrom: vacancy.salary?.from || undefined,
      salaryTo: vacancy.salary?.to || undefined,
      salaryCurrency: vacancy.salary?.currency || 'RUR',
      location: this.formatLocation(vacancy.area),
      country: 'Russia',
      city: vacancy.area.name,
      description: vacancy.snippet?.requirement || '',
      fullDescription: '', // Можно получить через отдельный запрос
      url: vacancy.alternate_url,
      publishedAt: new Date(vacancy.published_at),
      experience: this.mapHHExperience(vacancy.experience.id),
      employmentType: this.mapHHEmployment(vacancy.employment.id),
      schedule: this.mapHHSchedule(vacancy.schedule.id),
      remote: this.isRemote(vacancy),
      relocation: this.supportsRelocation(vacancy),
      hhId: vacancy.id,
      employerId: vacancy.employer.id,
      premium: vacancy.premium,
      archived: vacancy.archived,
      source: 'hh.ru',
      isActive: !vacancy.archived,
      firstSeenAt: new Date(),
      lastSeenAt: new Date(),
    };
  }

  private formatSalary(salary: IHHVacancy['salary']): string {
    if (!salary) return '';
    const parts = [];
    if (salary.from) parts.push(`от ${salary.from}`);
    if (salary.to) parts.push(`до ${salary.to}`);
    parts.push(salary.currency);
    return parts.join(' ');
  }

  private formatLocation(area: IHHVacancy['area']): string {
    return area.name;
  }

  private mapHHExperience(experienceId: string): string {
    const map: Record<string, string> = {
      'noExperience': 'no_experience',
      'between1And3': 'between_1_and_3',
      'between3And6': 'between_3_and_6',
      'moreThan6': 'more_than_6',
    };
    return map[experienceId] || experienceId;
  }

  private mapHHEmployment(employmentId: string): string {
    const map: Record<string, string> = {
      'full': 'full',
      'part': 'part',
      'project': 'project',
      'probation': 'probation',
      'internship': 'internship',
    };
    return map[employmentId] || employmentId;
  }

  private mapHHSchedule(scheduleId: string): string {
    const map: Record<string, string> = {
      'fullDay': 'fullDay',
      'shift': 'shift',
      'flexible': 'flexible',
      'remote': 'remote',
      'flyInFlyOut': 'flyInFlyOut',
    };
    return map[scheduleId] || scheduleId;
  }

  private isRemote(vacancy: IHHVacancy): boolean {
    return vacancy.schedule.id === 'remote' || 
           vacancy.work_format?.some(f => f.id === 'remote');
  }

  private supportsRelocation(vacancy: IHHVacancy): boolean {
    // hh.ru не имеет прямого поля для релокации
    // Можно определить по описанию или другим признакам
    return false;
  }
}
```

### 4.5. Парсер для hh.ru

#### Файл: `src/parsers/api/hhRu.ts`
```typescript
import { Parser, ParseResult, ParserConfig, Vacancy } from '../../types/vacancy';
import { HHClient } from '../../../api/services/hh-api.service';
import { HHVacancyAdapter } from '../adapters/hh.adapter';
import { SearchFilters } from '../../../types/hh/vacancy-search-filters.interface';

export class HHRuParser implements Parser {
  private client: HHClient;
  private adapter: HHVacancyAdapter;

  constructor() {
    this.client = new HHClient();
    this.adapter = new HHVacancyAdapter();
  }

  async parse(config: ParserConfig & { filters?: SearchFilters }): Promise<ParseResult> {
    try {
      const response = await this.client.searchVacancies({
        text: config.searchQuery,
        area: config.filters?.area,
        salary: config.filters?.salary,
        experience: config.filters?.experience,
        page: config.page || 0,
        limit: config.maxPages || 20,
      });

      const vacancies: Vacancy[] = response.items.map(item => ({
        id: item.id,
        title: item.name,
        company: item.employer?.name,
        salary: this.formatSalary(item.salary),
        location: item.area?.name,
        url: item.alternate_url,
        publishedAt: new Date(item.published_at),
        source: 'hh.ru',
        hhId: item.id,
      }));

      return {
        vacancies,
        totalFound: response.found,
        page: response.page,
        hasNextPage: response.pages > response.page + 1,
      };
    } catch (error) {
      console.error('Error parsing hh.ru:', error);
      throw error;
    }
  }

  async parseVacancyDetails(url: string): Promise<Partial<Vacancy>> {
    const id = this.extractVacancyId(url);
    if (!id) {
      throw new Error('Invalid vacancy URL');
    }

    try {
      const vacancy = await this.client.getVacancyById(id);
      return this.adapter.toPrisma(vacancy) as Partial<Vacancy>;
    } catch (error) {
      console.error('Error fetching vacancy details:', error);
      throw error;
    }
  }

  private formatSalary(salary: any): string {
    if (!salary) return '';
    const parts = [];
    if (salary.from) parts.push(`от ${salary.from}`);
    if (salary.to) parts.push(`до ${salary.to}`);
    parts.push(salary.currency || 'RUR');
    return parts.join(' ');
  }

  private extractVacancyId(url: string): string | null {
    const match = url.match(/\/vacancy\/(\d+)/);
    return match ? match[1] : null;
  }
}
```

### 4.6. Обновленный файл запуска парсера

#### Файл: `src/parse.ts` (обновленная версия)
```typescript
// ... существующий импорт ...

import { HHRuParser } from './parsers/api/hhRu.js';
import { getSearchStrategy, SearchStrategy } from './settings/search-strategy.js';
import { SearchFilters } from './types/hh/vacancy-search-filters.interface.js';

// ... существующие функции ...

function getParser(site: string, strategy: SearchStrategy): Parser {
  switch (site) {
    case 'rabota.md':
      return new RabotaMdParser();
    case '999.md':
      return new NineNineNineMdParser();
    case 'makler.md':
      return new MaklerMdParser({
        headless: true,
        parseDetails: true,
        cacheEnabled: true,
      });
    case 'hh.ru':
      return new HHRuParser();
    default:
      throw new Error(`Unknown parser: ${site}`);
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const query = args[0]; // Поисковый запрос
  const category = args[1]; // Категория (опционально)

  console.log(`🚀 Запуск парсера с запросом: "${query || 'все'}"\n`);

  // Определяем стратегию поиска
  const strategy = getSearchStrategy(query);
  console.log(`🎯 Стратегия поиска: ${strategy.name}\n`);
  console.log('='.repeat(60));

  try {
    const manager = new VacancyManager({
      inactiveThresholdDays: 7,
      autoCleanup: true,
    });

    const allVacancies: Vacancy[] = [];

    // Запускаем парсеры для всех источников в стратегии
    for (const site of strategy.enabledSources) {
      console.log(`\n🔍 Парсинг ${site}...\n`);

      const siteConfig = getParserConfig(site as any);
      const parser = getParser(site, strategy);

      const config: ParserConfig & { filters?: SearchFilters } = {
        baseUrl: siteConfig.baseUrl,
        searchQuery: category || siteConfig.defaultCategory || query,
        maxPages: siteConfig.maxPages,
        delay: siteConfig.delay,
      };

      // Для hh.ru добавляем фильтры
      if (site === 'hh.ru') {
        config.filters = {
          text: query,
          // Можно добавить другие фильтры
        };
      }

      const result = await parser.parse(config);
      allVacancies.push(...result.vacancies);

      console.log(`✅ Найдено ${result.vacancies.length} вакансий на ${site}`);
    }

    // Сохраняем результаты
    const filename = `vacancies_${strategy.name}_${Date.now()}.json`;
    await manager.save(filename, allVacancies);

    // Статистика
    printStatistics(allVacancies, manager);

    console.log(`\n✅ Результаты сохранены в файл: ${filename}`);
    console.log('='.repeat(60));
  } catch (error: unknown) {
    console.error('\n❌ Произошла ошибка:');
    if (error instanceof Error) {
      console.error(error.message);
      console.error(error.stack);
    } else {
      console.error(String(error));
    }
    process.exit(1);
  }
}

main();
```

## 5. Миграция базы данных

### 5.1. Обновление схемы Prisma

```prisma
// prisma/schema.prisma

model Vacancy {
  id                String   @id @default(cuid())
  title             String
  company           String?
  salary            String?
  salaryFrom        Int?
  salaryTo          Int?
  salaryCurrency    String? @default('MDL')
  
  location          String?
  country           String?   // НОВОЕ
  city              String?   // НОВОЕ
  
  description       String?
  fullDescription   String?
  url               String    @unique
  publishedAt       DateTime?
  
  experience        String?
  employmentType    String?
  schedule          String?
  
  remote            Boolean?  @default(false)  // НОВОЕ
  relocation        Boolean?  @default(false)  // НОВОЕ
  
  source            String    // rabota.md, 999.md, makler.md, hh.ru
  
  // hh.ru специфичные поля
  hhId              String?   @unique  // НОВОЕ
  employerId        String?            // НОВОЕ
  premium           Boolean?  @default(false)  // НОВОЕ
  archived          Boolean?  @default(false)  // НОВОЕ
  
  firstSeenAt       DateTime  @default(now())
  lastSeenAt        DateTime  @updatedAt
  isActive          Boolean   @default(true)
  
  @@index([source])
  @@index([country])
  @@index([city])
  @@index([hhId])
}
```

### 5.2. Миграция

```bash
npx prisma migrate dev --name add_international_fields
npx prisma generate
```

## 6. Конфигурация и окружение

### 6.1. Обновленный `.env`

```env
# Существующие переменные
DATABASE_URL="postgresql://..."
REDIS_URL="redis://..."

# Новые переменные для hh.ru
HH_API_BASE_URL="https://api.hh.ru"
HH_API_RATE_LIMIT=100  # Запросов в минуту
HH_API_TIMEOUT=30000   # Таймаут в мс

# Стратегия поиска по умолчанию
DEFAULT_SEARCH_STRATEGY="local"  # local, international, hybrid
```

## 7. Риски и ограничения

### 7.1. Технические риски

1. **Лимиты API hh.ru**
   - Публичное API имеет ограничения на количество запросов
   - Необходима реализация рейт-лимитинга и кэширования
   - Риск блокировки при превышении лимитов

2. **Различия в структуре данных**
   - Не все поля могут быть сопоставлены напрямую
   - Требуется дополнительная обработка и нормализация

3. **Производительность**
   - Добавление нового источника увеличит время парсинга
   - Необходима оптимизация параллельных запросов

### 7.2. Бизнес-риски

1. **Юридические аспекты**
   - Необходимо проверить условия использования API hh.ru
   - Возможны ограничения на коммерческое использование

2. **Качество данных**
   - Данные из разных источников могут иметь разное качество
   - Требуется дополнительная валидация

## 8. План реализации

### Этап 1: Подготовка (1-2 дня)
- [ ] Создать резервную копию текущего проекта
- [ ] Обновить схему базы данных
- [ ] Создать новые типы и интерфейсы
- [ ] Настроить окружение для hh.ru

### Этап 2: Разработка (3-5 дней)
- [ ] Создать адаптер для hh.ru
- [ ] Создать парсер для hh.ru
- [ ] Реализовать стратегию поиска
- [ ] Обновить сервисы и утилиты

### Этап 3: Тестирование (2-3 дня)
- [ ] Протестировать парсер hh.ru в изоляции
- [ ] Протестировать интеграцию с основным проектом
- [ ] Проверить работу стратегии поиска
- [ ] Тестирование производительности

### Этап 4: Документация и деплой (1-2 дня)
- [ ] Обновить документацию
- [ ] Создать инструкции по использованию
- [ ] Деплой на тестовое окружение
- [ ] Мониторинг и отладка

## 9. Альтернативные подходы

### Вариант 1: Отдельный микросервис
**Плюсы:**
- Полная изоляция логики
- Независимое масштабирование
- Проще поддерживать

**Минусы:**
- Сложнее интеграция
- Дополнительные накладные расходы
- Требуется межсервисное взаимодействие

### Вариант 2: Плагинная архитектура
**Плюсы:**
- Гибкость добавления новых источников
- Четкое разделение ответственности
- Проще тестирование

**Минусы:**
- Требует рефакторинга текущей архитектуры
- Может быть избыточным для текущих потребностей

### Рекомендация
Использовать **основной подход** (интеграция в существующий проект) с элементами плагинной архитектуры для парсеров. Это обеспечит баланс между простотой и гибкостью.

## 10. Выводы

1. **Архитектура**: Интеграция возможна без кардинальных изменений в существующую архитектуру
2. **Стратегия поиска**: Необходим механизм определения стратегии на основе запроса пользователя
3. **Адаптация данных**: Требуется создание адаптера для унификации данных из hh.ru
4. **База данных**: Необходимо расширить схему для поддержки международных вакансий
5. **Производительность**: Важно учесть лимиты API и реализовать кэширование

**Рекомендуемый подход**: Постепенная интеграция с сохранением обратной совместимости и возможностью отключения международного поиска.
