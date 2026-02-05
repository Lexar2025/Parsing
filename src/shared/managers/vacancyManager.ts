/**
 * Vacancy Manager - центральный менеджер для управления вакансиями
 * 
 * Логика:
 * 1. Проверяем БД сначала
 * 2. Если есть данные → отдаем сразу (cache) + фоновое обновление если нужно
 * 3. Если данных нет → парсим СЕЙЧАС (fresh)
 * 4. Поддержка семантического поиска через словарики
 * 5. Парсинг одного источника
 * 6. Пагинация по номеру страницы (page)
 */

import { prisma } from '../../db/index.js';
import { vacancyService } from '../../api/services/vacancy.service.js';
import { professionDictionaryService } from '../../api/services/profession-dictionary.service.js';
import { cacheService } from '../../api/services/cache.service.js';
import { RabotaMdParser } from '../../parsers/rabotaMd.js';
import { NineNineNineMdParser } from '../../parsers/nineNineNineMd.js';
import { MaklerMdParser } from '../../parsers/maklerMd.js';
import { HHRuParser } from '../../parsers/hhRu.js';
import { Vacancy } from '../../types/vacancy.js';
import { Prisma } from '@prisma/client';
import CANONICAL_PROFESSIONS from '../../utils/dictionaries/canonical-professions.js';

// Универсальная функция для маппинга Prisma модели вакансии в интерфейс Vacancy
function mapPrismaToVacancy(prismaVacancy: Prisma.VacancyGetPayload<object>): Vacancy {
  // Безопасное извлечение данных из rawData (JSON поля)
  const getRawDataField = (field: string): unknown => {
    if (prismaVacancy.rawData && typeof prismaVacancy.rawData === 'object' && !Array.isArray(prismaVacancy.rawData)) {
      const rawData = prismaVacancy.rawData as Record<string, unknown>;
      return rawData[field] || undefined;
    }
    return undefined;
  };

  // Helper для безопасного приведения типов
  const getStringField = (field: string): string | undefined => {
    const value = getRawDataField(field);
    return typeof value === 'string' ? value : undefined;
  };

  const getBooleanField = (field: string): boolean | undefined => {
    const value = getRawDataField(field);
    return typeof value === 'boolean' ? value : undefined;
  };

  const getArrayField = (field: string): string[] | undefined => {
    const value = getRawDataField(field);
    return Array.isArray(value) ? value as string[] : undefined;
  };

  // Используем fullDescription если есть, иначе description
  const fullDesc = getStringField('fullDescription');
  const descriptionText = fullDesc || prismaVacancy.description || undefined;

  return {
    id: prismaVacancy.id,
    title: prismaVacancy.title,
    company: prismaVacancy.company || undefined,
    salary: prismaVacancy.salaryMin ? `${prismaVacancy.salaryMin} - ${prismaVacancy.salaryMax || prismaVacancy.salaryMin}` : undefined,
    location: prismaVacancy.location || undefined,
    description: descriptionText,
    url: prismaVacancy.sourceUrl,
    publishedAt: prismaVacancy.publishedAt || undefined,
    education: getStringField('education'),
    experience: prismaVacancy.experience || undefined,
    schedule: prismaVacancy.schedule || undefined,
    workPlace: getStringField('workPlace'),
    source: prismaVacancy.source as 'rabota.md' | '999.md' | 'makler.md' | 'hh.ru' | 'other',
    author: getStringField('author'),
    seasonal: getBooleanField('seasonal'),
    employmentType: prismaVacancy.employment || undefined,
    companyType: getStringField('companyType'),
    languages: getArrayField('languages'),
    contactPerson: getStringField('contactPerson'),
    region: getStringField('region'),
    vacancyType: getStringField('vacancyType'),
    industry: getStringField('industry'),
    specialization: getStringField('specialization'),
    firstSeenAt: prismaVacancy.createdAt || undefined,
    lastSeenAt: prismaVacancy.updatedAt || undefined,
    isActive: true,
  };
}

