/**
 * Vacancy Manager - центральный менеджер для управления вакансиями
 * 
 * Умная логика:
 * - Парсит ВСЕ источники параллельно
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

    console.log(`🔍 Поиск вакансий:`, { 
      keywords: filters.keywords, 
      sources 
    });

    // 1. Проверяем актуальность данных
    const sourceStatus = await this.checkSourcesStatus(sources);

    // 2. Ищем в БД
    const vacancies = await vacancyService.findByFilters({
      ...filters,
      sources
    });

    console.log(`📊 Найдено в БД: ${vacancies.length} вакансий`);

    // 3. Логика парсинга
    const needsParsing = sourceStatus.some(s => s.isStale || s.isEmpty);
    
    // Если нет результатов ИЛИ нет данных вообще → парсим СЕЙЧАС
    if (vacancies.length === 0 || needsParsing) {
      console.log('📭 Нужен парсинг!');
      console.log('   Причины:', {
        noResults: vacancies.length === 0,
        staleData: sourceStatus.some(s => s.isStale),
        emptyDB: sourceStatus.some(s => s.isEmpty)
      });
      
      await this.parseNow(sources, filters);
      
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
          updating: false
        }
      };
    }

    // Если данные старые но есть результаты → фоновый парсинг
    const isPartiallyStale = sourceStatus.some(s => s.isStale);
    if (isPartiallyStale) {
      console.log('⏰ Данные старые, запускаю фоновый парсинг...');
      await this.scheduleBackgroundParsing(sources);
    }

    const lastUpdate = sourceStatus.reduce((latest, s) => {
      if (!s.lastParse) return latest;
      return !latest || s.lastParse > latest ? s.lastParse : latest;
    }, null as Date | null);

    return {
      vacancies,
      meta: {
        total: vacancies.length,
        source: isPartiallyStale ? 'partial' : 'cache',
        lastUpdate,
        updating: isPartiallyStale
      }
    };
  }

  /**
   * Проверяет статус источников
   */
  private async checkSourcesStatus(sources: string[]) {
    const statuses = await Promise.all(
      sources.map(async (source) => {
        const lastParse = await this.getLastSuccessfulParse(source);
        const count = await prisma.vacancy.count({ where: { source } });

        const isEmpty = count === 0;
        const isStale = lastParse 
          ? Date.now() - lastParse.getTime() > this.STALE_THRESHOLD
          : true;

        return { source, isEmpty, isStale, count, lastParse };
      })
    );

    return statuses;
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
  private async parseNow(sources: string[], filters: SearchFilters): Promise<any[]> {
    console.log(`🚀 Запуск парсинга: ${sources.join(', ')}`);
    
    const startTime = Date.now();

    // Парсим ВСЕ источники параллельно
    const parsePromises = sources.map(source => this.parseSource(source, filters, startTime));
    
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
  private async parseSource(source: string, filters: SearchFilters, startTime: number): Promise<any[]> {
    try {
      console.log(`   🔍 Парсинг ${source}...`);
      
      let vacancies: any[] = [];

      // Пока реализован только rabota.md
      if (source === 'rabota.md') {
        const parser = new RabotaMdParser({
          parseDetails: true,
          cacheEnabled: true,
          concurrency: 3
        });

        const result = await parser.parse({
          baseUrl: 'https://www.rabota.md',
          searchQuery: filters.keywords?.[0] || 'работа', // По умолчанию ищем "работа"
          maxPages: 10 // 10 страниц для скорости
        });

        vacancies = result.vacancies;
            } else if (source === '999.md') {
      const parser = new NineNineNineMdParser({
        parseDetails: true,
        cacheEnabled: true,
        concurrency: 3
      });

      const result = await parser.parse({
        baseUrl: 'https://999.md',
        searchQuery: filters.keywords?.[0] || 'работа',
        maxPages: 10
      });

      vacancies = result.vacancies;
    } else if (source === 'makler.md') {
      const parser = new MaklerMdParser({
        parseDetails: true,
        cacheEnabled: true,
        concurrency: 3
      });

      const result = await parser.parse({
        baseUrl: 'https://makler.md',
        searchQuery: filters.keywords?.[0] || 'работа',
        maxPages: 10
      });
      vacancies = result.vacancies;
      } else {
        console.log(`   ⚠️  Парсер для ${source} еще не реализован`);
        return [];
      }

      if (vacancies.length > 0) {
        const { created, updated } = await vacancyService.saveVacancies(vacancies);
        
        console.log(`   ✅ ${source}: ${created} новых, ${updated} обновлено`);

        await prisma.parseLog.create({
          data: {
            source,
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
          status: 'error',
          error: error.message,
          duration: Date.now() - startTime
        }
      });

      return [];
    }
  }

  /**
   * Запланировать фоновый парсинг
   */
  private async scheduleBackgroundParsing(sources: string[]) {
    if (!this.parseQueue) {
      console.log('⚠️  Worker не доступен, пропускаю фоновый парсинг');
      return;
    }

    for (const source of sources) {
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

  /**
   * Принудительный парсинг
   */
  async forceParse(sources?: string[]): Promise<{ success: boolean; results: any[] }> {
    const targetSources = sources || ['rabota.md', '999.md', 'makler.md'];
    
    console.log('🚀 Принудительный парсинг:', targetSources);

    const vacancies = await this.parseNow(targetSources, {});
    
    return {
      success: true,
      results: vacancies
    };
  }

  /**
   * Статистика
   */
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
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await prisma.vacancy.deleteMany({
      where: { publishedAt: { lt: cutoffDate } }
    });

    console.log(`🗑️  Удалено ${result.count} вакансий старше ${daysOld} дней`);
    return result.count;
  }
}

export const vacancyManager = VacancyManager.getInstance();
