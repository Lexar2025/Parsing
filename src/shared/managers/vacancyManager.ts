/**
 * Vacancy Manager - центральный менеджер для управления вакансиями
 * 
 * Умная логика:
 * - Проверяет историю парсинга ПО КОНКРЕТНОМУ searchQuery
 * - Парсит только те источники, которые не парсились недавно
 * - Если все источники парсились недавно → берет из БД (cache)
 * - Если есть источники без недавнего парсинга → парсит их (fresh)
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
   * 
   * Логика:
   * 1. Проверяет историю парсинга для ЭТОГО searchQuery
   * 2. Определяет какие источники нужно парсить (те, что не парсились недавно)
   * 3. Если есть источники для парсинга → парсит их
   * 4. Если все источники парсились недавно → берет из БД
   */
  async search(filters: SearchFilters): Promise<SearchResult> {
    const sources = filters.sources || ['rabota.md', '999.md', 'makler.md'];
    const searchQuery = filters.keywords?.[0] || 'работа';

    console.log(`🔍 Поиск вакансий:`, { 
      keywords: filters.keywords, 
      sources,
      searchQuery 
    });

    // 1. Проверяем историю парсинга для ЭТОГО запроса по каждому источнику
    const parseHistory = await this.checkParseHistory(sources, searchQuery);
    
    console.log(`📊 История парсинга для "${searchQuery}":`);
    parseHistory.forEach(h => {
      console.log(`   ${h.source}: ${h.wasRecentlyParsed ? '✅ недавно' : '❌ устарел'} (${h.lastParse?.toLocaleString() || 'никогда'})`);
    });

    // 2. Определяем какие источники нужно парсить
    const sourcesToParse = parseHistory
      .filter(p => !p.wasRecentlyParsed)
      .map(p => p.source);

    // 3. Если есть источники для парсинга → парсим их
    if (sourcesToParse.length > 0) {
      console.log(`\n📭 Запускаю парсинг ${sourcesToParse.length} источников: ${sourcesToParse.join(', ')}`);
      console.log(`   Причина: нет недавнего парсинга для запроса "${searchQuery}"`);
      
      await this.parseNow(sourcesToParse as any, filters, searchQuery);
      
      // Получаем свежие данные (из ВСЕХ источников, включая те что были в кеше)
      const vacancies = await vacancyService.findByFilters({
        ...filters,
        sources
      });
      
      console.log(`✅ Парсинг завершен. Найдено вакансий: ${vacancies.length}`);
      
      return {
        vacancies,
        meta: {
          total: vacancies.length,
          source: 'fresh',
          lastUpdate: new Date(),
          updating: false,
          parseReason: `Парсинг ${sourcesToParse.length} источников: ${sourcesToParse.join(', ')}`
        }
      };
    }

    // 4. Все источники парсились недавно → берем из БД
    console.log(`\n✅ Все источники парсились недавно для "${searchQuery}", беру из БД`);
    
    const vacancies = await vacancyService.findByFilters({
      ...filters,
      sources
    });

    const lastUpdate = parseHistory.reduce((latest, p) => {
      if (!p.lastParse) return latest;
      return !latest || p.lastParse > latest ? p.lastParse : latest;
    }, null as Date | null);

    console.log(`📊 Найдено в БД: ${vacancies.length} вакансий`);

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
   * Возвращает информацию по каждому источнику
   */
  private async checkParseHistory(sources: string[], searchQuery: string) {
    const history = await Promise.all(
      sources.map(async (source) => {
        // Ищем последний УСПЕШНЫЙ парсинг для ЭТОГО запроса
        const lastParse = await prisma.parseLog.findFirst({
          where: {
            source,
            status: 'success',
            searchQuery // ← Ищем точное совпадение поискового запроса
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
   * Синхронный парсинг указанных источников параллельно
   */
  private async parseNow(sources: string[], _filters: SearchFilters, searchQuery: string): Promise<any[]> {
    console.log(`\n🚀 Запуск парсинга: ${sources.join(', ')} для запроса "${searchQuery}"`);
    
    const startTime = Date.now();

    // Парсим указанные источники параллельно
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

    console.log(`\n✅ Парсинг завершен: ${allVacancies.length} вакансий за ${Date.now() - startTime}мс`);

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
            parseDetails: false,
            cacheEnabled: true,
            concurrency: 3
          });
          break;
          
        case '999.md':
          parser = new NineNineNineMdParser({
            parseDetails: true, // ← ВКЛЮЧАЕМ детальный парсинг для 999.md
            cacheEnabled: true,
            concurrency: 3,
            headless: true
          });
          break;
          
        case 'makler.md':
          parser = new MaklerMdParser({
            parseDetails: false,
            cacheEnabled: true,
            concurrency: 3,
            headless: true
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
        maxPages: 3
      });

      vacancies = result.vacancies;

      if (vacancies.length > 0) {
        const { created, updated } = await vacancyService.saveVacancies(vacancies);
        
        console.log(`   ✅ ${source}: ${created} новых, ${updated} обновлено`);

        // Логируем с указанием поискового запроса
        await prisma.parseLog.create({
          data: {
            source,
            searchQuery, // ← Сохраняем поисковый запрос
            status: 'success',
            vacanciesFound: vacancies.length,
            vacanciesNew: created,
            duration: Date.now() - startTime
          }
        });
      } else {
        console.log(`   ⚠️  ${source}: вакансий не найдено`);
        
        // Логируем даже если ничего не найдено
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

    } catch (error: any) {
      console.error(`   ❌ Ошибка ${source}:`, error.message);
      
      await prisma.parseLog.create({
        data: {
          source,
          searchQuery, // ← Сохраняем поисковый запрос и при ошибке
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
