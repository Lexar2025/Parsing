/**
 * Vacancy Manager - центральный менеджер для управления вакансиями
 * 
 * Новая логика:
 * 1. Сначала проверяем БД - если есть данные → отдаем сразу (cache)
 * 2. Проверяем логи парсинга - если устарели → запускаем фоновое обновление
 * 3. Если данных нет в БД → парсим СЕЙЧАС (fresh)
 * 4. Поддержка парсинга одного источника
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
   * Новая логика:
   * 1. Проверяем БД сначала
   * 2. Если есть данные → отдаем сразу (cache) + запускаем фоновое обновление если нужно
   * 3. Если данных нет → парсим СЕЙЧАС (fresh)
   */
  async search(filters: SearchFilters): Promise<SearchResult> {
    const sources = filters.sources || ['rabota.md', '999.md', 'makler.md'];
    const searchQuery = filters.keywords?.[0] || 'работа';

    console.log(`🔍 Поиск вакансий:`, { 
      keywords: filters.keywords, 
      sources,
      searchQuery 
    });

    // 1. СНАЧАЛА проверяем БД
    const vacancies = await vacancyService.findByFilters({
      ...filters,
      sources
    });

    console.log(`📊 Найдено в БД: ${vacancies.length} вакансий`);

    // 2. Проверяем историю парсинга для ЭТОГО запроса
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
    if (vacancies.length > 0) {
      console.log(`✅ Данные найдены в БД, возвращаю ${vacancies.length} вакансий`);
      
      // Если есть устаревшие источники → запускаем фоновое обновление
      if (sourcesToUpdate.length > 0) {
        console.log(`⏰ Запускаю фоновое обновление для: ${sourcesToUpdate.join(', ')}`);
        this.scheduleBackgroundParsing(sourcesToUpdate as any, searchQuery);
      }

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
          updating: sourcesToUpdate.length > 0 // Указываем что идет обновление в фоне
        }
      };
    }

    // 5. ЕСЛИ В БД НЕТ ДАННЫХ → парсим СЕЙЧАС
    console.log(`\n📭 Данных нет в БД, запускаю синхронный парсинг`);
    console.log(`   Источники: ${sources.join(', ')}`);
    
    await this.parseNow(sources as any, filters, searchQuery);
    
    // Получаем свежие данные
    const freshVacancies = await vacancyService.findByFilters({
      ...filters,
      sources
    });
    
    console.log(`✅ Парсинг завершен. Найдено вакансий: ${freshVacancies.length}`);
    
    return {
      vacancies: freshVacancies,
      meta: {
        total: freshVacancies.length,
        source: 'fresh',
        lastUpdate: new Date(),
        updating: false,
        parseReason: 'Нет данных в БД'
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
            searchQuery
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
            parseDetails: true,
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
            searchQuery,
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
          searchQuery,
          status: 'error',
          error: error.message,
          duration: Date.now() - startTime
        }
      });

      return [];
    }
  }

  /**
   * Фоновый парсинг через Worker (не блокирует ответ пользователю)
   */
  private async scheduleBackgroundParsing(sources: string[], searchQuery: string) {
    if (!this.parseQueue) {
      console.log('   ⚠️  Worker не доступен, пропускаю фоновый парсинг');
      return;
    }

    for (const source of sources) {
      try {
        await this.parseQueue.add(
          `background-${source}-${searchQuery}`,
          { source, searchQuery, maxPages: 5 },
          { 
            priority: 5, 
            removeOnComplete: true,
            jobId: `bg-${source}-${searchQuery}-${Date.now()}`
          }
        );

        console.log(`   📋 Задача фонового парсинга добавлена: ${source}`);
      } catch (error) {
        console.log(`   ⚠️  Не удалось добавить задачу для ${source}`);
      }
    }
  }

  /**
   * Принудительный парсинг (для API эндпоинта)
   */
  async forceParse(sources?: string[], searchQuery?: string): Promise<{ success: boolean; results: any[] }> {
    const targetSources = sources || ['rabota.md', '999.md', 'makler.md'];
    const query = searchQuery || 'работа';
    
    console.log('🚀 Принудительный парсинг:', targetSources, `запрос: "${query}"`);

    const vacancies = await this.parseNow(targetSources, {}, query);
    
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
