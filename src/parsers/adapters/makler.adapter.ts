/**
 * Адаптер для преобразования вакансий с makler.md в формат БД
 */

import { BaseVacancyAdapter } from './base.adapter.js';
import { Vacancy as ParsedVacancy } from '../../types/vacancy.js';
import { Prisma } from '@prisma/client';

export class MaklerMdAdapter extends BaseVacancyAdapter {
  sourceName = 'makler.md';
  
  toPrisma(vacancy: ParsedVacancy): Prisma.VacancyCreateInput {
    return {
      // Унифицированные поля
      title: vacancy.title,
      company: vacancy.company || 'Не указана',
      description: vacancy.description || '',
      location: vacancy.location,
      
      // Зарплата
      salaryMin: this.extractSalaryMin(vacancy.salary),
      salaryMax: this.extractSalaryMax(vacancy.salary),
      salaryCurrency: this.extractCurrency(vacancy.salary),
      
      // Опыт и тип работы
      experience: this.mapExperience(vacancy.experience),
      employment: this.mapEmployment(vacancy.schedule),
      schedule: this.mapSchedule(vacancy.workPlace),
      
      // Навыки (можно парсить из описания)
      skills: [],
      
      // Мета-данные
      source: this.sourceName,
      sourceId: vacancy.id,
      sourceUrl: vacancy.url,
      publishedAt: vacancy.publishedAt || new Date(),
      
      // Сырые данные для дополнительных полей makler.md
      rawData: {
        vacancyType: vacancy.vacancyType,
        industry: vacancy.industry,
        specialization: vacancy.specialization,
        education: vacancy.education,
        fullDescription: vacancy.fullDescription,
        firstSeenAt: vacancy.firstSeenAt,
        lastSeenAt: vacancy.lastSeenAt,
        isActive: vacancy.isActive,
      } as Prisma.InputJsonValue,
    };
  }
}
