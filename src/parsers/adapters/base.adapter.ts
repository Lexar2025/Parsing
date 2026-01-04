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
    const match = salary.match(/(\d+[\s,]*\d*)/);
    if (!match) return undefined;
    return parseInt(match[1].replace(/[\s,]/g, ''));
  }
  
  /**
   * Извлекает максимальную зарплату из строки
   */
  protected extractSalaryMax(salary?: string): number | undefined {
    if (!salary) return undefined;
    const matches = salary.match(/(\d+[\s,]*\d*)/g);
    if (!matches || matches.length < 2) return undefined;
    return parseInt(matches[matches.length - 1].replace(/[\s,]/g, ''));
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
    
    const exp = experience.toLowerCase();
    
    if (exp.includes('без опыта') || exp.includes('fără experiență')) {
      return 'no_experience';
    }
    if (exp.includes('1-3') || exp.includes('до 3')) {
      return 'between_1_and_3';
    }
    if (exp.includes('3-6') || exp.includes('3 до 6')) {
      return 'between_3_and_6';
    }
    if (exp.includes('более 6') || exp.includes('peste 6')) {
      return 'more_than_6';
    }
    
    return experience;
  }
  
  /**
   * Маппинг типа занятости
   */
  protected mapEmployment(schedule?: string): string | undefined {
    if (!schedule) return undefined;
    
    const s = schedule.toLowerCase();
    
    if (s.includes('полная') || s.includes('full')) return 'full';
    if (s.includes('частичная') || s.includes('part')) return 'part';
    if (s.includes('проект') || s.includes('project')) return 'project';
    if (s.includes('стажировка') || s.includes('internship')) return 'probation';
    
    return schedule;
  }
  
  /**
   * Маппинг графика работы
   */
  protected mapSchedule(workPlace?: string): string | undefined {
    if (!workPlace) return undefined;
    
    const wp = workPlace.toLowerCase();
    
    if (wp.includes('удален') || wp.includes('remote') || wp.includes('la distanță')) {
      return 'remote';
    }
    if (wp.includes('офис') || wp.includes('office') || wp.includes('birou')) {
      return 'office';
    }
    if (wp.includes('гибрид') || wp.includes('hybrid')) {
      return 'hybrid';
    }
    
    return 'office'; // по умолчанию
  }
}
