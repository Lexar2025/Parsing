# Пошаговое руководство по интеграции hh.ru

## Шаг 1: Подготовка проекта

### 1.1 Создание резервной копии
```bash
# Создаем бэкап текущего состояния
cd C:\Users\User\Documents\Claude\Parsing
git branch backup-before-hh-integration
git checkout backup-before-hh-integration
git push origin backup-before-hh-integration
git checkout main
```

### 1.2 Установка необходимых зависимостей
```bash
npm install axios
npm install -D @types/axios
```

## Шаг 2: Создание структуры директорий

```bash
# Создаем новые директории
mkdir src\types\hh
mkdir src\parsers\api
mkdir src\api\services\hh
mkdir src\settings\strategies
mkdir src\utils\search
```

## Шаг 3: Создание типов для hh.ru

### 3.1 Файл: `src/types/hh/vacancy.interface.ts`
```typescript
// Интерфейсы для работы с вакансиями hh.ru

export interface DictionaryItem<T = string> {
  id: T;
  name: string;
}

export type ScheduleId = 'fullDay' | 'shift' | 'flexible' | 'remote' | 'flyInFlyOut';
export type ExperienceId = 'noExperience' | 'between1And3' | 'between3And6' | 'moreThan6';
export type EmploymentId = 'full' | 'part' | 'project' | 'probation' | 'internship';

export interface IHHVacancy {
  id: string;
  premium: boolean;
  name: string;
  department: string | null;
  has_test: boolean;
  response_letter_required: boolean;

  area: {
    id: string;
    name: string;
    url: string;
  };

  salary: {
    from: number | null;
    to: number | null;
    currency: string;
    gross: boolean;
  } | null;

  type: DictionaryItem<string>;

  published_at: string;
  created_at: string;

  archived: boolean;
  url: string;
  alternate_url: string;

  employer: {
    id: string;
    name: string;
    url: string;
    alternate_url: string;
    logo_urls: {
      original: string;
      '90': string;
      '240': string;
    };
    vacancies_url: string;
    accredited_it_employer: boolean;
    trusted: boolean;
  };

  snippet: {
    requirement: string | null;
    responsibility: string | null;
  };

  schedule: DictionaryItem<ScheduleId>;
  experience: DictionaryItem<ExperienceId>;
  employment: DictionaryItem<EmploymentId>;
}
```

### 3.2 Файл: `src/types/hh/vacancy.response.ts`
```typescript
import { IHHVacancy } from './vacancy.interface';

export interface IHHVacancyResponse {
  items: IHHVacancy[];
  found: number;
  pages: number;
  page: number;
  per_page: number;
  clusters?: any[];
  arguments?: any[];
  fixes?: any[];
}
```

### 3.3 Файл: `src/types/hh/vacancy-search-filters.interface.ts`
```typescript
import { ExperienceId, ScheduleId, EmploymentId } from './vacancy.interface';

export interface AreaLocation {
  id: string;
  name: string;
  country?: string;
}

export interface SearchFilters {
  text?: string;
  area?: AreaLocation;
  salary?: number;
  experience?: { id: ExperienceId; name: string };
  schedule?: { id: ScheduleId; name: string };
  employment?: { id: EmploymentId; name: string };
  page?: number;
  limit?: number;
}
```

### 3.4 Файл: `src/types/hh/region.interface.ts`
```typescript
export interface AreasResponse {
  id: string;
  parent_id: string | null;
  name: string;
  areas: AreasResponse[];
}
```

## Шаг 4: Создание клиента API hh.ru

