/**
 * Базовый интерфейс адаптера для парсеров
 * Каждый парсер должен иметь адаптер, который преобразует данные в единый формат для БД
 */

import { Vacancy as ParsedVacancy } from '../../types/vacancy.js';
import { Prisma } from '@prisma/client';

export interface VacancyAdapter {
  /**
   * Имя источника (должно совпадать с source в Vacancy)
   */
  sourceName: string;
  
  /**
   * Преобразует вакансию из формата парсера в формат БД Prisma
   */
  toPrisma(vacancy: ParsedVacancy): Prisma.VacancyCreateInput;
  
  /**
   * Преобразует множество вакансий
   */
  toPrismaMany(vacancies: ParsedVacancy[]): Prisma.VacancyCreateInput[];
}

/**
 * Базовый абстрактный класс адаптера
 */
export abstract class BaseVacancyAdapter implements VacancyAdapter {
  abstract sourceName: string;
  
  /**
   * Преобразует вакансию в формат для БД
   */
  abstract toPrisma(vacancy: ParsedVacancy): Prisma.VacancyCreateInput;
  
  /**
   * Преобразует массив вакансий
   */
  toPrismaMany(vacancies: ParsedVacancy[]): Prisma.VacancyCreateInput[] {
    return vacancies.map(v => this.toPrisma(v));
  }
  
  /**
   * Извлекает минимальную зарплату из строки
   */
  protected extractSalaryMin(salary?: string): number | undefined {
    if (!salary) return undefined;
    try {
      const match = salary.match(/(\d+[\s,]*\d*)/);
      if (!match) return undefined;
      const cleanNumber = match[1].replace(/[\s,]/g, '');
      const num = parseInt(cleanNumber);
      return isNaN(num) ? undefined : num;
    } catch (error) {
      console.warn(`⚠️ Ошибка при извлечении минимальной зарплаты из "${salary}":`, error);
      return undefined;
    }
  }
  
  /**
   * Извлекает максимальную зарплату из строки
   */
  protected extractSalaryMax(salary?: string): number | undefined {
    if (!salary) return undefined;
    try {
      const matches = salary.match(/(\d+[\s,]*\d*)/g);
      if (!matches || matches.length < 2) return undefined;
      const cleanNumber = matches[matches.length - 1].replace(/[\s,]/g, '');
      const num = parseInt(cleanNumber);
      return isNaN(num) ? undefined : num;
    } catch (error) {
      console.warn(`⚠️ Ошибка при извлечении максимальной зарплаты из "${salary}":`, error);
      return undefined;
    }
  }
  
  /**
   * Определяет валюту из строки
   */
  protected extractCurrency(salary?: string): string | undefined {
    if (!salary) return undefined;
    if (salary.includes('MDL') || salary.includes('lei')) return 'MDL';
    if (salary.includes('USD') || salary.includes('$')) return 'USD';
    if (salary.includes('EUR') || salary.includes('€')) return 'EUR';
    return 'MDL'; // по умолчанию для молдавских сайтов
  }
  
  /**
   * Маппинг опыта в унифицированный формат
   */
  protected mapExperience(experience?: string): string | undefined {
    if (!experience) return undefined;
    
    const exp = experience.toLowerCase().trim();
    
    if (exp.includes('без опыта') || exp.includes('fără experiență') || exp.includes('no experience')) {
      return 'no_experience';
    }
    if (exp.includes('1-3') || exp.includes('до 3') || exp.includes('1 to 3')) {
      return 'between_1_and_3';
    }
    if (exp.includes('3-6') || exp.includes('3 до 6') || exp.includes('3 to 6')) {
      return 'between_3_and_6';
    }
    if (exp.includes('более 6') || exp.includes('peste 6') || exp.includes('over 6')) {
      return 'more_than_6';
    }
    
    // Если не удалось сопоставить, возвращаем оригинальное значение в унифицированном формате
    return this.normalizeExperience(experience);
  }

  private normalizeExperience(experience: string): string {
    return experience
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');
  }
  
  /**
   * Маппинг типа занятости
   */
  protected mapEmployment(schedule?: string): string | undefined {
    if (!schedule) return undefined;
    
    const s = schedule.toLowerCase().trim();
    
    if (s.includes('полная') || s.includes('full time') || s.includes('full')) return 'full';
    if (s.includes('частичная') || s.includes('part time') || s.includes('part')) return 'part';
    if (s.includes('проект') || s.includes('project') || s.includes('contract')) return 'project';
    if (s.includes('стажировка') || s.includes('internship') || s.includes('probation')) return 'probation';
    
    // Если не удалось сопоставить, возвращаем оригинальное значение в унифицированном формате
    return this.normalizeEmployment(schedule);
  }

  private normalizeEmployment(employment: string): string {
    return employment
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');
  }
  
  /**
   * Маппинг графика работы
   */
  protected mapSchedule(workPlace?: string): string | undefined {
    if (!workPlace) return undefined;
    
    const wp = workPlace.toLowerCase().trim();
    
    if (wp.includes('удален') || wp.includes('remote') || wp.includes('la distanță') || wp.includes('distanță')) {
      return 'remote';
    }
    if (wp.includes('офис') || wp.includes('office') || wp.includes('birou') || wp.includes('sediu')) {
      return 'office';
    }
    if (wp.includes('гибрид') || wp.includes('hybrid') || wp.includes('mixt')) {
      return 'hybrid';
    }
    
    // Если не удалось сопоставить, возвращаем оригинальное значение в унифицированном формате
    return this.normalizeSchedule(workPlace);
  }

  private normalizeSchedule(schedule: string): string {
    return schedule
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');
  }
}
