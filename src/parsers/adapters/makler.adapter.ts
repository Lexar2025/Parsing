/**
 * Адаптер для преобразования вакансий с makler.md в формат БД
 */

import { BaseVacancyAdapter } from './base.adapter.js';
import { Vacancy as ParsedVacancy } from '../../types/vacancy.js';
import { Prisma } from '@prisma/client';

export class MaklerMdAdapter extends BaseVacancyAdapter {
  sourceName = 'makler.md';
  
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
      let description = '';
      if (vacancy.fullDescription) {
        description = vacancy.fullDescription.trim();
      } else if (vacancy.description) {
        description = vacancy.description.trim();
      }

      // Обработка навыков (можно извлечь из описания или специализации)
      const skills: string[] = [];
      if (vacancy.specialization) {
        skills.push(vacancy.specialization.trim());
      }
      if (vacancy.industry) {
        skills.push(vacancy.industry.trim());
      }

      return {
        // Унифицированные поля
        title: vacancy.title.trim(),
        company: company,
        description: description,
        location: location,
        
        // Зарплата
        salaryMin: this.extractSalaryMin(vacancy.salary),
        salaryMax: this.extractSalaryMax(vacancy.salary),
        salaryCurrency: this.extractCurrency(vacancy.salary) || 'MDL',
        
        // Опыт и тип работы
        experience: this.mapExperience(vacancy.experience),
        employment: this.mapEmployment(vacancy.schedule),
        schedule: this.mapSchedule(vacancy.workPlace),
        
        // Навыки
        skills: skills,
        
        // Мета-данные
        source: this.sourceName,
        sourceId: vacancy.id.trim(),
        sourceUrl: vacancy.url.trim(),
        publishedAt: publishedAt,
        
        // Поле, специфичное для makler.md
        workLocationType: vacancy.workLocationType?.trim() || null,
        
        // Сырые данные для дополнительных полей makler.md
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