### Файл: `src/api/services/hh/hh-api.service.ts`
```typescript
import axios from 'axios';
import { IHHVacancyResponse } from '../../../types/hh/vacancy.response';
import { IHHVacancy } from '../../../types/hh/vacancy.interface';
import { SearchFilters } from '../../../types/hh/vacancy-search-filters.interface';
import { AreasResponse } from '../../../types/hh/region.interface';

export class HHClient {
  private baseUrl = 'https://api.hh.ru';
  private rateLimit = 100; // запросов в минуту
  private requestsInWindow = 0;
  private rateLimitWindowStart = Date.now();

  private $api = axios.create({
    baseURL: this.baseUrl,
    timeout: 30000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  });

  /**
   * Проверка и ожидание при превышении рейт-лимита
   */
  private async checkRateLimit(): Promise<void> {
    const now = Date.now();
    
    // Сбрасываем счетчик каждую минуту
    if (now - this.rateLimitWindowStart > 60000) {
      this.requestsInWindow = 0;
      this.rateLimitWindowStart = now;
    }

    // Если достигнут лимит, ждем до следующего окна
    if (this.requestsInWindow >= this.rateLimit) {
      const waitTime = 60000 - (now - this.rateLimitWindowStart);
      console.log(`⏳ Достигнут лимит запросов. Ожидание ${Math.ceil(waitTime / 1000)} сек...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.requestsInWindow = 0;
      this.rateLimitWindowStart = Date.now();
    }

    this.requestsInWindow++;
  }

  /**
   * Поиск вакансий
   */
  async searchVacancies(filters: SearchFilters): Promise<IHHVacancyResponse> {
    await this.checkRateLimit();

    const params: Record<string, any> = {
      per_page: filters.limit ?? 20,
      page: filters.page ?? 0,
      text: filters.text,
      search_field: 'name',
    };

    if (filters.area) {
      params.area = filters.area.id;
    }
    if (filters.salary) {
      params.salary = filters.salary;
    }
    if (filters.experience) {
      params.experience = filters.experience.id;
    }
    if (filters.schedule) {
      params.schedule = filters.schedule.id;
    }
    if (filters.employment) {
      params.employment = filters.employment.id;
    }

    try {
      console.log(`🔍 Запрос к hh.ru API: ${JSON.stringify(params)}`);
      
      const response = await this.$api.get<IHHVacancyResponse>('/vacancies', {
        params,
      });

      console.log(`✅ Получено ${response.data.items.length} вакансий из ${response.data.found} найденных`);
      
      return response.data;
    } catch (error: any) {
      console.error('❌ Ошибка при поиске вакансий на hh.ru:', error.message);
      
      if (error.response) {
        console.error('Статус:', error.response.status);
        console.error('Данные:', error.response.data);
      }
      
      throw error;
    }
  }

  /**
   * Получение детальной информации о вакансии
   */
  async getVacancyById(id: string): Promise<IHHVacancy> {
    await this.checkRateLimit();

    try {
      console.log(`📄 Запрос деталей вакансии ${id}...`);
      
      const response = await this.$api.get<IHHVacancy>(`/vacancies/${id}`);
      
      console.log(`✅ Получены детали вакансии ${id}`);
      
      return response.data;
    } catch (error: any) {
      console.error(`❌ Ошибка при получении вакансии ${id}:`, error.message);
      throw error;
    }
  }

  /**
   * Получение списка регионов
   */
  async getAreas(): Promise<AreasResponse[]> {
    await this.checkRateLimit();

    try {
      console.log('🌍 Запрос списка регионов...');
      
      const response = await this.$api.get<AreasResponse[]>('/areas');
      
      console.log(`✅ Получено ${response.data.length} регионов`);
      
      return response.data;
    } catch (error: any) {
      console.error('❌ Ошибка при получении регионов:', error.message);
      throw error;
    }
  }

  /**
   * Получение справочников
   */
  async getDictionaries(): Promise<any> {
    await this.checkRateLimit();

    try {
      console.log('📚 Запрос справочников...');
      
      const response = await this.$api.get('/dictionaries');
      
      console.log('✅ Получены справочники');
      
      return response.data;
    } catch (error: any) {
      console.error('❌ Ошибка при получении справочников:', error.message);
      throw error;
    }
  }
}
```

## Шаг 5: Создание адаптера для hh.ru

### Файл: `src/parsers/adapters/hh.adapter.ts`
```typescript
import { BaseVacancyAdapter } from './base.adapter';
import { IHHVacancy } from '../../types/hh/vacancy.interface';
import { Vacancy } from '../../types/vacancy';