export interface SearchFilters {
  keywords?: string[];
  locations?: string[];
  salaryMin?: number;
  experience?: string[];
  schedule?: string[];
  employment?: string[];
  skills?: string[];
  sources?: ('rabota.md' | '999.md' | 'makler.md' | 'hh.ru')[];
  limit?: number;
  page?: number;
  useSemanticSearch?: boolean;
  searchBy?: 'title' | 'category';
  locationType?: 'moldova' | 'abroad' | 'aboard';
  workLocationType?: 'moldova' | 'abroad' | 'international';
}

export interface SearchResult {
  vacancies: Vacancy[];
  meta: {
    total: number;
    totalPages: number;   // Общее количество страниц
    source: 'cache' | 'fresh' | 'partial' | 'cache-paginated';
    lastUpdate: Date | null;
    updating: boolean;
    parseReason?: string;
    semanticMappings?: {
      searchQuery: string;
      mappings: Array<{
        source: string;
        profession: string;
        professionId?: string;
        similarity: number;
      }>;
    };
    category?: string; // Каноническая категория (если поиск по категории)
  };
}

export class VacancyManager {
  private static instance: VacancyManager;
  private readonly STALE_THRESHOLD = 12 * 60 * 60 * 1000; // 12 часов
  private parseQueue: { add: (name: string, data: { source: string; searchQuery: string; maxPages: number }, options?: { priority?: number; removeOnComplete?: boolean; jobId?: string }) => Promise<unknown> } | null = null;

  private constructor() {}

  static getInstance(): VacancyManager {
    if (!VacancyManager.instance) {
      VacancyManager.instance = new VacancyManager();
    }
    return VacancyManager.instance;
  }

  setQueue(queue: { add: (name: string, data: { source: string; searchQuery: string; maxPages: number }, options?: { priority?: number; removeOnComplete?: boolean; jobId?: string }) => Promise<unknown> }): void {
    this.parseQueue = queue;
  }

  /**
   * Главный метод поиска вакансий
   * 
   * Логика:
   * 1. Если есть userId - проверяем Redis кэш для быстрой пагинации
   * 2. Если есть параметр locationType - определяем источники автоматически
   * 3. Если searchBy='category' → поиск по категории через канонический справочник
   * 4. Если useSemanticSearch=true → семантический поиск через словарики
   * 5. Проверяем БД сначала
   * 6. Если есть данные → отдаем сразу (cache) + фоновое обновление
   * 7. Если данных нет → парсим СЕЙЧАС (fresh)
   */
  async search(filters: SearchFilters, userId?: string): Promise<SearchResult> {
    // Определяем источники на основе locationType
    let sources = filters.sources || ['rabota.md', '999.md', 'makler.md'];
    
    // Поддерживаем оба варианта: 'abroad' и 'aboard' (опечатка)
    if (filters.locationType === 'abroad' || filters.locationType === 'aboard') {
      // Работа за границей - все 4 источника
      sources = ['rabota.md', '999.md', 'makler.md', 'hh.ru'];
    } else if (filters.locationType === 'moldova') {
      // Работа в Молдове - только 3 источника (без hh.ru)
      sources = ['rabota.md', '999.md', 'makler.md'];
    }

    const searchQuery = filters.keywords?.[0] || 'работа';
    const limit = filters.limit || 10;
    const page = filters.page || 1;

    console.log(`🔍 Поиск вакансий:`, { 
      keywords: filters.keywords, 
      sources,
      searchQuery,
      searchBy: filters.searchBy,
      locationType: filters.locationType,
      useSemanticSearch: filters.useSemanticSearch,
      userId: userId || 'anonymous',
      limit,
      page
    });

    // НОВАЯ ЛОГИКА: Проверяем кэш для пагинации
    if (userId) {
      const cacheKey = cacheService.generateKey(userId, filters);
      const hasCache = await cacheService.hasCache(cacheKey);

      if (hasCache) {
        console.log(`📦 Найден кэш для пользователя ${userId}`);
        
        const offset = (page - 1) * limit;
        const cachedPage = await cacheService.getPage(cacheKey, limit, offset);
        
        if (cachedPage) {
          const cachedResults = await cacheService.getCachedResults(cacheKey);
          const total = cachedResults?.total || 0;
          const totalPages = Math.ceil(total / limit);
          
          return {
            vacancies: cachedPage,
            meta: {
              total,
              totalPages,
              source: 'cache-paginated',
              lastUpdate: cachedResults?.cachedAt || new Date(),
              updating: false,
              category: cachedResults?.filters?.searchBy === 'category' ? searchQuery : undefined
            }
          };
        }
      }
    }

    // Если поиск по категории - используем канонический справочник
    if (filters.searchBy === 'category') {
      return this.searchByCategory(searchQuery, { ...filters, sources }, userId);
    }

    // Если включен семантический поиск - используем его
    if (filters.useSemanticSearch) {
      return this.searchWithSemantics({ ...filters, sources }, userId);
    }

    // Обычный поиск по названию
    return this.searchRegular({ ...filters, sources }, userId);
  }

