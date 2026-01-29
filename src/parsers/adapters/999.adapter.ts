/**
 * Адаптер для преобразования вакансий с 999.md в формат БД
 */

// src/adapters/999.adapter.ts

/**
 * Адаптер для преобразования вакансий с 999.md в формат БД
 */
import { BaseVacancyAdapter } from './base.adapter.js';
import { Vacancy as ParsedVacancy } from '../../types/vacancy.js';
import { Prisma } from '@prisma/client';

export class NineNineNineMdAdapter extends BaseVacancyAdapter {
  sourceName = '999.md';

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
      const company = vacancy.company?.trim() ||
                      vacancy.author?.trim() ||
                     'Не указана';

      // Обработка локации
      const location = (vacancy.location || vacancy.region || '').trim() || null;

      // Обработка описания
      const description = vacancy.description?.trim() || '';

      // Обработка языков как навыков
      const skills = Array.isArray(vacancy.languages) ?
        vacancy.languages.filter(lang => lang?.trim()) :
        [];

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

        // Опыт и тип работы
        experience: this.mapExperience(vacancy.experience),
        employment: this.mapEmployment(vacancy.employmentType),
        schedule: this.mapSchedule(vacancy.workPlace),

        // Навыки (из языков если есть)
        skills: skills,

        // Мета-данные
        source: this.sourceName,
        sourceId: vacancy.id.trim(),
        sourceUrl: vacancy.url.trim(),
        publishedAt: publishedAt,

        // Сырые данные для дополнительных полей 999.md
        rawData: {
          author: vacancy.author?.trim() || null,
          seasonal: typeof vacancy.seasonal === 'boolean' ? vacancy.seasonal : null,
          employmentType: vacancy.employmentType?.trim() || null,
          companyType: vacancy.companyType?.trim() || null,
          languages: skills,
          contactPerson: vacancy.contactPerson?.trim() || null,
          region: vacancy.region?.trim() || null,
          education: vacancy.education?.trim() || null,
          fullDescription: vacancy.fullDescription?.trim() || null,
          firstSeenAt: vacancy.firstSeenAt ? new Date(vacancy.firstSeenAt) : null,
          lastSeenAt: vacancy.lastSeenAt ? new Date(vacancy.lastSeenAt) : null,
          isActive: typeof vacancy.isActive === 'boolean' ? vacancy.isActive : true,
          // --- Добавляем информацию о конвертации ---
          originalSalary: vacancy.salary, // Сохраняем оригинальную строку
          convertedSalaryMin: convertedMinSalary,
          convertedSalaryMax: convertedMaxSalary,
          conversionSourceCurrency: currencyInfo?.source,
          conversionTargetCurrency: currencyInfo?.target,
        } satisfies Prisma.InputJsonValue,
      };
    } catch (error: unknown) {
      console.error(`❌ Ошибка в адаптере 999.md для вакансии ${vacancy.id}:`, {
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