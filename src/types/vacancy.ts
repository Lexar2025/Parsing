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
  fullDescription?: string; // Полное описание с детальной страницы
  url: string;
  publishedAt?: Date;
  education?: string;
  experience?: string;
  schedule?: string;
  workPlace?: string;
  source: 'rabota.md' | '999.md' | 'makler.md' | 'other';
  // Дополнительные поля для 999.md
  author?: string; // Автор (Физ. или Юр. лицо)
  seasonal?: boolean; // Сезонная работа
  employmentType?: string; // Тип занятости
  companyType?: string; // Тип компании
  languages?: string[]; // Языки
  contactPerson?: string; // Контактное лицо
  region?: string; // Регион (полный адрес)
  // Дополнительные поля для makler.md
  vacancyType?: string; // Тип вакансии (Прямая/Агентство)
  industry?: string; // Сферы деятельности
  specialization?: string; // Специализация
  // Поля для отслеживания актуальности
  firstSeenAt?: Date | string; // Когда впервые найдена
  lastSeenAt?: Date | string; // Когда найдена в последний раз
  isActive?: boolean; // Активна ли сейчас
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