  /**
   * Поиск по категории через канонический справочник
   */
  private async searchByCategory(categoryName: string, filters: SearchFilters, userId?: string): Promise<SearchResult> {
    const sources = filters.sources || ['rabota.md', '999.md', 'makler.md'];
    const limit = filters.limit || 10;
    const page = filters.page || 1;

    console.log(`📂 Поиск по категории: "${categoryName}"`);

    // Находим каноническую профессию по названию категории
    const canonicalProf = CANONICAL_PROFESSIONS.find(
      prof => prof.canonicalName.toLowerCase() === categoryName.toLowerCase() ||
              prof.category?.toLowerCase() === categoryName.toLowerCase()
    );

    if (!canonicalProf) {
      console.log(`   ⚠️  Категория "${categoryName}" не найдена в каноническом справочнике`);
      // Возвращаем пустой результат
      return {
        vacancies: [],
        meta: {
          total: 0,
          totalPages: 0,
          source: 'fresh',
          lastUpdate: new Date(),
          updating: false,
          category: categoryName
        }
      };
    }

    console.log(`   ✅ Найдена категория: "${canonicalProf.canonicalName}" (категория: ${canonicalProf.category || 'не указана'})`);

    // Ищем вакансии по полю category в БД
    const allVacancies = await prisma.vacancy.findMany({
      where: {
        category: canonicalProf.canonicalName,
        source: { in: sources }
      },
      orderBy: { publishedAt: 'desc' }
    });

    console.log(`   📊 Найдено ${allVacancies.length} вакансий по категории`);

    // Кэшируем результаты
    if (userId && allVacancies.length > 0) {
      const cacheKey = cacheService.generateKey(userId, filters);
      const typedVacancies = allVacancies.map(mapPrismaToVacancy);
      await cacheService.cacheSearchResults(cacheKey, typedVacancies, filters);
    }

    // Вычисляем пагинацию
    const total = allVacancies.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const vacancies = allVacancies.slice(offset, offset + limit);

    // Если данных нет - запускаем парсинг
    if (allVacancies.length === 0) {
      console.log(`\n📭 Данных нет в БД по категории "${categoryName}", запускаю парсинг`);
      
      // Парсим все источники с соответствующими названиями профессий
      const parsePromises = sources.map(async (source) => {
        const sourceMapping = canonicalProf.sourceMappings[source as keyof typeof canonicalProf.sourceMappings];
        if (sourceMapping && sourceMapping.length > 0) {
          // Парсим с каждым названием из маппинга
          for (const profession of sourceMapping) {
            await this.parseSource(source, profession, Date.now());
          }
        }
      });

      await Promise.all(parsePromises);

      // Получаем свежие данные
      const freshVacancies = await prisma.vacancy.findMany({
        where: {
          category: canonicalProf.canonicalName,
          source: { in: sources }
        },
        orderBy: { publishedAt: 'desc' }
      });

      const freshTotal = freshVacancies.length;
      const freshTotalPages = Math.ceil(freshTotal / limit);
      const freshOffset = (page - 1) * limit;
      const freshPage = freshVacancies.slice(freshOffset, freshOffset + limit);

      console.log(`✅ Парсинг завершен. Найдено вакансий: ${freshTotal}`);

      const transformedFreshPage = freshPage.map(mapPrismaToVacancy);

      return {
        vacancies: transformedFreshPage,
        meta: {
          total: freshTotal,
          totalPages: freshTotalPages,
          source: 'fresh',
          lastUpdate: new Date(),
          updating: false,
          parseReason: 'Нет данных в БД по категории',
          category: canonicalProf.canonicalName
        }
      };
    }

    // Данные есть - возвращаем
    console.log(`📄 Страница ${page}/${totalPages}, показываю ${vacancies.length} из ${total} вакансий`);

    const transformedVacancies = vacancies.map(mapPrismaToVacancy);

    return {
      vacancies: transformedVacancies,
      meta: {
        total,
        totalPages,
        source: 'cache',
        lastUpdate: new Date(),
        updating: false,
        category: canonicalProf.canonicalName
      }
    };
  }

