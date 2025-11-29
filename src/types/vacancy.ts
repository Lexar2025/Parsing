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
  education?: string;
  experience?: string;
  schedule?: string;
  workPlace?: string;
  source: 'rabota.md' | '999.md' | 'other';
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
  maxPages?: number; // для будущей пагинации
  delay?: number; // задержка между запросами в мс
}

export interface Parser {
  parse(config: ParserConfig): Promise<ParseResult>;
  parseVacancyDetails(url: string): Promise<Partial<Vacancy>>;
}
