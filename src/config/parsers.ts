/**
 * Конфигурационный файл для парсеров
 * Здесь можно настроить параметры для разных сайтов
 */

export interface SiteConfig {
  name: string;
  baseUrl: string;
  defaultCategory?: string;
  maxPages: number;
  delay: number;
  concurrency: number;
  cacheEnabled: boolean;
}

export const PARSER_CONFIGS: Record<string, SiteConfig> = {
  'rabota.md': {
    name: 'Rabota.md',
    baseUrl: 'https://www.rabota.md',
    defaultCategory: 'программист',
    maxPages: 10,
    delay: 1000,
    concurrency: 3,
    cacheEnabled: true,
  },
  '999.md': {
    name: '999.md',
    baseUrl: 'https://999.md',
    defaultCategory: 'Грузчик',
    maxPages: 10,
    delay: 1500,
    concurrency: 3,
    cacheEnabled: true,
  },
  'makler.md': {
    name: 'Makler.md',
    baseUrl: 'https://makler.md',
    defaultCategory: 'Программисты',
    maxPages: 10,
    delay: 1000,
    concurrency: 3,
    cacheEnabled: true,
  },
};

/**
 * Получить конфигурацию для конкретного сайта
 */
export function getParserConfig(site: keyof typeof PARSER_CONFIGS): SiteConfig {
  const config = PARSER_CONFIGS[site];
  if (!config) {
    throw new Error(`Configuration for site "${site}" not found`);
  }
  return config;
}

/**
 * Получить список доступных парсеров
 */
export function getAvailableParsers(): string[] {
  return Object.keys(PARSER_CONFIGS);
}