  /**
   * Обычный поиск (без семантики)
   */
  private async searchRegular(filters: SearchFilters, userId?: string): Promise<SearchResult> {
    const sources = filters.sources || ['rabota.md', '999.md', 'makler.md'];
    const searchQuery = filters.keywords?.[0] || 'работа';
    const limit = filters.limit || 10;
    const page = filters.page || 1;

    // 1. СНАЧАЛА проверяем БД - получаем ВСЕ результаты для кэширования
    const allVacancies = await vacancyService.findByFilters({
      ...filters,
      sources,
      workLocationType: filters.workLocationType, // Фильтр по типу локации
      limit: undefined, // Берем ВСЕ вакансии
      page: undefined
    });

    console.log(`📊 Найдено в БД: ${allVacancies.length} вакансий`);

    // Кэшируем результаты если есть userId
    if (userId && allVacancies.length > 0) {
      const cacheKey = cacheService.generateKey(userId, filters);
      const typedVacancies = allVacancies.map(mapPrismaToVacancy);
      await cacheService.cacheSearchResults(cacheKey, typedVacancies, filters);
    }

    // Вычисляем пагинацию
    const total = allVacancies.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const vacancies = allVacancies.slice(offset, offset + limit);

    console.log(`📄 Страница ${page}/${totalPages}, показываю ${vacancies.length} из ${total} вакансий`);

    // 2. Проверяем историю парсинга
    const parseHistory = await this.checkParseHistory(sources, searchQuery);
    
    console.log(`📊 История парсинга для "${searchQuery}":`);
    parseHistory.forEach(h => {
      console.log(`   ${h.source}: ${h.wasRecentlyParsed ? '✅ недавно' : '❌ устарел'} (${h.lastParse?.toLocaleString() || 'никогда'})`);
    });

    // 3. Определяем какие источники нужно обновить
    const sourcesToUpdate = parseHistory
      .filter(p => !p.wasRecentlyParsed)
      .map(p => p.source);

    // 4. ЕСЛИ В БД ЕСТЬ ДАННЫЕ → отдаем сразу
    if (allVacancies.length > 0) {
      console.log(`✅ Данные найдены в БД, возвращаю страницу ${page}`);
      
      // Фоновое обновление если нужно
      if (sourcesToUpdate.length > 0) {
        console.log(`⏰ Запускаю фоновое обновление для: ${sourcesToUpdate.join(', ')}`);
        this.scheduleBackgroundParsing(sourcesToUpdate, searchQuery);
      }

      const lastUpdate = parseHistory.reduce((latest, p) => {
        if (!p.lastParse) return latest;
        return !latest || p.lastParse > latest ? p.lastParse : latest;
      }, null as Date | null);

      const transformedVacancies = vacancies.map(mapPrismaToVacancy);

      return {
        vacancies: transformedVacancies,
        meta: {
          total,
          totalPages,
          source: 'cache',
          lastUpdate,
          updating: sourcesToUpdate.length > 0
        }
      };
    }

    // 5. ЕСЛИ В БД НЕТ ДАННЫХ → парсим СЕЙЧАС
    console.log(`\n📭 Данных нет в БД, запускаю синхронный парсинг`);
    console.log(`   Источники: ${sources.join(', ')}`);

    await this.parseNow(sources, filters, searchQuery);

    // Получаем свежие данные
    const freshVacancies = await vacancyService.findByFilters({
      ...filters,
      sources,
      workLocationType: filters.workLocationType, // Фильтр по типу локации
      limit: undefined,
      page: undefined
    });

    // Вычисляем пагинацию для свежих данных
    const freshTotal = freshVacancies.length;
    const freshTotalPages = Math.ceil(freshTotal / limit);
    const freshOffset = (page - 1) * limit;
    const freshPage = freshVacancies.slice(freshOffset, freshOffset + limit);
    
    console.log(`✅ Парсинг завершен. Найдено вакансий: ${freshTotal}`);
    
    const transformedFreshPage = freshPage.map(mapPrismaToVacancy);

    return {
      vacancies: transformedFreshPage,
      meta: {
        total: freshTotal,
        totalPages: freshTotalPages,
        source: 'fresh',
        lastUpdate: new Date(),
        updating: false,
        parseReason: 'Нет данных в БД'
      }
    };
  }

