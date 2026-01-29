/**
 * Базовый интерфейс адаптера для парсеров
 * Каждый парсер должен иметь адаптер, который преобразует данные в единый формат для БД
 */

// src/adapters/base.adapter.ts

import { Vacancy as ParsedVacancy } from '../../types/vacancy.js';
import { Prisma } from '@prisma/client';
import { ExchangeRateProvider } from './exchange-rate-provider.interface.js'; // Путь к интерфейсу
import { StaticExchangeRateProvider } from './static-exchange-rate-provider.js'; // Путь к статической реализации
import {
  findMatchingSkills,
  findMatchingExperience,
  findMatchingEmployment,
  findMatchingCurrency,
  findMatchingSchedule,
  extractSkillsFromDescription
} from '../../utils/fuzzy-matcher.js';

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
// Обновляем интерфейс BaseVacancyAdapter
export interface BaseVacancyAdapterConstructorArgs {
  exchangeRateProvider?: ExchangeRateProvider; // Необязательный параметр для обратной совместимости
}

export abstract class BaseVacancyAdapter implements VacancyAdapter {
  protected readonly exchangeRateProvider: ExchangeRateProvider;

  // Обновляем конструктор
  constructor(args?: BaseVacancyAdapterConstructorArgs) {
    // Используем переданный провайдер или создаем статический по умолчанию
    this.exchangeRateProvider = args?.exchangeRateProvider ?? new StaticExchangeRateProvider();
  }

  abstract sourceName: string;
  abstract toPrisma(vacancy: ParsedVacancy): Prisma.VacancyCreateInput;

  toPrismaMany(vacancies: ParsedVacancy[]): Prisma.VacancyCreateInput[] {
    return vacancies.map(v => this.toPrisma(v));
  }

  // --- Старые методы остаются без изменений ---
  protected extractSalaryMin(salary?: string): number | undefined {
    if (!salary) return undefined;
    try {
      const match = salary.match(/(\d+[\s,]\d*)/);
      if (!match) return undefined;
      const cleanNumber = match[1].replace(/[\s,]/g, '');
      const num = parseInt(cleanNumber);
      return isNaN(num) ? undefined : num;
    } catch (error) {
      console.warn(`⚠️ Ошибка при извлечении минимальной зарплаты из "${salary}":`, error);
      return undefined;
    }
  }

  protected extractSalaryMax(salary?: string): number | undefined {
    if (!salary) return undefined;
    try {
      const matches = salary.match(/(\d+[\s,]\d*)/g);
      if (!matches || matches.length < 2) return undefined;
      const cleanNumber = matches[matches.length - 1].replace(/[\s,]/g, '');
      const num = parseInt(cleanNumber);
      return isNaN(num) ? undefined : num;
    } catch (error) {
      console.warn(`⚠️ Ошибка при извлечении максимальной зарплаты из "${salary}":`, error);
      return undefined;
    }
  }

  protected extractCurrency(salary?: string): string | undefined {
    if (!salary) return undefined;
    if (salary.includes('MDL') || salary.includes('lei')) return 'MDL';
    if (salary.includes('USD') || salary.includes('$')) return 'USD';
    if (salary.includes('EUR') || salary.includes('€')) return 'EUR';
    if (salary.includes('RUB') || salary.includes('₽')) return 'RUB'; // Добавим RUB
    return 'MDL'; // по умолчанию для молдавских сайтов
  }

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

