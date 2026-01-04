/**
 * Адаптер для преобразования вакансий с 999.md в формат БД
 */

import { BaseVacancyAdapter } from './base.adapter.js';
import { Vacancy as ParsedVacancy } from '../../types/vacancy.js';
import { Prisma } from '@prisma/client';

export class NineNineNineMdAdapter extends BaseVacancyAdapter {
  sourceName = '999.md';
  
  toPrisma(vacancy: ParsedVacancy): Prisma.VacancyCreateInput {
    return {
      // Унифицированные поля
      title: vacancy.title,
      company: vacancy.company || vacancy.author || 'Не указана',
      description: vacancy.description || '',
      location: vacancy.location || vacancy.region,
      
      // Зарплата
      salaryMin: this.extractSalaryMin(vacancy.salary),
      salaryMax: this.extractSalaryMax(vacancy.salary),
      salaryCurrency: this.extractCurrency(vacancy.salary),
      
      // Опыт и тип работы
      experience: this.mapExperience(vacancy.experience),
      employment: this.mapEmployment(vacancy.employmentType),
      schedule: this.mapSchedule(vacancy.workPlace),
      
      // Навыки (из языков если есть)
      skills: vacancy.languages || [],
      
      // Мета-данные
      source: this.sourceName,
      sourceId: vacancy.id,
      sourceUrl: vacancy.url,
      publishedAt: vacancy.publishedAt || new Date(),
      
      // Сырые данные для дополнительных полей 999.md
      rawData: {
        author: vacancy.author,
        seasonal: vacancy.seasonal,
        employmentType: vacancy.employmentType,
        companyType: vacancy.companyType,
        languages: vacancy.languages,
        contactPerson: vacancy.contactPerson,
        region: vacancy.region,
        education: vacancy.education,
        fullDescription: vacancy.fullDescription,
        firstSeenAt: vacancy.firstSeenAt,
        lastSeenAt: vacancy.lastSeenAt,
        isActive: vacancy.isActive,
      } as Prisma.InputJsonValue,
    };
  }
}
