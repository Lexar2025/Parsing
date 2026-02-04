// src/adapters/makler.adapter.ts
import { BaseVacancyAdapter } from './base.adapter.js';
import { Vacancy as ParsedVacancy } from '../../types/vacancy.js';
import { Prisma } from '@prisma/client';

export class MaklerMdAdapter extends BaseVacancyAdapter {
  sourceName = 'makler.md';

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

      // --- Обработка компании ---
      let company = vacancy.company?.trim() || 'Не указана';
      // Если парсер не нашел компанию, ищем в описании
      const fullDescriptionText = vacancy.fullDescription || vacancy.description || '';
      if (company === 'Не указана' && fullDescriptionText) {
        const extractedCompany = this.extractCompanyFromText(fullDescriptionText);
        if (extractedCompany) {
          company = extractedCompany;
        }
      }

      const location = vacancy.location?.trim() || null;

      // --- Обработка описания ---
      let description = '';
      if (vacancy.fullDescription) {
        description = vacancy.fullDescription.trim();
      } else if (vacancy.description) {
        description = vacancy.description.trim();
      }

      // --- Обработка зарплаты ---
      let salary = vacancy.salary;
      // Если парсер не нашел зарплату, ищем в описании
      if (!salary && fullDescriptionText) {
        salary = this.extractSalaryFromText(fullDescriptionText);
      }

      // --- Извлечение навыков ТОЛЬКО из описания ---
      const skills = this.extractNormalizedSkills(description, vacancy.fullDescription);

      // --- Используем новые методы конвертации ---
      const currencyInfo = this.extractSourceAndTargetCurrency(salary);
      const convertedMinSalary = this.extractAndConvertSalaryMin(salary);
      const convertedMaxSalary = this.extractAndConvertSalaryMax(salary);

      // --- Используем новые методы нормализации ---
      const normalizedExperience = this.extractNormalizedExperience(vacancy.experience);
      const normalizedEmployment = this.extractNormalizedEmployment(vacancy.employmentType);
      const normalizedSchedule = this.extractNormalizedSchedule(vacancy.schedule);

      // --- Определяем категорию ---
      const category = this.determineCategory(vacancy.title);

      return {
        title: vacancy.title.trim(),
        company: company,
        description: description,
        location: location,
        category, // Добавляем категорию

        // Зарплата в целевой валюте ('RUB_PMR' по умолчанию)
        salaryMin: convertedMinSalary,
        salaryMax: convertedMaxSalary,
        // Исходная валюта (для справки)
        salaryCurrency: currencyInfo?.source || 'MDL',

        experience: normalizedExperience,
        employment: normalizedEmployment,
        schedule: normalizedSchedule,

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
          // --- Добавляем информацию о конвертации ---
          originalSalary: salary,
          convertedSalaryMin: convertedMinSalary,
          convertedSalaryMax: convertedMaxSalary,
          conversionSourceCurrency: currencyInfo?.source,
          conversionTargetCurrency: currencyInfo?.target,
          // --- Добавляем информацию о нормализации ---
          normalizedExperience: normalizedExperience,
          normalizedEmployment: normalizedEmployment,
          normalizedSchedule: normalizedSchedule,
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
