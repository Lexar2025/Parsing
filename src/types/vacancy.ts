/**
 * Базовые типы для парсера вакансий
 */

export interface Vacancy {
  id: string;
  title: string;
  company?: string;
  salary?: string;
  location?: string;
  description?: string;
  url: string;
  publishedAt?: Date;
  source: 'rabota.md' | 'other';
  raw?: Record<string, unknown>; // для хранения сырых данных с сайта
}

export interface ParseResult {
  vacancies: Vacancy[];
  totalFound: number;
  page: number;
  hasNextPage: boolean;
}

export interface ParserConfig {
  baseUrl: string;
  searchQuery?: string;
  category?: string;
  location?: string;
  maxPages?: number;
  delay?: number; // задержка между запросами в мс
}

export interface Parser {
  parse(config: ParserConfig): Promise<ParseResult>;
  parseVacancyDetails(url: string): Promise<Vacancy>;
}
