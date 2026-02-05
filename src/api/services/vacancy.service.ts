/**
 * Сервис для работы с вакансиями в БД
 */

import { prisma } from '../../db/index.js';
import { Prisma, Vacancy } from '@prisma/client';
import { getAdapter } from '../../parsers/adapters/index.js';
import { Vacancy as ParsedVacancy } from '../../types/vacancy.js';
import CANONICAL_PROFESSIONS from '../../utils/dictionaries/canonical-professions.js';

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
      } catch (error) {
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
    employment?: string[]; // Тип занятости
    skills?: string[]; // Навыки
    sources?: string[];
    publishedAfter?: Date;
    limit?: number;
    page?: number;
    category?: string;
    workLocationType?: 'moldova' | 'abroad' | 'international';
  }): Promise<Vacancy[]> {
    const where: Prisma.VacancyWhereInput = {};
    const AND_conditions: Prisma.VacancyWhereInput[] = [];

    // Ключевые слова (поиск ТОЛЬКО в title)
    if (filters.keywords && filters.keywords.length > 0) {
      // Все ключевые слова должны быть в title (AND)
      AND_conditions.push({
        AND: filters.keywords.map(keyword => ({
          title: { contains: keyword, mode: 'insensitive' as const }
        }))
      });
    }

    // Локация (только для Moldova, для abroad не применяется)
    if (filters.locations && filters.locations.length > 0 && filters.workLocationType !== 'abroad' && filters.workLocationType !== 'international') {
      // Любая из указанных локаций (OR внутри AND)
      AND_conditions.push({
        OR: filters.locations.map(location => ({
          location: { contains: location.trim(), mode: 'insensitive' as const }
        }))
      });
    }

    // Минимальная зарплата
    if (filters.salaryMin) {
      AND_conditions.push({
        OR: [
          { salaryMax: { gte: filters.salaryMin } },
          { salaryMin: { gte: filters.salaryMin } }
        ]
      });
    }

    // Опыт (любой из указанных)
    if (filters.experience && filters.experience.length > 0) {
      AND_conditions.push({
        OR: filters.experience.map(exp => ({
          experience: { contains: exp.trim(), mode: 'insensitive' as const }
        }))
      });
    }

    // График работы (любой из указанных)
    if (filters.schedule && filters.schedule.length > 0) {
      AND_conditions.push({
        OR: filters.schedule.map(schedule => ({
          schedule: { contains: schedule.trim(), mode: 'insensitive' as const }
        }))
      });
    }

    // Тип занятости (любой из указанных)
    if (filters.employment && filters.employment.length > 0) {
      AND_conditions.push({
        OR: filters.employment.map(emp => ({
          employment: { contains: emp.trim(), mode: 'insensitive' as const }
        }))
      });
    }

    // Навыки (все указанные должны присутствовать)
    if (filters.skills && filters.skills.length > 0) {
      AND_conditions.push({
        AND: filters.skills.map(skill => ({
          skills: { has: skill.trim() }
        }))
      });
    }

    // Объединяем все условия через AND
    if (AND_conditions.length > 0) {
      where.AND = AND_conditions;
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

    // Тип локации (Молдова / за границей)
    if (filters.workLocationType) {
      where.workLocationType = filters.workLocationType;
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
