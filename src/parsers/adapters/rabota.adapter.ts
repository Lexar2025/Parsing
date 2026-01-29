/**
 * Адаптер для преобразования вакансий с rabota.md в формат БД
 */

// src/adapters/rabota.adapter.ts

/**
 * Адаптер для преобразования вакансий с rabota.md в формат БД
 */
import { BaseVacancyAdapter } from './base.adapter.js';
import { Vacancy as ParsedVacancy } from '../../types/vacancy.js';
import { Prisma } from '@prisma/client';

export class RabotaMdAdapter extends BaseVacancyAdapter {
  sourceName = 'rabota.md';

  // Обновляем конструктор, чтобы он мог принимать ExchangeRateProvider
  constructor(args?: ConstructorParameters<typeof BaseVacancyAdapter>[0]) {
    super(args);
  }

  toPrisma(vacancy: ParsedVacancy): Prisma.VacancyCreateInput {
    try {
      // Валидация обязательных полей
      if (!vacancy.title || !vacancy.url || !vacancy.id) {
        throw new Error(`Отсутствуют обязательные поля для вакансии: ${vacancy.id}`);
      }

      // Обработка даты публикации
      let publishedAt: Date;
      if (vacancy.publishedAt) {
        if (vacancy.publishedAt instanceof Date) {
          publishedAt = vacancy.publishedAt;
        } else if (typeof vacancy.publishedAt === 'string') {
          publishedAt = new Date(vacancy.publishedAt);
          if (isNaN(publishedAt.getTime())) {
            publishedAt = new Date();
          }
        } else {
          publishedAt = new Date();
        }
      } else {
        publishedAt = new Date();
      }

      // Обработка компании
      const company = vacancy.company?.trim() || 'Не указана';

      // Обработка локации
      const location = vacancy.location?.trim() || null;

      // Обработка описания
      const description = vacancy.description?.trim() || '';

      // --- Улучшенное извлечение навыков с помощью fuzzy-matcher ---
      const skills = this.extractNormalizedSkills(
        vacancy.description,
        vacancy.fullDescription
      );

      // --- Используем новые методы конвертации ---
      const currencyInfo = this.extractSourceAndTargetCurrency(vacancy.salary);
      const convertedMinSalary = this.extractAndConvertSalaryMin(vacancy.salary);
      const convertedMaxSalary = this.extractAndConvertSalaryMax(vacancy.salary);

      return {
        // Унифицированные поля
        title: vacancy.title.trim(),
        company: company,
        description: description,
        location: location,

        // Зарплата - теперь в конвертированной валюте
        salaryMin: convertedMinSalary,
        salaryMax: convertedMaxSalary,
        // Сохраняем исходную валюту
        salaryCurrency: currencyInfo?.source || 'MDL',

        // Опыт и тип работы - используем новые методы с fuzzy-matching
        experience: this.extractNormalizedExperience(vacancy.experience),
        employment: this.extractNormalizedEmployment(vacancy.schedule),
        schedule: this.extractNormalizedSchedule(vacancy.workPlace),

        // Навыки
        skills: skills,

        // Мета-данные
        source: this.sourceName,
        sourceId: vacancy.id.trim(),
        sourceUrl: vacancy.url.trim(),
        publishedAt: publishedAt,

        // Сырые данные для отладки и дополнительных полей
        rawData: {
          education: vacancy.education?.trim() || null,
          fullDescription: vacancy.fullDescription?.trim() || null,
          firstSeenAt: vacancy.firstSeenAt ? new Date(vacancy.firstSeenAt) : null,
          lastSeenAt: vacancy.lastSeenAt ? new Date(vacancy.lastSeenAt) : null,
          isActive: typeof vacancy.isActive === 'boolean' ? vacancy.isActive : true,
          // --- Добавляем информацию о конвертации и нормализации ---
          originalSalary: vacancy.salary,
          convertedSalaryMin: convertedMinSalary,
          convertedSalaryMax: convertedMaxSalary,
          conversionSourceCurrency: currencyInfo?.source,
          conversionTargetCurrency: currencyInfo?.target,
          normalizedExperience: this.extractNormalizedExperience(vacancy.experience),
          normalizedEmployment: this.extractNormalizedEmployment(vacancy.schedule),
          normalizedSchedule: this.extractNormalizedSchedule(vacancy.workPlace),
          normalizedCurrency: this.extractNormalizedCurrency(vacancy.salary),
        } satisfies Prisma.InputJsonValue,
      };
    } catch (error: unknown) {
      console.error(`❌ Ошибка в адаптере rabota.md для вакансии ${vacancy.id}:`, {
        error: error instanceof Error ? error.message : String(error),
        vacancy: {
          id: vacancy.id,
          title: vacancy.title,
          url: vacancy.url
        }
      });
      throw error;
    }
  }
}
