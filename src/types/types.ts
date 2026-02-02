/**
 * Типы для работы с HeadHunter API
 * Упрощенная версия - только нужные поля
 */

export interface HHVacancy {
  id: string;
  name: string;
  
  area: {
    id: string;
    name: string;
  };
  
  salary: {
    from: number | null;
    to: number | null;
    currency: string;
  } | null;
  
  employer: {
    name: string;
  };
  
  snippet: {
    requirement: string | null;
    responsibility: string | null;
  };
  
  published_at: string;
  alternate_url: string;
  
  schedule: {
    id: string;
    name: string;
  };
  
  employment: {
    id: string;
    name: string;
  };
  
  experience: {
    id: string;
    name: string;
  };
  
  professional_roles: Array<{
    id: string;
    name: string;
  }>;
}

export interface HHVacancyResponse {
  items: HHVacancy[];
  page: number;
  per_page: number;
  pages: number;
  found: number;
}

export interface HHSearchParams {
  text?: string;
  area?: string;
  salary?: number;
  experience?: string;
  per_page?: number;
  page?: number;
}