export class HHVacancyAdapter extends BaseVacancyAdapter {
  sourceName = 'hh.ru';

  toPrisma(vacancy: IHHVacancy): any { // any для совместимости с Prisma
    return {
      id: `hh_${vacancy.id}`,
      title: vacancy.name,
      company: vacancy.employer.name,
      salary: this.formatSalary(vacancy.salary),
      salaryFrom: vacancy.salary?.from || undefined,
      salaryTo: vacancy.salary?.to || undefined,
      salaryCurrency: vacancy.salary?.currency || 'RUR',
      location: vacancy.area.name,
      country: 'Russia',
      city: vacancy.area.name,
      description: this.formatDescription(vacancy),
      fullDescription: '', // Можно получить через отдельный запрос
      url: vacancy.alternate_url,
      publishedAt: new Date(vacancy.published_at),
      experience: this.mapHHExperience(vacancy.experience.id),
      employmentType: this.mapHHEmployment(vacancy.employment.id),
      schedule: this.mapHHSchedule(vacancy.schedule.id),
      remote: this.isRemote(vacancy),
      relocation: false, // hh.ru не предоставляет эту информацию напрямую
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
    if (!salary) return 'Не указана';
    
    const parts = [];
    if (salary.from) parts.push(`от ${this.formatNumber(salary.from)}`);
    if (salary.to) parts.push(`до ${this.formatNumber(salary.to)}`);
    parts.push(salary.currency);
    
    if (salary.gross) {
      parts.push('(до вычета налогов)');
    }
    
    return parts.join(' ');
  }

  private formatNumber(num: number): string {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }

  private formatDescription(vacancy: IHHVacancy): string {
    const parts = [];
    if (vacancy.snippet?.requirement) {
      parts.push(`Требования: ${vacancy.snippet.requirement}`);
    }
    if (vacancy.snippet?.responsibility) {
      parts.push(`Обязанности: ${vacancy.snippet.responsibility}`);
    }
    return parts.join('\n\n');
  }

  private mapHHExperience(experienceId: string): string {
    const map: Record<string, string> = {
      'noExperience': 'no_experience',
      'between1And3': 'between_1_and_3',
      'between3And6': 'between_3_and_6',
      'moreThan6': 'more_than_6',
    };
    return map[experienceId] || this.normalizeExperience(experienceId);
  }

  private mapHHEmployment(employmentId: string): string {
    const map: Record<string, string> = {
      'full': 'full',
      'part': 'part',
      'project': 'project',
      'probation': 'probation',
      'internship': 'internship',
    };
    return map[employmentId] || this.normalizeEmployment(employmentId);
  }

  private mapHHSchedule(scheduleId: string): string {
    const map: Record<string, string> = {
      'fullDay': 'fullDay',
      'shift': 'shift',
      'flexible': 'flexible',
      'remote': 'remote',
      'flyInFlyOut': 'flyInFlyOut',
    };
    return map[scheduleId] || this.normalizeSchedule(scheduleId);
  }

  private isRemote(vacancy: IHHVacancy): boolean {
    return vacancy.schedule.id === 'remote';
  }
}
```

## Шаг 6: Создание парсера для hh.ru

### Файл: `src/parsers/api/hhRu.ts`
```typescript
import { Parser, ParseResult, ParserConfig, Vacancy } from '../../types/vacancy';
import { HHClient } from '../../api/services/hh/hh-api.service';
import { HHVacancyAdapter } from '../adapters/hh.adapter';
import { SearchFilters } from '../../types/hh/vacancy-search-filters.interface';

export class HHRuParser implements Parser {
  private client: HHClient;
  private adapter: HHVacancyAdapter;

  constructor(options?: { cacheEnabled?: boolean }) {
    this.client = new HHClient();
    this.adapter = new HHVacancyAdapter();
  }

