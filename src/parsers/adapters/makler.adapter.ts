// src/adapters/makler.adapter.ts

import { BaseVacancyAdapter } from './base.adapter.js';
import { Vacancy as ParsedVacancy } from '../../types/vacancy.js';
import { Prisma } from '@prisma/client';

export class MaklerMdAdapter extends BaseVacancyAdapter {
  sourceName = 'makler.md';

  // Обновляем конструктор, чтобы он мог принимать ExchangeRateProvider
  constructor(args?: ConstructorParameters<typeof BaseVacancyAdapter>[0]) {
    super(args);
  }

  toPrisma(vacancy: ParsedVacancy): Prisma.VacancyCreateInput {
    try {
      if (!vacancy.title || !vacancy.url || !vacancy.id) {
        throw new Error(`Отсутствуют обязательные поля для вакансии: ${vacancy.id}`);
      }

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

      const company = vacancy.company?.trim() || 'Не указана';
      const location = vacancy.location?.trim() || null;

      let description = '';
      if (vacancy.fullDescription) {
        description = vacancy.fullDescription.trim();
      } else if (vacancy.description) {
        description = vacancy.description.trim();
      }

      // --- Улучшенное извлечение навыков с помощью fuzzy-matcher ---
      let skills = this.extractNormalizedSkills(
        description,
        vacancy.fullDescription
      );
      
      // Добавляем специализацию и индустрию как навыки
      const additionalSkills: string[] = [];
      if (vacancy.specialization) {
        const specSkills = this.matchSkills([vacancy.specialization.trim()]);
        additionalSkills.push(...specSkills);
        // Также добавляем как есть, если не нашлось соответствие
        if (specSkills.length === 0) {
          additionalSkills.push(vacancy.specialization.trim());
        }
      }
      if (vacancy.industry) {
        const indSkills = this.matchSkills([vacancy.industry.trim()]);
        additionalSkills.push(...indSkills);
        if (indSkills.length === 0) {
          additionalSkills.push(vacancy.industry.trim());
        }
      }
      
      skills = [...new Set([...skills, ...additionalSkills])];

      // --- Используем новые методы конвертации ---
      const currencyInfo = this.extractSourceAndTargetCurrency(vacancy.salary);
      const convertedMinSalary = this.extractAndConvertSalaryMin(vacancy.salary);
      const convertedMaxSalary = this.extractAndConvertSalaryMax(vacancy.salary);

      return {
        title: vacancy.title.trim(),
        company: company,
        description: description,
        location: location,

        // Зарплата в целевой валюте ('RUB_PMR' по умолчанию)
        salaryMin: convertedMinSalary,
        salaryMax: convertedMaxSalary,
        // Исходная валюта (для справки, сохраняем как есть)
        salaryCurrency: currencyInfo?.source || 'MDL',

        // Опыт и тип работы - используем новые методы с fuzzy-matching
        experience: this.extractNormalizedExperience(vacancy.experience),
        employment: this.extractNormalizedEmployment(vacancy.schedule),
        schedule: this.extractNormalizedSchedule(vacancy.workPlace),

        skills: skills,

        source: this.sourceName,
        sourceId: vacancy.id.trim(),
        sourceUrl: vacancy.url.trim(),
        publishedAt: publishedAt,

        workLocationType: vacancy.workLocationType?.trim() || null,

        rawData: {
          vacancyType: vacancy.vacancyType?.trim() || null,
          industry: vacancy.industry?.trim() || null,
          specialization: vacancy.specialization?.trim() || null,
          education: vacancy.education?.trim() || null,
          fullDescription: vacancy.fullDescription?.trim() || null,
          firstSeenAt: vacancy.firstSeenAt ? new Date(vacancy.firstSeenAt) : null,
          lastSeenAt: vacancy.lastSeenAt ? new Date(vacancy.lastSeenAt) : null,
          isActive: typeof vacancy.isActive === 'boolean' ? vacancy.isActive : true,
          contactPerson: vacancy.contactPerson?.trim() || null,
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
      console.error(`❌ Ошибка в адаптере makler.md для вакансии ${vacancy.id}:`, {
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