  /**
   * Поиск с семантическим маппингом
   * 
   * Логика:
   * 1. Делаем семантический поиск в словариках
   * 2. Находим все похожие специальности для каждого источника
   * 3. Ищем в БД по ОРИГИНАЛЬНОМУ запросу (не по точным совпадениям)
   * 4. Если нужен парсинг - парсим с ТОЧНЫМИ названиями из словариков
   */
  private async searchWithSemantics(filters: SearchFilters, userId?: string): Promise<SearchResult> {
    const sources = filters.sources || ['rabota.md', '999.md', 'makler.md'];
    const searchQuery = filters.keywords?.[0] || 'работа';
    const limit = filters.limit || 10;
    const page = filters.page || 1;

    console.log(`🧠 Семантический поиск для "${searchQuery}"`);

    // 1. Семантический поиск в словариках
    const mappings = await professionDictionaryService.findProfessionMappings(
      searchQuery,
      sources
    );

    console.log(`📋 Найдено совпадений в словариках:`, mappings.mappings.length);

    // 2. Ищем в БД по ОРИГИНАЛЬНОМУ запросу - берем ВСЕ для кэширования
    const allVacancies = await vacancyService.findByFilters({
      ...filters,
      sources,
      workLocationType: filters.workLocationType, // Фильтр по типу локации
      limit: undefined,
      page: undefined
    });

    console.log(`📊 Найдено в БД (по "${searchQuery}"): ${allVacancies.length} вакансий`);

    // Кэшируем результаты если есть userId
    if (userId && allVacancies.length > 0) {
      const cacheKey = cacheService.generateKey(userId, filters);
      const typedVacancies = allVacancies.map(mapPrismaToVacancy);
      await cacheService.cacheSearchResults(cacheKey, typedVacancies, filters);
    }

    // Вычисляем пагинацию
    const total = allVacancies.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const vacancies = allVacancies.slice(offset, offset + limit);

    // 3. Если данные есть - возвращаем, проверяем актуальность
    if (allVacancies.length > 0) {
      // Проверяем был ли парсинг с ТОЧНЫМИ названиями из словариков
      const parseHistory = await Promise.all(
        mappings.mappings.map(async (mapping) => {
          const lastParse = await prisma.parseLog.findFirst({
            where: {
              source: mapping.source,
              searchQuery: mapping.profession, // ТОЧНОЕ название из словаря
              status: 'success'
            },
            orderBy: { createdAt: 'desc' },
            select: { createdAt: true } // Выбираем только дату для оптимизации
          });

          return {
            source: mapping.source,
            profession: mapping.profession,
            lastParse: lastParse?.createdAt || null,
            wasRecentlyParsed: lastParse 
              ? (Date.now() - lastParse.createdAt.getTime()) < this.STALE_THRESHOLD
              : false
          };
        })
      );

      const sourcesToUpdate = parseHistory
        .filter(p => !p.wasRecentlyParsed)
        .map(p => ({ source: p.source, profession: p.profession }));

      if (sourcesToUpdate.length > 0) {
        console.log(`⏰ Запускаю фоновое обновление с точными названиями:`);
        sourcesToUpdate.forEach(s => {
          console.log(`   ${s.source}: "${s.profession}"`);
        });
        
        this.scheduleSemanticParsing(sourcesToUpdate);
      }

      const transformedVacancies = vacancies.map(mapPrismaToVacancy);

      return {
        vacancies: transformedVacancies,
        meta: {
          total,
          totalPages,
          source: 'cache',
          lastUpdate: new Date(),
          updating: sourcesToUpdate.length > 0,
          semanticMappings: mappings
        }
      };
    }

    // 4. Если данных нет - проверяем были ли недавно парсинги с точными названиями
    console.log(`\n📭 Данных нет по запросу "${searchQuery}", проверяю недавние парсинговые задачи`);
    
    // Проверяем были ли недавно парсинг с ТОЧНЫМИ названиями из словарей
    const recentParseHistory = await Promise.all(
      mappings.mappings.map(async (mapping) => {
        const lastParse = await prisma.parseLog.findFirst({
          where: {
            source: mapping.source,
            searchQuery: mapping.profession, // ТОЧНОЕ название из словаря
            status: 'success'
          },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true }
        });

        return {
          source: mapping.source,
          profession: mapping.profession,
          lastParse: lastParse?.createdAt || null,
          wasRecentlyParsed: lastParse 
            ? (Date.now() - lastParse.createdAt.getTime()) < this.STALE_THRESHOLD
            : false
        };
      })
    );