  async parse(config: ParserConfig & { filters?: SearchFilters }): Promise<ParseResult> {
    console.log(`\n🚀 Запуск парсера hh.ru для запроса: "${config.searchQuery || 'все'}"\n`);

    try {
      const response = await this.client.searchVacancies({
        text: config.searchQuery || undefined,
        area: config.filters?.area,
        salary: config.filters?.salary,
        experience: config.filters?.experience,
        schedule: config.filters?.schedule,
        employment: config.filters?.employment,
        page: config.page || 0,
        limit: config.maxPages || 20,
      });

      const vacancies: Vacancy[] = response.items.map(item => ({
        id: `hh_${item.id}`,
        title: item.name,
        company: item.employer?.name || 'Не указано',
        salary: this.formatSalary(item.salary),
        location: item.area?.name || 'Не указано',
        country: 'Russia',
        city: item.area?.name,
        description: this.formatDescription(item),
        url: item.alternate_url,
        publishedAt: new Date(item.published_at),
        experience: this.mapExperience(item.experience.id),
        employmentType: this.mapEmployment(item.employment.id),
        schedule: this.mapSchedule(item.schedule.id),
        remote: item.schedule.id === 'remote',
        source: 'hh.ru',
        hhId: item.id,
        isActive: !item.archived,
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
      }));

      console.log(`✅ Обработано ${vacancies.length} вакансий с hh.ru`);

      return {
        vacancies,
        totalFound: response.found,
        page: response.page,
        hasNextPage: response.pages > response.page + 1,
      };
    } catch (error) {
      console.error('❌ Ошибка при парсинге hh.ru:', error);
      throw error;
    }
  }

  async parseVacancyDetails(url: string): Promise<Partial<Vacancy>> {
    const id = this.extractVacancyId(url);
    if (!id) {
      throw new Error('Invalid vacancy URL');
    }

    try {
      console.log(`📄 Получение деталей вакансии ${id}...`);
      
      const vacancy = await this.client.getVacancyById(id);
      const adapted = this.adapter.toPrisma(vacancy);
      
      console.log(`✅ Получены детали вакансии ${id}`);
      
      return adapted;
    } catch (error) {
      console.error(`❌ Ошибка при получении деталей вакансии ${id}:`, error);
      throw error;
    }
  }

  private formatSalary(salary: any): string {
    if (!salary) return 'Не указана';
    
    const parts = [];
    if (salary.from) parts.push(`от ${salary.from}`);
    if (salary.to) parts.push(`до ${salary.to}`);
    parts.push(salary.currency || 'RUR');
    
    return parts.join(' ');
  }

  private formatDescription(item: any): string {
    const parts = [];
    if (item.snippet?.requirement) {
      parts.push(item.snippet.requirement);
    }
    return parts.join('\n');
  }

  private mapExperience(experienceId: string): string {
    const map: Record<string, string> = {
      'noExperience': 'no_experience',
      'between1And3': 'between_1_and_3',
      'between3And6': 'between_3_and_6',
      'moreThan6': 'more_than_6',
    };
    return map[experienceId] || experienceId;
  }

  private mapEmployment(employmentId: string): string {
    return employmentId;
  }

  private mapSchedule(scheduleId: string): string {
    return scheduleId;
  }

