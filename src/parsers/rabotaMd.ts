/**
 * Парсер для сайта rabota.md
 */

import axios, { AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';
import { Parser, ParserConfig, ParseResult, Vacancy } from '../types/vacancy.js';
import { safeText, extractSalary, log } from '../utils/helpers.js';

export class RabotaMdParser implements Parser {
  private axiosInstance: AxiosInstance;
  private readonly baseUrl = 'https://www.rabota.md';

  constructor() {
    this.axiosInstance = axios.create({
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      timeout: 10000,
    });
  }

  /**
   * Основной метод парсинга списка вакансий
   */
  async parse(config: ParserConfig): Promise<ParseResult> {
    try {
      const url = this.buildSearchUrl(config);
      log(`Начинаю парсинг: ${url}`);

      const html = await this.fetchPage(url);
      const $ = cheerio.load(html);

      const vacancies = this.extractVacancies($);
      const totalFound = this.extractTotalCount($);

      log(`Найдено вакансий: ${vacancies.length} из ${totalFound}`);

      return {
        vacancies,
        totalFound,
        page: 1,
        hasNextPage: vacancies.length < totalFound,
      };
    } catch (error) {
      log('Ошибка при парсинге:', error);
      throw error;
    }
  }

  /**
   * Парсинг детальной информации о вакансии
   */
  async parseVacancyDetails(url: string): Promise<Vacancy> {
    try {
      log(`Загружаю детали вакансии: ${url}`);

      const html = await this.fetchPage(url);
      const $ = cheerio.load(html);

      // Здесь будет детальный парсинг страницы вакансии
      const vacancy: Vacancy = {
        id: this.extractIdFromUrl(url),
        title: safeText($('.vacancy-title')),
        company: safeText($('.company-name')),
        salary: extractSalary(safeText($('.salary'))),
        location: safeText($('.location')),
        description: safeText($('.vacancy-description')),
        url: url,
        source: 'rabota.md',
      };

      return vacancy;
    } catch (error) {
      log('Ошибка при загрузке деталей вакансии:', error);
      throw error;
    }
  }

  /**
   * Построение URL для поиска
   */
  private buildSearchUrl(config: ParserConfig): string {
    const params = new URLSearchParams();

    if (config.searchQuery) {
      params.append('search', config.searchQuery);
    }

    if (config.category) {
      params.append('category', config.category);
    }

    if (config.location) {
      params.append('location', config.location);
    }

    const queryString = params.toString();
    return queryString
      ? `${this.baseUrl}/ru/jobs?${queryString}`
      : `${this.baseUrl}/ru/jobs`;
  }

  /**
   * Загрузка HTML страницы
   */
  private async fetchPage(url: string): Promise<string> {
    try {
      const response = await this.axiosInstance.get(url);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        log(`Ошибка HTTP: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Извлечение вакансий из HTML
   */
  private extractVacancies($: cheerio.CheerioAPI): Vacancy[] {
    const vacancies: Vacancy[] = [];

    // Селекторы нужно будет уточнить после анализа реального HTML
    $('.vacancy-item, [data-id], .job-item').each((_, element) => {
      try {
        const $el = $(element);

        const titleElement = $el.find('.vacancy-title, .job-title, h3 a').first();
        const title = safeText(titleElement);
        const url = titleElement.attr('href') || '';

        if (!title || !url) return;

        const vacancy: Vacancy = {
          id: $el.attr('data-id') || this.extractIdFromUrl(url),
          title: title,
          company: safeText($el.find('.company-name, .employer')),
          salary: extractSalary(safeText($el.find('.salary, .wage'))),
          location: safeText($el.find('.location, .city')),
          url: url.startsWith('http') ? url : `${this.baseUrl}${url}`,
          source: 'rabota.md',
        };

        vacancies.push(vacancy);
      } catch (error) {
        log('Ошибка при извлечении вакансии:', error);
      }
    });

    return vacancies;
  }

  /**
   * Извлечение общего количества вакансий
   */
  private extractTotalCount($: cheerio.CheerioAPI): number {
    const totalText = safeText($('.total-count, .results-count, .found-vacancies'));
    const match = totalText.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  }

  /**
   * Извлечение ID из URL
   */
  private extractIdFromUrl(url: string): string {
    const match = url.match(/\/(\d+)/);
    return match ? match[1] : url;
  }
}
