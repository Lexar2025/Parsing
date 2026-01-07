/**
 * Vacancy Manager - центральный менеджер для управления вакансиями
 * 
 * Умная логика:
 * - Парсит ВСЕ источники параллельно
 * - Проверяет по логам парсинга (чтобы не парсить одинаковые запросы)
 * - Если БД пуста или нет вакансий по запросу → парсинг СЕЙЧАС
 * - Если данные старые → фоновый парсинг
 */

import { prisma } from '../../db/index.js';
import { vacancyService } from '../../api/services/vacancy.service.js';
import { RabotaMdParser } from '../../parsers/rabotaMd.js';
import { NineNineNineMdParser } from '../../parsers/nineNineNineMd.js';
import { MaklerMdParser } from '../../parsers/maklerMd.js';

export interface SearchFilters {
  keywords?: string[];
  locations?: string[];
  salaryMin?: number;
  experience?: string[];
  schedule?: string[];
  sources?: ('rabota.md' | '999.md' | 'makler.md')[];
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  vacancies: any[];
  meta: {
    total: number;
    source: 'cache' | 'fresh' | 'partial';
    lastUpdate: Date | null;
    updating: boolean;
    parseReason?: string;
  };
}

export class VacancyManager {
  private static instance: VacancyManager;
  private readonly STALE_THRESHOLD = 12 * 60 * 60 * 1000; // 12 часов
  private parseQueue: any = null;

  private constructor() {}

  static getInstance(): VacancyManager {
    if (!VacancyManager.instance) {
      VacancyManager.instance = new VacancyManager();
    }
    return VacancyManager.instance;
  }

  setQueue(queue: any) {
    this.parseQueue = queue;
  }

  /**
   * Главный метод поиска вакансий
   */
  async search(filters: SearchFilters): Promise<SearchResult> {
    const sources = filters.sources || ['rabota.md', '999.md', 'makler.md'];
    const searchQuery = filters.keywords?.[0] || 'работа';

    console.log(`🔍 Поиск вакансий:`, { 
      keywords: filters.keywords, 
      sources 
    });

    // 1. Проверяем был ли уже парсинг с таким запросом
    const parseHistory = await this.checkParseHistory(sources, searchQuery);
    
    // 2. Ищем в БД
    const vacancies = await vacancyService.findByFilters({
      ...filters,
      sources
    });

    console.log(`📊 Найдено в БД: ${vacancies.length} вакансий`);

    // 3. Определяем нужен ли парсинг
    let needsParsing = false;
    let parseReason = '';

    // Если БД пуста
    if (vacancies.length === 0) {
      // Проверяем был ли уже парсинг с ЭТИМ запросом
      const recentParse = parseHistory.find(p => p.wasRecentlyParsed);
      
      if (recentParse) {
        console.log(`   ℹ️  Запрос "${searchQuery}" уже парсился недавно (${recentParse.source})`);
        console.log(`   ⏰ Последний парсинг: ${recentParse.lastParse?.toLocaleString()}`);
        // Не парсим повторно если недавно уже парсили ЭТОТ запрос
        needsParsing = false;
      } else {
        console.log(`   📭 Нет вакансий по запросу "${searchQuery}"`);
        needsParsing = true;
        parseReason = 'Нет результатов по этому запросу';
      }
    }

    // Или если данные старые и есть источники без недавнего парсинга
    const staleSources = parseHistory.filter(p => !p.wasRecentlyParsed);
    if (!needsParsing && staleSources.length > 0) {
      console.log(`   ⏰ Устаревшие источники: ${staleSources.map(s => s.source).join(', ')}`);
      needsParsing = true;
      parseReason = 'Данные устарели';
    }

    // 4. Парсим если нужно
    if (needsParsing) {
      console.log(`📭 Запускаю парсинг! Причина: ${parseReason}`);
      
      await this.parseNow(sources, filters, searchQuery);
      
      // Применяем фильтры к свежим данным
      const filtered = await vacancyService.findByFilters({
        ...filters,
        sources
      });
      
      return {
        vacancies: filtered,
        meta: {
          total: filtered.length,
          source: 'fresh',
          lastUpdate: new Date(),
          updating: false,
          parseReason
        }
      };
    }

    // 5. Возвращаем что есть
    const lastUpdate = parseHistory.reduce((latest, p) => {
      if (!p.lastParse) return latest;
      return !latest || p.lastParse > latest ? p.lastParse : latest;
    }, null as Date | null);

    return {
      vacancies,
      meta: {
        total: vacancies.length,
        source: 'cache',
        lastUpdate,
        updating: false
      }
    };
  }