    return this.normalizeExperience(experience);
  }

  private normalizeExperience(experience: string): string {
    return experience
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');
  }

  protected mapEmployment(schedule?: string): string | undefined {
    if (!schedule) return undefined;
    const s = schedule.toLowerCase().trim();

    if (s.includes('полная') || s.includes('full time') || s.includes('full')) return 'full';
    if (s.includes('частичная') || s.includes('part time') || s.includes('part')) return 'part';
    if (s.includes('проект') || s.includes('project') || s.includes('contract')) return 'project';
    if (s.includes('стажировка') || s.includes('internship') || s.includes('probation')) return 'probation';

    return this.normalizeEmployment(schedule);
  }

  private normalizeEmployment(employment: string): string {
    return employment
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');
  }

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

    return this.normalizeSchedule(workPlace);
  }

  private normalizeSchedule(schedule: string): string {
    return schedule
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');
  }
  // --- Конец старых методов ---

  // --- Новые методы для конвертации ---
  /**
   * Конвертирует значение зарплаты из одной валюты в другую.
   * @param amount Сумма в исходной валюте.
   * @param fromCurrency Исходная валюта (например, 'MDL').
   * @param toCurrency Целевая валюта (например, 'RUB_PMR').
   * @returns Конвертированную сумму или undefined, если курс недоступен.
   */
  protected convertSalary(amount: number, fromCurrency: string, toCurrency: string): number | undefined {
    const rate = this.exchangeRateProvider.getExchangeRate(fromCurrency, toCurrency);
    if (rate === undefined) {
      console.warn(`⚠️ Неизвестен курс конвертации из ${fromCurrency} в ${toCurrency} для суммы ${amount}`);
      return undefined; // Не возвращаем исходную сумму, если курс неизвестен
    }
    return amount * rate;
  }

  /**
   * Извлекает и конвертирует минимальную зарплату в целевую валюту.
   * @param salary Строка с зарплатой (например, '1000 - 1500 MDL').
   * @param targetCurrency Целевая валюта (например, 'RUB_PMR').
   * @returns Конвертированную минимальную сумму или undefined.
   */
  protected extractAndConvertSalaryMin(salary?: string, targetCurrency: string = 'RUB_PMR'): number | undefined {
    const minAmount = this.extractSalaryMin(salary);
    if (minAmount === undefined) return undefined;

    const sourceCurrency = this.extractCurrency(salary);
    if (!sourceCurrency) {
      console.warn(`⚠️ Не удалось определить исходную валюту для '${salary}'`);
      return undefined;
    }

    return this.convertSalary(minAmount, sourceCurrency, targetCurrency);
  }

  /**
   * Извлекает и конвертирует максимальную зарплату в целевую валюту.
   * @param salary Строка с зарплатой (например, '1000 - 1500 MDL').
   * @param targetCurrency Целевая валюта (например, 'RUB_PMR').
   * @returns Конвертированную максимальную сумму или undefined.
   */
  protected extractAndConvertSalaryMax(salary?: string, targetCurrency: string = 'RUB_PMR'): number | undefined {
    const maxAmount = this.extractSalaryMax(salary);
    if (maxAmount === undefined) return undefined;

    const sourceCurrency = this.extractCurrency(salary);
    if (!sourceCurrency) {
      console.warn(`⚠️ Не удалось определить исходную валюту для '${salary}'`);
      return undefined;
    }

    return this.convertSalary(maxAmount, sourceCurrency, targetCurrency);
  }

  /**
   * Извлекает исходную валюту и целевую валюту.
   * @param salary Строка с зарплатой.
   * @param targetCurrency Целевая валюта (например, 'RUB_PMR').
   * @returns Объект с исходной и целевой валютой или undefined.
   */
  protected extractSourceAndTargetCurrency(salary?: string, targetCurrency: string = 'RUB_PMR'): { source: string; target: string } | undefined {
    const sourceCurrency = this.extractCurrency(salary);
    if (!sourceCurrency) {
      console.warn(`⚠️ Не удалось определить исходную валюту для '${salary}'`);
      return undefined;
    }
    return { source: sourceCurrency, target: targetCurrency };
  }
  // --- Конец новых методов ---

  // --- Методы с использованием fuzzy-matcher ---
  /**
   * Извлекает нормализованный опыт работы с помощью fuzzy-matching
   * @param experience Строка с опытом работы
   * @returns Нормализованное значение опыта или undefined
   */
  protected extractNormalizedExperience(experience?: string): string | undefined {
    if (!experience) return undefined;
    
    // Сначала пробуем fuzzy-matching
    const fuzzyMatch = findMatchingExperience(experience);
    if (fuzzyMatch) return fuzzyMatch;
    
    // Если fuzzy не дал результата, используем старую логику как резервную
    return this.mapExperience(experience);
  }

  /**
   * Извлекает нормализованный тип занятости с помощью fuzzy-matching
   * @param employment Строка с типом занятости
   * @returns Нормализованное значение типа занятости или undefined
   */
  protected extractNormalizedEmployment(employment?: string): string | undefined {
    if (!employment) return undefined;
    
    // Сначала пробуем fuzzy-matching
    const fuzzyMatch = findMatchingEmployment(employment);
    if (fuzzyMatch) return fuzzyMatch;
    
    // Если fuzzy не дал результата, используем старую логику как резервную
    return this.mapEmployment(employment);
  }

  /**
   * Извлекает нормализованный график работы с помощью fuzzy-matching
   * @param schedule Строка с графиком работы
   * @returns Нормализованное значение графика или undefined
   */
  protected extractNormalizedSchedule(schedule?: string): string | undefined {
    if (!schedule) return undefined;
    
    // Сначала пробуем fuzzy-matching
    const fuzzyMatch = findMatchingSchedule(schedule);
    if (fuzzyMatch) return fuzzyMatch;
    
    // Если fuzzy не дал результата, используем старую логику как резервную
    return this.mapSchedule(schedule);
  }

  /**
   * Извлекает нормализованную валюту с помощью fuzzy-matching
   * @param currencyStr Строка с валютой
   * @returns Нормализованное значение валюты или undefined
   */
  protected extractNormalizedCurrency(currencyStr?: string): string | undefined {
    if (!currencyStr) return undefined;
    
    // Сначала пробуем fuzzy-matching
    const fuzzyMatch = findMatchingCurrency(currencyStr);
    if (fuzzyMatch) return fuzzyMatch;
    
    // Если fuzzy не дал результата, используем старую логику как резервную
    return this.extractCurrency(currencyStr);
  }

  /**
   * Извлекает навыки из описания вакансии с помощью fuzzy-matching
   * @param description Описание вакансии
   * @param additionalText Дополнительный текст для анализа (например, fullDescription)
   * @returns Массив нормализованных навыков
   */
  protected extractNormalizedSkills(
    description?: string,
    additionalText?: string
  ): string[] {
    const skills = new Set<string>();
    
    // Извлекаем навыки из описания
    if (description) {
      const descSkills = extractSkillsFromDescription(description);
      descSkills.forEach(skill => skills.add(skill));
    }
    
    // Извлекаем навыки из дополнительного текста
    if (additionalText) {
      const additionalSkills = extractSkillsFromDescription(additionalText);
      additionalSkills.forEach(skill => skills.add(skill));
    }
    
    return Array.from(skills);
  }

  /**
   * Находит навыки по входной строке с помощью fuzzy-matching
   * Полезно когда у вас уже есть список навыков в виде строк
   * @param skillsArray Массив строк с навыками
   * @returns Массив нормализованных навыков
   */
  protected matchSkills(skillsArray: string[]): string[] {
    if (!skillsArray || skillsArray.length === 0) return [];
    
    const skills = new Set<string>();
    
    skillsArray.forEach(skill => {
      if (!skill?.trim()) return;
      const matches = findMatchingSkills(skill);
      matches.forEach(match => skills.add(match));
    });
    
    return Array.from(skills);
  }
  // --- Конец методов с fuzzy-matcher ---
}