  private extractVacancyId(url: string): string | null {
    const match = url.match(/\/vacancy\/(\d+)/);
    return match ? match[1] : null;
  }
}
```

## Шаг 7: Создание стратегии поиска

### Файл: `src/settings/strategies/search-strategy.ts`
```typescript
import { Source } from '../../types/vacancy';

export type StrategyName = 'local' | 'international' | 'hybrid';

export interface SearchStrategy {
  name: StrategyName;
  enabledSources: Source[];
  defaultCountry?: string;
  includeRemote?: boolean;
  includeRelocation?: boolean;
  description: string;
}

export const SEARCH_STRATEGIES: Record<StrategyName, SearchStrategy> = {
  local: {
    name: 'local',
    enabledSources: ['rabota.md', '999.md', 'makler.md'],
    defaultCountry: 'Moldova',
    includeRemote: true,
    includeRelocation: false,
    description: 'Поиск только на локальных молдавских сайтах',
  },
  international: {
    name: 'international',
    enabledSources: ['hh.ru'],
    defaultCountry: 'Russia',
    includeRemote: true,
    includeRelocation: true,
    description: 'Поиск на международных площадках (Россия)',
  },
  hybrid: {
    name: 'hybrid',
    enabledSources: ['rabota.md', '999.md', 'makler.md', 'hh.ru'],
    defaultCountry: undefined,
    includeRemote: true,
    includeRelocation: true,
    description: 'Поиск на всех доступных площадках',
  },
};

export interface StrategyDetectionOptions {
  query?: string;
  country?: string;
  city?: string;
  includeInternational?: boolean;
}

/**
 * Определяет стратегию поиска на основе запроса и параметров
 */
export function detectSearchStrategy(
  options: StrategyDetectionOptions = {}
): SearchStrategy {
  const { query, country, city, includeInternational } = options;

  // Если явно указано включить международный поиск
  if (includeInternational) {
    return SEARCH_STRATEGIES.international;
  }

  // Анализируем поисковый запрос
  if (query) {
    const lowerQuery = query.toLowerCase();
    
    // Ключевые слова для международного поиска
    const internationalKeywords = [
      'за рубежом', 'за границей', 'заграница',
      'россия', 'москва', 'санкт-петербург',
      'мск', 'спб', 'работа в россии',
      'работа в москве', 'работа в спб',
      'россии', 'москве', 'петербурге',
      'рф', 'россия работа',
    ];

    if (internationalKeywords.some(keyword => lowerQuery.includes(keyword))) {
      return SEARCH_STRATEGIES.international;
    }

    // Ключевые слова для локального поиска
    const localKeywords = [
      'молдова', 'кишинев', 'кишинёв',
      'мд', 'киш', 'работа в молдове',
      'работа в кишиневе',
    ];

    if (localKeywords.some(keyword => lowerQuery.includes(keyword))) {
      return SEARCH_STRATEGIES.local;
    }
  }

  // Анализируем страну
  if (country) {
    const lowerCountry = country.toLowerCase();
    
    if (lowerCountry.includes('россия') || lowerCountry.includes('russia')) {
      return SEARCH_STRATEGIES.international;
    }
    
    if (lowerCountry.includes('молдова') || lowerCountry.includes('moldova')) {
      return SEARCH_STRATEGIES.local;
    }
  }

  // Анализируем город
  if (city) {
    const lowerCity = city.toLowerCase();
    
    const russianCities = ['москва', 'мск', 'санкт-петербург', 'спб', 'новосибирск'];
    if (russianCities.some(c => lowerCity.includes(c))) {
      return SEARCH_STRATEGIES.international;
    }
    
    const moldovanCities = ['кишинев', 'кишинёв', 'киш', 'бельцы', 'бэлць'];
    if (moldovanCities.some(c => lowerCity.includes(c))) {
      return SEARCH_STRATEGIES.local;
    }
  }

  // По умолчанию - локальный поиск
  return SEARCH_STRATEGIES.local;
}

/**
 * Получает стратегию по имени
 */
export function getStrategyByName(name: StrategyName): SearchStrategy {
  const strategy = SEARCH_STRATEGIES[name];
  if (!strategy) {
    throw new Error(`Unknown strategy: ${name}`);
  }
  return strategy;
}
```

## Шаг 8: Обновление конфигурации парсеров

### Обновление файла: `src/settings/parsers.ts`
```typescript
// ... существующий код ...

export const PARSER_CONFIGS: Record<string, SiteConfig> = {
  'rabota.md': {
    name: 'Rabota.md',
    baseUrl: 'https://www.rabota.md',
    defaultCategory: 'программист',
    maxPages: 10,
    delay: 1000,
    concurrency: 3,
    cacheEnabled: true,
  },
  '999.md': {
    name: '999.md',
    baseUrl: 'https://999.md',
    defaultCategory: 'Грузчик',
    maxPages: 10,
    delay: 1500,
    concurrency: 3,
    cacheEnabled: true,
  },
  'makler.md': {
    name: 'Makler.md',
    baseUrl: 'https://makler.md',
    defaultCategory: 'Программисты',
    maxPages: 10,
    delay: 1000,
    concurrency: 3,
    cacheEnabled: true,
  },
  'hh.ru': {  // НОВОЕ
    name: 'hh.ru',
    baseUrl: 'https://api.hh.ru',
    defaultCategory: 'программист',
    maxPages: 20,  // Больше страниц для API
    delay: 0,      // Задержка управляется рейт-лимитом
    concurrency: 1, // Последовательные запросы из-за рейт-лимита
    cacheEnabled: true,
  },
};
```

## Шаг 9: Обновление основного скрипта парсинга

### Обновление файла: `src/parse.ts`
```typescript
// ... существующие импорты ...

import { HHRuParser } from './parsers/api/hhRu.js';
import { 
  detectSearchStrategy, 
  StrategyDetectionOptions 
} from './settings/strategies/search-strategy.js';
import { SearchFilters } from './types/hh/vacancy-search-filters.interface.js';

// ... существующие функции ...

function getParser(site: string): Parser {
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
    case 'hh.ru':  // НОВОЕ
      return new HHRuParser({
        cacheEnabled: true,
      });
    default:
      throw new Error(`Unknown parser: ${site}`);
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const query = args[0]; // Поисковый запрос
  const category = args[1]; // Категория (опционально)
  const strategyName = args[2]; // Явное указание стратегии (опционально)

  console.log('🚀 Запуск парсера вакансий\n');
  console.log('='.repeat(60));

  // Определяем стратегию поиска
  let strategy;
  
  if (strategyName) {
    // Явное указание стратегии
    strategy = getStrategyByName(strategyName as any);
    console.log(`🎯 Стратегия (указана явно): ${strategy.name}`);
    console.log(`   ${strategy.description}\n`);
  } else {
    // Автоматическое определение
    strategy = detectSearchStrategy({ query });
    console.log(`🎯 Стратегия (определена автоматически): ${strategy.name}`);
    console.log(`   ${strategy.description}\n`);
    
    // Предупреждение если выбран международный поиск
    if (strategy.name === 'international') {
      console.log('⚠️  Включен поиск на международных площадках (hh.ru)');
      console.log('   Это может занять больше времени из-за рейт-лимитов API\n');
    }
  }

  console.log('='.repeat(60));

  try {
    const manager = new VacancyManager({
      inactiveThresholdDays: 7,
      autoCleanup: true,
    });

    const allVacancies: Vacancy[] = [];
    let totalFound = 0;

    // Запускаем парсеры для всех источников в стратегии
    for (const site of strategy.enabledSources) {
      console.log(`\n🔍 Парсинг ${site}...\n`);

      const siteConfig = getParserConfig(site as any);
      const parser = getParser(site);

      const config: ParserConfig & { filters?: SearchFilters } = {
        baseUrl: siteConfig.baseUrl,
        searchQuery: category || siteConfig.defaultCategory || query || 'все',
        maxPages: siteConfig.maxPages,
        delay: siteConfig.delay,
        page: 0,
      };

      // Для hh.ru добавляем фильтры
      if (site === 'hh.ru') {
        config.filters = {
          text: query || category || 'программист',
          // Можно добавить другие фильтры
        };
      }

      const result = await parser.parse(config);
      allVacancies.push(...result.vacancies);
      totalFound += result.totalFound;

      console.log(`✅ Найдено ${result.vacancies.length} вакансий на ${site}`);
    }

    const filename = `vacancies_${strategy.name}_${Date.now()}.json`;
    await manager.save(filename, allVacancies);

    // Статистика
    printStatistics(allVacancies, manager);

    console.log(`\n✅ Результаты сохранены в файл: ${filename}`);
    console.log(`📊 Всего найдено: ${totalFound} вакансий`);
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

## Шаг 10: Обновление схемы базы данных

### Файл: `prisma/schema.prisma` (обновленный)
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Vacancy {
  id                String   @id @default(cuid())
  title             String
  company           String?
  salary            String?
  salaryFrom        Int?
  salaryTo          Int?
  salaryCurrency    String? @default('MDL')
  
  location          String?
  country           String?   // НОВОЕ: страна
  city              String?   // НОВОЕ: город
  
  description       String?
  fullDescription   String?
  url               String    @unique
  publishedAt       DateTime?
  
  experience        String?
  employmentType    String?
  schedule          String?
  
  remote            Boolean?  @default(false)  // НОВОЕ: удаленная работа
  relocation        Boolean?  @default(false)  // НОВОЕ: релокация
  
  source            String    // rabota.md, 999.md, makler.md, hh.ru
  
  // hh.ru специфичные поля
  hhId              String?   @unique  // НОВОЕ: ID вакансии в hh.ru
  employerId        String?            // НОВОЕ: ID работодателя
  premium           Boolean?  @default(false)  // НОВОЕ: премиум вакансия
  archived          Boolean?  @default(false)  // НОВОЕ: в архиве
  
  firstSeenAt       DateTime  @default(now())
  lastSeenAt        DateTime  @updatedAt
  isActive          Boolean   @default(true)
  
  @@index([source])
  @@index([country])
  @@index([city])
  @@index([hhId])
  @@index([isActive])
  @@index([publishedAt])
}
```

### Выполнение миграции:
```bash
npx prisma migrate dev --name add_hh_ru_support
npx prisma generate
```

## Шаг 11: Тестирование

### 11.1 Тест локального поиска
```bash
npm run parse "программист" "программист" "local"
```

### 11.2 Тест международного поиска
```bash
npm run parse "программист за рубежом" "программист" "international"
```

### 11.3 Тест автоматического определения
```bash
npm run parse "работа в Москве программист"
```

### 11.4 Тест гибридного поиска
```bash
npm run parse "программист" "программист" "hybrid"
```

## Шаг 12: Обновление документации

### Файл: `README.md` (добавить раздел)
```markdown
## Международный поиск (hh.ru)

Проект поддерживает поиск вакансий на международных площадках, в частности на [hh.ru](https://hh.ru).

### Стратегии поиска

Доступны три стратегии поиска:

1. **local** - поиск только на локальных молдавских сайтах (rabota.md, 999.md, makler.md)
2. **international** - поиск только на международных площадках (hh.ru)
3. **hybrid** - поиск на всех доступных площадках

### Автоматическое определение стратегии

Система автоматически определяет стратегию поиска на основе поискового запроса:

- Запросы содержащие "за рубежом", "за границей", "Москва", "Россия" → `international`
- Запросы содержащие "Молдова", "Кишинев" → `local`
- По умолчанию → `local`

### Ручное указание стратегии

```bash
# Локальный поиск
npm run parse "программист" "программист" "local"

# Международный поиск
npm run parse "программист" "программист" "international"

# Гибридный поиск
npm run parse "программист" "программист" "hybrid"
```

### Ограничения API hh.ru

- Лимит: 100 запросов в минуту
- Таймаут: 30 секунд
- Автоматическое управление рейт-лимитом встроено в клиент

### Особенности

- Международный поиск может занимать больше времени из-за рейт-лимитов API
- Данные с hh.ru включают дополнительные поля: страна, город, валюта зарплаты
- Поддерживается определение удаленной работы и возможности релокации
```

## Заключение

После выполнения всех шагов проект будет поддерживать:
1. ✅ Локальный поиск на молдавских сайтах
2. ✅ Международный поиск на hh.ru
3. ✅ Автоматическое определение стратегии поиска
4. ✅ Ручное управление стратегией
5. ✅ Унифицированный формат данных
6. ✅ Расширенную базу данных с поддержкой международных вакансий
