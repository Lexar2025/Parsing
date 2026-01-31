/**
Базовый интерфейс адаптера для парсеров
Каждый парсер должен иметь адаптер, который преобразует данные в единый формат для БД
*/
import { Vacancy as ParsedVacancy } from '../../types/vacancy.js';
import { Prisma } from '@prisma/client';
import { ExchangeRateProvider } from './exchange-rate-provider.interface.js';
import { StaticExchangeRateProvider } from './static-exchange-rate-provider.js';
import {
  findMatchingSkills,
  findMatchingExperience,
  findMatchingEmployment,
  findMatchingCurrency,
  findMatchingSchedule,
  extractSkillsFromDescription
} from '../../utils/fuzzy-matcher.js';

export interface VacancyAdapter {
  sourceName: string;
  toPrisma(vacancy: ParsedVacancy): Prisma.VacancyCreateInput;
  toPrismaMany(vacancies: ParsedVacancy[]): Prisma.VacancyCreateInput[];
}

export interface BaseVacancyAdapterConstructorArgs {
  exchangeRateProvider?: ExchangeRateProvider;
}

export abstract class BaseVacancyAdapter implements VacancyAdapter {
  protected readonly exchangeRateProvider: ExchangeRateProvider;

  constructor(args?: BaseVacancyAdapterConstructorArgs) {
    this.exchangeRateProvider = args?.exchangeRateProvider ?? new StaticExchangeRateProvider();
  }

  abstract sourceName: string;
  abstract toPrisma(vacancy: ParsedVacancy): Prisma.VacancyCreateInput;

  toPrismaMany(vacancies: ParsedVacancy[]): Prisma.VacancyCreateInput[] {
    return vacancies.map(v => this.toPrisma(v));
  }

  // --- Методы извлечения зарплаты (без дублирования) ---
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

  // --- Методы конвертации валюты ---
  protected convertSalary(amount: number, fromCurrency: string, toCurrency: string): number | undefined {
    const rate = this.exchangeRateProvider.getExchangeRate(fromCurrency, toCurrency);
    if (rate === undefined) {
      console.warn(`⚠️ Неизвестен курс конвертации из ${fromCurrency} в ${toCurrency} для суммы ${amount}`);
      return undefined;
    }
    return amount * rate;
  }

  protected extractAndConvertSalaryMin(salary?: string, targetCurrency: string = 'RUB_PMR'): number | undefined {
    const minAmount = this.extractSalaryMin(salary);
    if (minAmount === undefined) return undefined;
    
    const sourceCurrency = this.extractNormalizedCurrency(salary);
    if (!sourceCurrency) {
      console.warn(`⚠️ Не удалось определить исходную валюту для '${salary}'`);
      return undefined;
    }

    return this.convertSalary(minAmount, sourceCurrency, targetCurrency);
  }

  protected extractAndConvertSalaryMax(salary?: string, targetCurrency: string = 'RUB_PMR'): number | undefined {
    const maxAmount = this.extractSalaryMax(salary);
    if (maxAmount === undefined) return undefined;
    
    const sourceCurrency = this.extractNormalizedCurrency(salary);
    if (!sourceCurrency) {
      console.warn(`⚠️ Не удалось определить исходную валюту для '${salary}'`);
      return undefined;
    }

    return this.convertSalary(maxAmount, sourceCurrency, targetCurrency);
  }

  protected extractSourceAndTargetCurrency(salary?: string, targetCurrency: string = 'RUB_PMR'): { source: string; target: string } | undefined {
    const sourceCurrency = this.extractNormalizedCurrency(salary);
    if (!sourceCurrency) {
      console.warn(`⚠️ Не удалось определить исходную валюту для '${salary}'`);
      return undefined;
    }
    return { source: sourceCurrency, target: targetCurrency };
  }

  // --- Методы нормализации через fuzzy-matcher (основные) ---
  protected extractNormalizedExperience(experience?: string): string | undefined {
    if (!experience) return undefined;
    return findMatchingExperience(experience) || this.fallbackMapExperience(experience);
  }

  protected extractNormalizedEmployment(employment?: string): string | undefined {
    if (!employment) return undefined;
    return findMatchingEmployment(employment) || this.fallbackMapEmployment(employment);
  }

  protected extractNormalizedSchedule(schedule?: string): string | undefined {
    if (!schedule) return undefined;
    return findMatchingSchedule(schedule) || this.fallbackMapSchedule(schedule);
  }

  protected extractNormalizedCurrency(currencyStr?: string): string | undefined {
    if (!currencyStr) return undefined;
    return findMatchingCurrency(currencyStr) || this.fallbackExtractCurrency(currencyStr);
  }

  protected extractNormalizedSkills(
    description?: string,
    additionalText?: string
  ): string[] {
    const skills = new Set<string>();
    
    if (description) {
      const descSkills = extractSkillsFromDescription(description);
      descSkills.forEach(skill => skills.add(skill));
    }

    if (additionalText) {
      const additionalSkills = extractSkillsFromDescription(additionalText);
      additionalSkills.forEach(skill => skills.add(skill));
    }

    return Array.from(skills);
  }

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