    // Если ни для одного источника не было недавнего парсинга с точными названиями - парсим
    const hasRecentParses = recentParseHistory.some(h => h.wasRecentlyParsed);
    
    if (!hasRecentParses) {
      console.log(`⏰ Ни для одного источника не было недавнего парсинга с точными названиями, запускаю семантический парсинг`);
      await this.parseWithSemantics(mappings);
    } else {
      console.log(`✅ Недавние парсинговые задачи найдены, пропускаю семантический парсинг`);
      // Проверим, есть ли теперь вакансии после недавнего парсинга
      const cachedVacancies = await vacancyService.findByFilters({
        ...filters,
        sources,
        workLocationType: filters.workLocationType, // Фильтр по типу локации
        limit: undefined,
        page: undefined
      });
      
      if (cachedVacancies.length > 0) {
        console.log(`📊 Найдено ${cachedVacancies.length} вакансий после проверки кэша`);
        // Вычисляем пагинацию для кэшированных данных
        const cachedTotal = cachedVacancies.length;
        const cachedTotalPages = Math.ceil(cachedTotal / limit);
        const cachedOffset = (page - 1) * limit;
        const cachedPage = cachedVacancies.slice(cachedOffset, cachedOffset + limit);
        
        // Трансформируем вакансии в формат Vacancy интерфейса
        const transformedCachedPage = cachedPage.map(mapPrismaToVacancy);
        
        return {
          vacancies: transformedCachedPage,
          meta: {
            total: cachedTotal,
            totalPages: cachedTotalPages,
            source: 'cache',
            lastUpdate: new Date(),
            updating: false,
            parseReason: 'Найдены вакансии после проверки кэша',
            semanticMappings: mappings
          }
        };
      }
    }
    
    // Получаем свежие данные
    const freshVacancies = await vacancyService.findByFilters({
      ...filters,
      sources,
      workLocationType: filters.workLocationType, // Фильтр по типу локации
      limit: undefined,
      page: undefined
    });

    // Вычисляем пагинацию для свежих данных
    const freshTotal = freshVacancies.length;
    const freshTotalPages = Math.ceil(freshTotal / limit);
    const freshOffset = (page - 1) * limit;
    const freshPage = freshVacancies.slice(freshOffset, freshOffset + limit);
    
    console.log(`✅ Парсинг завершен. Найдено вакансий: ${freshTotal}`);
    
    const transformedFreshPage = freshPage.map(mapPrismaToVacancy);

