/**
 * Адаптер для преобразования вакансий с hh.ru в формат БД
 * 
 * Особенности:
 * - Все вакансии с HH считаются "За границей" (workLocationType)
 * - Валюты: RUB → конвертация в RUB_PMR
 * - Experience/Employment/Schedule маппятся через fuzzy-matcher
 * - Professional roles → skills
 */

import { BaseVacancyAdapter } from './base.adapter.js';
import { Vacancy as ParsedVacancy } from '../../types/vacancy.js';
import { Prisma } from '@prisma/client';

export class HHRuAdapter extends BaseVacancyAdapter {
  sourceName = 'hh.ru';

  toPrisma(vacancy: ParsedVacancy): Prisma.VacancyCreateInput {
    try {
      if (!vacancy.title || !vacancy.url || !vacancy.id) {
        throw new Error(`Отсутствуют обязательные поля для вакансии: ${vacancy.id}`);
      }

      // --- Дата публикации ---
      let publishedAt: Date;
      if (vacancy.publishedAt instanceof Date) {
        publishedAt = vacancy.publishedAt;
      } else if (typeof vacancy.publishedAt === 'string') {
        const parsed = new Date(vacancy.publishedAt);
        publishedAt = isNaN(parsed.getTime()) ? new Date() : parsed;
      } else {
        publishedAt = new Date();
      }

      const company = vacancy.company?.trim() || 'Не указана';
      const location = vacancy.location?.trim() || null;
      const description = vacancy.description?.trim() || '';

      // --- Schedule / Employment ---
      // HH уже даёт нормализованные значения, но пропускаем через fuzzy-matcher
      const schedule = this.extractNormalizedSchedule(vacancy.schedule);
      const employment = this.extractNormalizedEmployment(vacancy.employmentType);

      // --- Skills ---
      // Парсер уже извлёк professional_roles, дополняем из описания
      const skills = this.extractNormalizedSkills(description);

      // --- Зарплата ---
      const currencyInfo = this.extractSourceAndTargetCurrency(vacancy.salary);
      const convertedMinSalary = this.extractAndConvertSalaryMin(vacancy.salary);
      const convertedMaxSalary = this.extractAndConvertSalaryMax(vacancy.salary);

      // --- Определяем категорию ---
      const category = this.determineCategory(vacancy.title);

      return {
        title: vacancy.title.trim(),
        company,
        description,
        location,
        category, // Добавляем категорию
        
        // Все вакансии HH = работа за границей
        workLocationType: 'За границей',

        salaryMin: convertedMinSalary,
        salaryMax: convertedMaxSalary,
        salaryCurrency: currencyInfo?.source || 'RUB',

        experience: this.extractNormalizedExperience(vacancy.experience),
        employment,
        schedule,

        skills,

        source: this.sourceName,
        sourceId: vacancy.id.trim(),
        sourceUrl: vacancy.url.trim(),
        publishedAt,

        rawData: {
          fullDescription: vacancy.fullDescription?.trim() || null,
          firstSeenAt: vacancy.firstSeenAt ? new Date(vacancy.firstSeenAt) : null,
          lastSeenAt: vacancy.lastSeenAt ? new Date(vacancy.lastSeenAt) : null,
          isActive: typeof vacancy.isActive === 'boolean' ? vacancy.isActive : true,
          originalSalary: vacancy.salary || null,
          convertedSalaryMin: convertedMinSalary,
          convertedSalaryMax: convertedMaxSalary,
          conversionSourceCurrency: currencyInfo?.source || null,
          conversionTargetCurrency: currencyInfo?.target || null,
          // Сырые значения HH для диагностики
          rawSchedule: vacancy.schedule || null,
          rawEmploymentType: vacancy.employmentType || null,
          rawExperience: vacancy.experience || null,
        } satisfies Prisma.InputJsonValue,
      };
    } catch (error) {
      console.error(`❌ Ошибка в адаптере hh.ru для вакансии ${vacancy.id}:`, {
        error: error instanceof Error ? error.message : String(error),
        vacancy: { id: vacancy.id, title: vacancy.title, url: vacancy.url },
      });
      throw error;
    }
  }
}
