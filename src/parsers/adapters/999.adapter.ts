/**
 * Адаптер для преобразования вакансий с 999.md в формат БД
 */
import { BaseVacancyAdapter } from './base.adapter.js';
import { Vacancy as ParsedVacancy } from '../../types/vacancy.js';
import { Prisma } from '@prisma/client';

export class NineNineNineMdAdapter extends BaseVacancyAdapter {
  sourceName = '999.md';

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

      // --- Улучшенное извлечение навыков с помощью fuzzy-matcher ---
      let skills = this.extractNormalizedSkills(
        vacancy.description,
        vacancy.fullDescription
      );
      
      // Добавляем языки как навыки (если есть)
      if (Array.isArray(vacancy.languages)) {
        const languageSkills = this.matchSkills(vacancy.languages.filter(lang => lang?.trim()));
        skills = [...new Set([...skills, ...languageSkills])];
      }
      // --- Обработка зарплаты ---
      let salary = vacancy.salary;
      // Если зарплаты нет — ищем в описании или полном описании
      if (!salary && (vacancy.description || vacancy.fullDescription)) {
        salary = this.extractSalaryFromText(vacancy.description || vacancy.fullDescription);
      }
      
      // --- Используем новые методы конвертации ---
      const currencyInfo = this.extractSourceAndTargetCurrency(salary);
      const convertedMinSalary = this.extractAndConvertSalaryMin(salary);
      const convertedMaxSalary = this.extractAndConvertSalaryMax(salary);
      const rawScheduleField = vacancy.schedule; // содержит "полный день" или "удаленно"

      // --- Определяем категорию ---
      const category = this.determineCategory(vacancy.title);

      return {
        // Унифицированные поля
        title: vacancy.title.trim(),
        company: company,
        description: description,
        location: location,
        category, // Добавляем категорию

        // Зарплата - теперь в конвертированной валюте
        salaryMin: convertedMinSalary,
        salaryMax: convertedMaxSalary,
        // Сохраняем исходную валюту
        salaryCurrency: currencyInfo?.source || 'MDL',

        // Опыт и тип работы - используем новые методы с fuzzy-matching
        experience: this.extractNormalizedExperience(vacancy.experience),

        // ✅ ПРАВИЛЬНО (обрабатываем оба поля из vacancy.schedule):
        employment: this.extractNormalizedEmployment(rawScheduleField) || 
            this.extractNormalizedEmployment(vacancy.employmentType),

        schedule: this.extractNormalizedSchedule(rawScheduleField) || 'office',
        workLocationType: this.normalizeWorkLocationType(vacancy.workLocationType),

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
          languages: vacancy.languages?.map(lang => lang.trim()) || null,
          contactPerson: vacancy.contactPerson?.trim() || null,
          region: vacancy.region?.trim() || null,
          education: vacancy.education?.trim() || null,
          firstSeenAt: vacancy.firstSeenAt ? new Date(vacancy.firstSeenAt) : null,
          lastSeenAt: vacancy.lastSeenAt ? new Date(vacancy.lastSeenAt) : null,
          isActive: typeof vacancy.isActive === 'boolean' ? vacancy.isActive : true,
          originalWorkLocation: vacancy.workLocationType?.trim() || null,
          // --- Добавляем информацию о конвертации и нормализации ---
          originalSalary: vacancy.salary,
          convertedSalaryMin: convertedMinSalary,
          convertedSalaryMax: convertedMaxSalary,
          conversionSourceCurrency: currencyInfo?.source,
          conversionTargetCurrency: currencyInfo?.target,
          normalizedExperience: this.extractNormalizedExperience(vacancy.experience),
          normalizedEmployment: this.extractNormalizedEmployment(vacancy.employmentType),
          normalizedSchedule: this.extractNormalizedSchedule(vacancy.schedule),
          normalizedCurrency: this.extractNormalizedCurrency(vacancy.salary),
        } satisfies Prisma.InputJsonValue,
      };
    } catch (error) {
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
