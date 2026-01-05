/**
 * Vacancy Manager - центральный менеджер для управления вакансиями
 * 
 * Функции:
 * - Проверка актуальности данных в БД
 * - Автоматический запуск парсинга при необходимости
 * - Умная выдача результатов (из БД или после парсинга)
 * - Управление фоновыми задачами
 */

import { prisma } from '../../db/index.js';
import { vacancyService } from '../../api/services/vacancy.service.js';
import { RabotaMdParser } from '../../parsers/rabotaMd.js';

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

  /**
   * Установить очередь для фоновых задач (если Worker запущен)
   */
  setQueue(queue: any) {
    this.parseQueue = queue;
  }

  /**
   * Главный метод поиска вакансий
   * Автоматически определяет нужен ли парсинг
   */
  async search(filters: SearchFilters): Promise<SearchResult> {
    const sources = filters.sources || ['rabota.md'];

    // 1. Проверяем актуальность данных для каждого источника
    const sourceStatus = await this.checkSourcesStatus(sources);

    // 2. Ищем в БД
    const vacancies = await vacancyService.findByFilters({
      ...filters,
      sources
    });

    // 3. Определяем нужен ли парсинг
    const needsParsing = sourceStatus.some(s => s.isStale || s.isEmpty);
    const isPartiallyStale = sourceStatus.some(s => s.isStale);

    // 4. Если данных нет вообще - парсим синхронно
    if (vacancies.length === 0 && needsParsing) {
      console.log('📭 БД пуста, запускаю синхронный парсинг...');
      
      const freshVacancies = await this.parseNow(sources, filters);
      
      return {
        vacancies: freshVacancies,
        meta: {
          total: freshVacancies.length,
          source: 'fresh',
          lastUpdate: new Date(),
          updating: false
        }
      };
    }

    // 5. Если данные старые - запускаем фоновый парсинг
    if (isPartiallyStale) {
      console.log('⏰ Данные устарели, запускаю фоновый парсинг...');
      await this.scheduleBackgroundParsing(sources);
    }

    // 6. Возвращаем что есть
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

  /**
   * Получить время последнего успешного парсинга
   */
  private async getLastSuccessfulParse(source: string): Promise<Date | null> {
    const log = await prisma.parseLog.findFirst({
      where: { source, status: 'success' },
      orderBy: { createdAt: 'desc' }
    });

    return log?.createdAt || null;
  }

  /**
   * Синхронный парсинг (блокирующий)
   */
  private async parseNow(sources: string[], filters: SearchFilters): Promise<any[]> {
    const allVacancies: any[] = [];
    const startTime = Date.now();

    for (const source of sources) {
      try {
        console.log(`🔍 Парсинг ${source}...`);
        
        let vacancies: any[] = [];

        if (source === 'rabota.md') {
          const parser = new RabotaMdParser({
            parseDetails: false,
            cacheEnabled: true,
            concurrency: 3
          });

          const result = await parser.parse({
            baseUrl: 'https://www.rabota.md',
            searchQuery: filters.keywords?.[0] || 'it',
            maxPages: 2
          });

          vacancies = result.vacancies;
        }

        if (vacancies.length > 0) {
          const { created, updated } = await vacancyService.saveVacancies(vacancies);
          
          console.log(`✅ ${source}: сохранено ${created} новых, ${updated} обновлено`);

          await prisma.parseLog.create({
            data: {
              source,
              status: 'success',
              vacanciesFound: vacancies.length,
              vacanciesNew: created,
              duration: Date.now() - startTime
            }
          });

          allVacancies.push(...vacancies);
        }

      } catch (error: any) {
        console.error(`❌ Ошибка парсинга ${source}:`, error.message);
        
        await prisma.parseLog.create({
          data: {
            source,
            status: 'error',
            error: error.message,
            duration: Date.now() - startTime
          }
        });
      }
    }

    return allVacancies;
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
          { source, searchQuery: 'it', maxPages: 5 },
          { priority: 5, removeOnComplete: true }
        );

        console.log(`📋 Добавлена задача парсинга для ${source}`);
      } catch (error) {
        console.log(`⚠️  Не удалось добавить задачу для ${source}`);
      }
    }
  }

  /**
   * Получить статистику по источникам
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

  /**
   * Очистить старые вакансии
   */
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