  // --- Fallback методы (только для резервного варианта) ---
  private fallbackMapExperience(experience?: string): string | undefined {
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

  private fallbackMapEmployment(schedule?: string): string | undefined {
    if (!schedule) return undefined;
    const s = schedule.toLowerCase().trim();
    
    if (s.includes('полная') || s.includes('full time') || s.includes('full')) return 'full';
    if (s.includes('частичная') || s.includes('part time') || s.includes('part')) return 'part';
    if (s.includes('проект') || s.includes('project') || s.includes('contract')) return 'project';
    if (s.includes('стажировка') || s.includes('internship') || s.includes('probation')) return 'probation';

    return this.normalizeEmployment(schedule);
  }

  private fallbackMapSchedule(workPlace?: string): string | undefined {
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

  private fallbackExtractCurrency(salary?: string): string | undefined {
    if (!salary) return undefined;
    if (salary.includes('MDL') || salary.includes('lei')) return 'MDL';
    if (salary.includes('USD') || salary.includes('$')) return 'USD';
    if (salary.includes('EUR') || salary.includes('€')) return 'EUR';
    if (salary.includes('RUB') || salary.includes('₽')) return 'RUB';
    return 'MDL';
  }

  // --- Вспомогательные методы нормализации ---
  private normalizeExperience(experience: string): string {
    return experience.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  }

  private normalizeEmployment(employment: string): string {
    return employment.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  }

  private normalizeSchedule(schedule: string): string {
    return schedule.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  }

  // --- Методы извлечения из текста ---
  /**
   * Пытается извлечь строку с зарплатой из произвольного текста.
   */
  // Улучшаем базовые методы для большей гибкости
protected extractSalaryFromText(text?: string): string | undefined {
  if (!text) return undefined;
  const lowerText = text.toLowerCase();

  // Ключевые слова на 3 языках
  const salaryKeywords = [
    // Русский
    'з/п', 'зарплата', 'оклад', 'доход', 'оплата', 'зп', 'плата',
    // Румынский
    'salariu', 'venit', 'plată', 'plata', 'remunerație', 'remuneratie',
    // Английский
    'salary', 'wage', 'pay', 'compensation', 'income'
  ];

  for (const keyword of salaryKeywords) {
    const keywordIndex = lowerText.indexOf(keyword);
    if (keywordIndex !== -1) {
      const snippet = text.substring(
        keywordIndex,
        Math.min(keywordIndex + 150, text.length)
      );
      
      // Ищем числа в локальных форматах: 4500, 4.500, 4,500, 4 500
      // Румынский формат: 4.500 (точка как разделитель тысяч)
      // Русский формат: 4 500 (пробел)
      const numberPattern = /(?:\d{1,3}(?:[.,\s]\d{3})*(?:[.,]\d+)?|\d+)/;
      const match = snippet.match(numberPattern);
      
      if (match) {
        const numberStart = snippet.indexOf(match[0]);
        const contextStart = Math.max(0, numberStart - 5);
        const contextEnd = Math.min(snippet.length, numberStart + match[0].length + 25);
        return snippet.substring(contextStart, contextEnd).trim();
      }
      
      // Возвращаем сниппет даже без цифр (для логгирования и ручного анализа)
      return snippet.trim();
    }
  }

  // Резерв: число с валютой (поддержка 3 языков)
  const currencyPattern = /(\d[\d\s.,]*\s*(?:MDL|lei|л|леев|лей|\$|USD|€|EUR|руб|₽|RUB|euro|dollar))/i;
  const match = text.match(currencyPattern);
  return match ? match[0].trim() : undefined;
}

protected extractCompanyFromText(text?: string): string | undefined {
  if (!text) return undefined;
  
  // Шаблон 1: "Агентство/Агенция/Agency "Название""
  const agencyPattern = /(?:агентство|агенция|фирма|компания|организация|agency|firm|company|organizație|organizatie)[\s:]*["«“'„]([^"»”'„]+?)["»”'„]/i;
  const agencyMatch = text.match(agencyPattern);
  if (agencyMatch?.[1]) {
    return agencyMatch[1].trim();
  }

  // Шаблон 2: после ключевых слов (3 языка)
  const companyKeywords = [
    'агентство', 'агенция', 'компания', 'фирма', 'работодатель', 'мы',
    'agency', 'company', 'firm', 'employer', 'we',
    'agentie', 'companie', 'firma', 'angajator', 'noi'
  ];
  
  for (const keyword of companyKeywords) {
    // Безопасные границы для кириллицы/латиницы
    const regex = new RegExp(
      `(?:^|\\s|[,.;:!?()«»"'\\[\\]])${keyword}(?:$|\\s|[,.;:!?()«»"'\\[\\]])`,
      'i'
    );
    const match = text.match(regex);
    if (match) {
      const keywordIndex = match.index!;
      const afterKeyword = text.substring(keywordIndex + keyword.length).trim();
      
      // Берем первые 1-3 слова как название компании
      const companyWords = afterKeyword.split(/\s+/).slice(0, 3).join(' ');
      return companyWords.replace(/[.,;:!?]+$/, '').trim() || undefined;
    }
  }

  return undefined;
}
protected normalizeWorkLocationType(location?: string): string {
  // Если поле отсутствует или пустое - считаем, что в Молдове
  if (!location || location.trim() === '') {
    return 'В Молдове';
  }
  
  const lowerLocation = location.toLowerCase();
  
  // Если явно указана Молдова или Приднестровье
  if (lowerLocation.includes('молдова') || 
      lowerLocation.includes('приднестровье') || 
      lowerLocation.includes('transnistria') ||
      lowerLocation.includes('кишинев') ||
      lowerLocation.includes('кишинёв') ||
      lowerLocation.includes('chișinău')) {
    return 'В Молдове';
  }
  
  // Любое другое значение = за границей
  return 'За границей';
}

}