    return {
      vacancies: transformedFreshPage,
      meta: {
        total: freshTotal,
        totalPages: freshTotalPages,
        source: 'fresh',
        lastUpdate: new Date(),
        updating: false,
        parseReason: 'Семантический поиск - нет данных в БД',
        semanticMappings: mappings
      }
    };
  }

  /**
   * Парсинг с семантическими маппингами
   * Для каждого источника парсим с ТОЧНЫМ названием из словарика
   */
  private async parseWithSemantics(mappings: { mappings: Array<{ source: string; profession: string; similarity: number }> }): Promise<void> {
    console.log(`🚀 Запуск семантического парсинга`);

    // Группируем маппинги по источникам
    const groupedMappings: Record<string, Array<{ source: string; profession: string; similarity: number }>> = {};
    mappings.mappings.forEach((m: { source: string; profession: string; similarity: number }) => {
      if (!groupedMappings[m.source]) {
        groupedMappings[m.source] = [];
      }
      groupedMappings[m.source].push(m);
    });

    // Парсим каждый источник с лучшим совпадением
    const parsePromises = Object.entries(groupedMappings).map(([source, matches]) => {
      // Берем лучшее совпадение (с максимальной similarity)
      const bestMatch = matches.sort((a, b) => b.similarity - a.similarity)[0];
      
      console.log(`   ${source}: парсинг "${bestMatch.profession}" (similarity: ${bestMatch.similarity})`);
      
      return this.parseSource(source, bestMatch.profession, Date.now());
    });

    await Promise.allSettled(parsePromises);
  }

  /**
   * Фоновый парсинг с семантическими маппингами
   */
  private async scheduleSemanticParsing(sourcesToUpdate: Array<{ source: string; profession: string }>): Promise<void> {
    if (!this.parseQueue) {
      console.log('   ⚠️  Worker не доступен, пропускаю фоновый парсинг');
      return;
    }

    for (const { source, profession } of sourcesToUpdate) {
      try {
        await this.parseQueue.add(
          `semantic-${source}-${profession}`,
          { source, searchQuery: profession, maxPages: 5 },
          { 
            priority: 5, 
            removeOnComplete: true,
            jobId: `semantic-${source}-${profession}-${Date.now()}`
          }
        );

        console.log(`   📋 Задача добавлена: ${source} "${profession}"`);
      } catch {
        console.log(`   ⚠️  Не удалось добавить задачу для ${source}`);
      }
    }
  }

  private async checkParseHistory(sources: string[], searchQuery: string): Promise<Array<{ source: string; lastParse: Date | null; wasRecentlyParsed: boolean }>> {
    const history = await Promise.all(
      sources.map(async (source) => {
        // Ищем последний успешный парсинг для этого источника И поискового запроса
        const lastParse = await prisma.parseLog.findFirst({
          where: {
            source,
            searchQuery,
            status: 'success',
          },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true } // Выбираем только дату для оптимизации
        });

        // Проверяем, был ли парсинг недавно (в пределах порога устаревания)
        const wasRecentlyParsed = lastParse 
          ? (Date.now() - lastParse.createdAt.getTime()) < this.STALE_THRESHOLD
          : false;

        return {
          source,
          lastParse: lastParse?.createdAt || null,
          wasRecentlyParsed
        };
      })
    );

    return history;
  }

  private async getLastSuccessfulParse(source: string): Promise<Date | null> {
    const log = await prisma.parseLog.findFirst({
      where: { source, status: 'success' },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true }
    });

    return log?.createdAt || null;
  }

  private async parseNow(sources: string[], _filters: SearchFilters, searchQuery: string): Promise<Vacancy[]> {
    console.log(`\n🚀 Запуск парсинга: ${sources.join(', ')} для запроса "${searchQuery}"`);
    
    const startTime = Date.now();

    const parsePromises = sources.map(source => 
      this.parseSource(source, searchQuery, startTime)
    );
    
    const results = await Promise.allSettled(parsePromises);
    
    const allVacancies: Vacancy[] = [];
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        allVacancies.push(...result.value);
      } else {
        console.error(`❌ Ошибка парсинга ${sources[index]}:`, result.reason);
      }
    });

    console.log(`\n✅ Парсинг завершен: ${allVacancies.length} вакансий за ${Date.now() - startTime}мс`);

    return allVacancies;
  }

  private async parseSource(
    source: string, 
    searchQuery: string,
    startTime: number
  ): Promise<Vacancy[]> {
    try {
      console.log(`   🔍 Парсинг ${source} (запрос: "${searchQuery}")...`);
      
      let vacancies: Vacancy[] = [];
      let parser: { parse: (config: { baseUrl: string; searchQuery: string; maxPages: number }) => Promise<{ vacancies: Vacancy[] }> } | null = null;
    
    try {
      switch (source) {
        case 'rabota.md':
          parser = new RabotaMdParser({
            parseDetails: true,
            concurrency: 3
          });
          break;
          
        case '999.md':
          parser = new NineNineNineMdParser({
            parseDetails: true,
            concurrency: 3
          });
          break;
          
        case 'makler.md':
          parser = new MaklerMdParser({
            parseDetails: true,
            concurrency: 3
          });
          break;

        case 'hh.ru':
          parser = new HHRuParser();
          break;
          
        default:
          console.log(`   ⚠️  Парсер для ${source} не реализован`);
          return [];
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`   ❌ Ошибка инициализации парсера ${source}:`, errorMessage);
      return [];
    }

      const result = await parser.parse({
        baseUrl: source === 'rabota.md' ? 'https://www.rabota.md' : 
                 source === '999.md' ? 'https://999.md' :
                 source === 'makler.md' ? 'https://makler.md' :
                 'https://api.hh.ru',
        searchQuery,
        maxPages: 10
      });

      vacancies = result.vacancies;

      if (vacancies.length > 0) {
        const { created, updated } = await vacancyService.saveVacancies(vacancies);
        
        console.log(`   ✅ ${source}: ${created} новых, ${updated} обновлено`);

        await prisma.parseLog.create({
          data: {
            source,
            searchQuery,
            status: 'success',
            vacanciesFound: vacancies.length,
            vacanciesNew: created,
            duration: Date.now() - startTime
          }
        });
      } else {
        console.log(`   ⚠️  ${source}: вакансий не найдено`);
        
        await prisma.parseLog.create({
          data: {
            source,
            searchQuery,
            status: 'success',
            vacanciesFound: 0,
            vacanciesNew: 0,
            duration: Date.now() - startTime
          }
        });
      }

      return vacancies;

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`   ❌ Ошибка ${source}:`, errorMessage);
      
      await prisma.parseLog.create({
        data: {
          source,
          searchQuery,
          status: 'error',
          error: errorMessage,
          duration: Date.now() - startTime
        }
      });

      return [];
    }
  }

  private async scheduleBackgroundParsing(sources: string[], searchQuery: string): Promise<void> {
    if (!this.parseQueue) {
      console.log('   ⚠️  Worker не доступен, пропускаю фоновый парсинг');
      return;
    }

    for (const source of sources) {
      try {
        await this.parseQueue.add(
          `background-${source}-${searchQuery}`,
          { source, searchQuery, maxPages: 10 },
          { 
            priority: 5, 
            removeOnComplete: true,
            jobId: `bg-${source}-${searchQuery}-${Date.now()}`
          }
        );

        console.log(`   📋 Задача фонового парсинга добавлена: ${source}`);
      } catch (error) {
        console.log(`   ⚠️  Не удалось добавить задачу для ${source}:`, error);
      }
    }
  }

  async forceParse(sources?: string[], searchQuery?: string): Promise<{ success: boolean; results: Vacancy[] }> {
    const targetSources = sources || ['rabota.md', '999.md', 'makler.md'];
    const query = searchQuery || 'работа';
    
    console.log('🚀 Принудительный парсинг:', targetSources, `запрос: "${query}"`);

    const vacancies = await this.parseNow(targetSources, {}, query);
    
    return {
      success: true,
      results: vacancies
    };
  }

  async getStats(): Promise<Array<{ source: string; count: number; lastParse: Date | null; isStale: boolean; status: string }>> {
    const sources = ['rabota.md', '999.md', 'makler.md', 'hh.ru'];
    
    const stats = await Promise.all(
      sources.map(async (source) => {
        const count = await prisma.vacancy.count({ where: { source } });
        const lastParse = await this.getLastSuccessfulParse(source);
        const isStale = lastParse 
          ? Date.now() - lastParse.getTime() > this.STALE_THRESHOLD
          : true;

        return {
          source,
          count,
          lastParse,
          isStale,
          status: count === 0 ? 'empty' : isStale ? 'stale' : 'fresh'
        };
      })
    );

    return stats;
  }

  async cleanupOld(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await prisma.vacancy.deleteMany({
      where: { publishedAt: { lt: cutoffDate } }
    });

    console.log(`🗑️  Удалено ${result.count} вакансий старше ${daysOld} дней`);
    return result.count;
  }
}

export const vacancyManager = VacancyManager.getInstance();