  /**
   * Проверяет историю парсинга с учетом поискового запроса
   */
  private async checkParseHistory(sources: string[], searchQuery: string) {
    const history = await Promise.all(
      sources.map(async (source) => {
        // Ищем последний УСПЕШНЫЙ парсинг для ЭТОГО запроса
        const lastParse = await prisma.parseLog.findFirst({
          where: {
            source,
            status: 'success',
            searchQuery // Ищем точное совпадение поискового запроса
          },
          orderBy: { createdAt: 'desc' }
        });

        const wasRecentlyParsed = lastParse 
          ? Date.now() - lastParse.createdAt.getTime() < this.STALE_THRESHOLD
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
      orderBy: { createdAt: 'desc' }
    });

    return log?.createdAt || null;
  }

  /**
   * Синхронный парсинг ВСЕХ источников параллельно
   */
  private async parseNow(sources: string[], _filters: SearchFilters, searchQuery: string): Promise<any[]> {
    console.log(`🚀 Запуск парсинга: ${sources.join(', ')} для запроса "${searchQuery}"`);
    
    const startTime = Date.now();

    // Парсим ВСЕ источники параллельно
    const parsePromises = sources.map(source => 
      this.parseSource(source, searchQuery, startTime)
    );
    
    const results = await Promise.allSettled(parsePromises);
    
    // Собираем успешные результаты
    const allVacancies: any[] = [];
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        allVacancies.push(...result.value);
      } else {
        console.error(`❌ Ошибка парсинга ${sources[index]}:`, result.reason);
      }
    });

    console.log(`✅ Парсинг завершен: ${allVacancies.length} вакансий за ${Date.now() - startTime}мс`);

    return allVacancies;
  }

  /**
   * Парсинг одного источника
   */
  private async parseSource(
    source: string, 
    searchQuery: string,
    startTime: number
  ): Promise<any[]> {
    try {
      console.log(`   🔍 Парсинг ${source} (запрос: "${searchQuery}")...`);
      
      let vacancies: any[] = [];
      let parser: any;

      // Выбираем парсер
      switch (source) {
        case 'rabota.md':
          parser = new RabotaMdParser({
            parseDetails: true,
            cacheEnabled: true,
            concurrency: 3
          });
          break;
          
        case '999.md':
          parser = new NineNineNineMdParser({
            parseDetails: true, // ВКЛЮЧАЕМ детали для 999.md
            cacheEnabled: true,
            concurrency: 3,
            headless: true
          });
          break;
          
        case 'makler.md':
          parser = new MaklerMdParser({
            parseDetails: true,
            cacheEnabled: true,
            concurrency: 3
          });
          break;
          
        default:
          console.log(`   ⚠️  Парсер для ${source} не реализован`);
          return [];
      }

      const result = await parser.parse({
        baseUrl: source === 'rabota.md' ? 'https://www.rabota.md' : 
                 source === '999.md' ? 'https://999.md' :
                 'https://makler.md',
        searchQuery,
        maxPages: 10
      });

      vacancies = result.vacancies;

      if (vacancies.length > 0) {
        const { created, updated } = await vacancyService.saveVacancies(vacancies);
        
        console.log(`   ✅ ${source}: ${created} новых, ${updated} обновлено`);

        // Логируем с указанием поискового запроса
        await prisma.parseLog.create({
          data: {
            source,
            searchQuery, // Сохраняем поисковый запрос
            status: 'success',
            vacanciesFound: vacancies.length,
            vacanciesNew: created,
            duration: Date.now() - startTime
          }
        });
      }

      return vacancies;

    } catch (error: any) {
      console.error(`   ❌ Ошибка ${source}:`, error.message);
      
      await prisma.parseLog.create({
        data: {
          source,
          searchQuery, // Сохраняем поисковый запрос и при ошибке
          status: 'error',
          error: error.message,
          duration: Date.now() - startTime
        }
      });

      return [];
    }
  }

  private async scheduleBackgroundParsing(_sources: string[]) {
    if (!this.parseQueue) {
      console.log('⚠️  Worker не доступен, пропускаю фоновый парсинг');
      return;
    }

    for (const source of _sources) {
      try {
        await this.parseQueue.add(
          `background-${source}`,
          { source, searchQuery: 'работа', maxPages: 5 },
          { priority: 5, removeOnComplete: true }
        );

        console.log(`   📋 Добавлена задача парсинга для ${source}`);
      } catch (error) {
        console.log(`   ⚠️  Не удалось добавить задачу для ${source}`);
      }
    }
  }

  async forceParse(sources?: string[]): Promise<{ success: boolean; results: any[] }> {
    const targetSources = sources || ['rabota.md', '999.md', 'makler.md'];
    
    console.log('🚀 Принудительный парсинг:', targetSources);

    const vacancies = await this.parseNow(targetSources, {}, 'работа');
    
    return {
      success: true,
      results: vacancies
    };
  }

  async getStats() {
    const sources = ['rabota.md', '999.md', 'makler.md'];
    
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
    cutoffDate.setDate(cutoffDate.getTime() - daysOld);

    const result = await prisma.vacancy.deleteMany({
      where: { publishedAt: { lt: cutoffDate } }
    });

    console.log(`🗑️  Удалено ${result.count} вакансий старше ${daysOld} дней`);
    return result.count;
  }
}

export const vacancyManager = VacancyManager.getInstance();
