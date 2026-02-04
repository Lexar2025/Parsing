/**
 * Сервис для работы с вакансиями в БД
 */

import { prisma } from '../../db/index.js';
import { Prisma, Vacancy } from '@prisma/client';
import { getAdapter } from '../../parsers/adapters/index.js';
import { Vacancy as ParsedVacancy } from '../../types/vacancy.js';
import CANONICAL_PROFESSIONS from '../../utils/dictionaries/canonical-professions.js';
import type { CanonicalProfession } from '../../utils/dictionaries/canonical-professions.js';

export class VacancyService {
  /**
   * Сохранить вакансии в БД (upsert - создать или обновить)
   * Добавляем определение категории при сохранении
   */
  async saveVacancies(vacancies: ParsedVacancy[]): Promise<{ created: number; updated: number }> {
    let created = 0;
    let updated = 0;

    for (const vacancy of vacancies) {
      try {
        const source = vacancy.source as keyof typeof getAdapter;
        const adapter = getAdapter(source);
        const prismaData = adapter.toPrisma(vacancy);

        // Определяем категорию на основе названия вакансии
        const category = this.determineCategory(vacancy.title, source);

        const result = await prisma.vacancy.upsert({
          where: {
            source_sourceId: {
              source: prismaData.source,
              sourceId: prismaData.sourceId,
            },
          },
          create: {
            ...prismaData,
            category // Добавляем категорию при создании
          },
          update: {
            ...prismaData,
            category, // Обновляем категорию при обновлении
            updatedAt: new Date(),
          },
        });

        // Проверяем была ли создана или обновлена
        if (result.createdAt && result.updatedAt &&
            result.createdAt.getTime() === result.updatedAt.getTime()) {
          created++;
        } else {
          updated++;
        }
      } catch (error: unknown) {
        console.error(`❌ Ошибка получения адаптера для источника ${vacancy.source}:`, {
          error: error instanceof Error ? error.message : String(error),
          vacancyId: vacancy.id,
          source: vacancy.source
        });
        continue;
      }
    }

    return { created, updated };
  }

  /**
   * Определить категорию вакансии на основе названия
   * Использует канонический справочник для сопоставления
   */
  private determineCategory(title: string, source: string): string | null {
    const titleLower = title.toLowerCase().trim();

    // Ищем в каноническом справочнике
    for (const prof of CANONICAL_PROFESSIONS) {
      // Проверяем каноническое название
      if (titleLower === prof.canonicalName.toLowerCase()) {
        return prof.canonicalName;
      }

      // Проверяем синонимы
      if (prof.synonyms.some(syn => syn.toLowerCase() === titleLower)) {
        return prof.canonicalName;
      }

      // Проверяем маппинг для конкретного источника
      const sourceMapping = prof.sourceMappings[source as keyof typeof prof.sourceMappings];
      if (sourceMapping) {
        if (sourceMapping.some(mapping => mapping.toLowerCase() === titleLower)) {
          return prof.canonicalName;
        }
      }

      // Частичное совпадение (подстрока)
      if (titleLower.includes(prof.canonicalName.toLowerCase())) {
        return prof.canonicalName;
      }
    }

    // Если не нашли категорию - возвращаем null
    return null;
  }

  /**
   * Найти вакансии по фильтрам
   */
  async findByFilters(filters: {
    keywords?: string[];
    locations?: string[];
    salaryMin?: number;
    experience?: string[];
    schedule?: string[];
    sources?: string[];
    publishedAfter?: Date;
    limit?: number;
    page?: number;
    category?: string; // Новый параметр: фильтр по категории
  }): Promise<Vacancy[]> {
    const where: Prisma.VacancyWhereInput = {};
    const OR_conditions: Prisma.VacancyWhereInput[] = [];

    // Ключевые слова (поиск в title и description)
    if (filters.keywords && filters.keywords.length > 0) {
      for (const keyword of filters.keywords) {
        OR_conditions.push({
          OR: [
            { title: { contains: keyword, mode: 'insensitive' as const } },
            { description: { contains: keyword, mode: 'insensitive' as const } },
          ],
        });
      }
    }

    // Локация
    if (filters.locations && filters.locations.length > 0) {
      for (const location of filters.locations) {
        OR_conditions.push({
          location: {
            contains: location.trim(),
            mode: 'insensitive' as const
          }
        });
      }
    }

    // Минимальная зарплата
    if (filters.salaryMin) {
      OR_conditions.push({
        OR: [
          { salaryMax: { gte: filters.salaryMin } },
          { salaryMin: { gte: filters.salaryMin } }
        ]
      });
    }

    // Опыт
    if (filters.experience && filters.experience.length > 0) {
      for (const exp of filters.experience) {
        OR_conditions.push({
          experience: {
            contains: exp.trim(),
            mode: 'insensitive' as const
          }
        });
      }
    }

    // График работы
    if (filters.schedule && filters.schedule.length > 0) {
      for (const schedule of filters.schedule) {
        OR_conditions.push({
          schedule: {
            contains: schedule.trim(),
            mode: 'insensitive' as const
          }
        });
      }
    }

    // Если есть OR условия, объединяем их
    if (OR_conditions.length > 0) {
      where.OR = OR_conditions;
    }

    // Источники (AND условие)
    if (filters.sources && filters.sources.length > 0) {
      where.source = {
        in: filters.sources,
      };
    }

    // Категория (новый фильтр)
    if (filters.category) {
      where.category = filters.category;
    }

    // Дата публикации (AND условие)
    if (filters.publishedAfter) {
      where.publishedAt = {
        gte: filters.publishedAfter,
      };
    }

    return prisma.vacancy.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
      take: Math.min(filters.limit || 50, 100), // Максимум 100 записей за раз
      skip: filters.page ? (filters.page - 1) * (filters.limit || 50) : 0,
    });
  }

  /**
   * Получить вакансию по ID
   */
  async getById(id: string): Promise<Vacancy | null> {
    return prisma.vacancy.findUnique({
      where: { id },
    });
  }

  /**
   * Получить вакансию по source и sourceId
   */
  async getBySourceId(source: string, sourceId: string): Promise<Vacancy | null> {
    return prisma.vacancy.findUnique({
      where: {
        source_sourceId: { source, sourceId },
      },
    });
  }

  /**
   * Удалить старые вакансии (старше N дней)
   */
  async deleteOlderThan(days: number): Promise<number> {
    const date = new Date();
    date.setDate(date.getDate() - days);

    const result = await prisma.vacancy.deleteMany({
      where: {
        publishedAt: {
          lt: date,
        },
      },
    });

    return result.count;
  }

  /**
   * Получить статистику по источникам
   */
  async getStats(): Promise<{ source: string; count: number }[]> {
    const result = await prisma.vacancy.groupBy({
      by: ['source'],
      _count: {
        id: true,
      },
    });

    return result.map((r) => ({
      source: r.source,
      count: r._count.id,
    }));
  }

  /**
   * Получить время последнего парсинга для источника
   */
  async getLastParseTime(source: string): Promise<Date | null> {
    const log = await prisma.parseLog.findFirst({
      where: { source, status: 'success' },
      orderBy: { createdAt: 'desc' },
    });

    return log?.createdAt || null;
  }
}

// Singleton
export const vacancyService = new VacancyService();
