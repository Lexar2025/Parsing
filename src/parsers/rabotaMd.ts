/**
 * Парсер для сайта rabota.md
 */

import axios, { AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';
import { JSDOM } from 'jsdom';
import { Parser, ParserConfig, ParseResult, Vacancy } from '../types/vacancy.js';
import { safeText, log } from '../utils/helpers.js';

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
   * Поиск ссылки на профессию по названию
   */
  private findProfessionLink($: cheerio.CheerioAPI, searchQuery: string): string | null {
    const $containers = $('#main .content-container');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let $container: cheerio.Cheerio<any> | null = null;
    $containers.each((_, el) => {
      const $el = $(el);
      if (
        $el.hasClass('px-3') &&
        $el.hasClass('lg:px-0') &&
        $el.hasClass('pt-5') &&
        $el.hasClass('sm:pt-6')
      ) {
        $container = $el;
      }
    });
    if (!$container || $container.length === 0) {
      log('Контейнер с профессиями не найден!');
      return null;
    }
    let foundLink: string | null = null;
    $container.find('a.professionsItem').each((_, el) => {
      const $a = $(el);
      const title = safeText($a.find('div.text-black'));
      if (title.trim().toLowerCase() === searchQuery.trim().toLowerCase()) {
        const href = $a.attr('href');
        if (href) {
          foundLink = href.startsWith('http') ? href : `${this.baseUrl}${href}`;
          return false; // break each
        }
      }
      return undefined;
    });
    return foundLink;
  }

  /**
   * Поиск ссылки на профессию по названию через jsdom
   */
  private findProfessionLinkJsdom(html: string, searchQuery: string): string | null {
    const dom = new JSDOM(html);
    const document = dom.window.document;
    // Ищем все контейнеры с базовым классом
    const containers = document.querySelectorAll('#main .content-container');
    let container: Element | null = null;
    containers.forEach((el) => {
      const cl = el.classList;
      if (
        cl.contains('px-3') &&
        cl.contains('lg:px-0') &&
        cl.contains('pt-5') &&
        cl.contains('sm:pt-6')
      ) {
        container = el;
      }
    });
    if (!container) {
      log('Контейнер с профессиями не найден!');
      return null;
    }
    const links = container.querySelectorAll('a.professionsItem');
    let foundLink: string | null = null;
    links.forEach((a) => {
      const titleDiv = a.querySelector('div.text-black');
      const title = titleDiv?.textContent?.trim().toLowerCase() || '';
      if (title === searchQuery.trim().toLowerCase()) {
        const href = a.getAttribute('href');
        if (href) {
          foundLink = href.startsWith('http') ? href : `${this.baseUrl}${href}`;
        }
      }
    });
    return foundLink;
  }

  /**
   * Парсинг списка вакансий на странице профессии через jsdom
   */
  private async parseVacancyCards(url: string): Promise<void> {
    const html = await this.fetchPage(url);
    const dom = new JSDOM(html);
    const document = dom.window.document;
    const container = document.querySelector('.b_info10');
    if (!container) {
      log('Контейнер с вакансиями не найден!');
      return;
    }
    const cards = container.querySelectorAll('.vacancyCardItem');
    log(`Найдено карточек вакансий: ${cards.length}`);
    cards.forEach((card, idx) => {
      // Находим ссылку и название вакансии
      const titleLink = card.querySelector('a.vacancyShowPopup'); // ссылка на детальную вакансию
      const title = titleLink?.querySelector('span')?.textContent?.trim() || ''; // название вакансии
      const url = titleLink?.getAttribute('href') || ''; // url вакансии

      // Находим блок с информацией о компании, локации и зарплате
      const infoBlock = card.querySelector('.text-black.flex.items-center.gap-x-6.flex-wrap.gap-y-1.mb-2');

      // Компания: ищем <a> внутри infoBlock, затем <span>
      const company = infoBlock?.querySelector('a span')?.textContent?.trim() || '';

      // Локация: ищем <div> внутри infoBlock, где svg[use*="_location"], затем <span> внутри этого div
      let location = '';
      if (infoBlock) {
        const locationDivs = infoBlock.querySelectorAll('div.flex.items-center.gap-2');
        locationDivs.forEach(div => {
          const svg = div.querySelector('svg');
          if (svg && svg.querySelector('use') && svg.querySelector('use')?.getAttribute('href')?.includes('_location')) {
            const span = div.querySelector('span');
            if (span) location = span.textContent?.trim() || '';
          }
        });
      }

      // Зарплата: ищем <div> внутри infoBlock, где svg[use*="_salary"], затем <span> внутри этого div
      let salary = '';
      if (infoBlock) {
        const salaryDivs = infoBlock.querySelectorAll('div.flex.items-center.gap-2');
        salaryDivs.forEach(div => {
          const svg = div.querySelector('svg');
          if (svg && svg.querySelector('use') && svg.querySelector('use')?.getAttribute('href')?.includes('_salary')) {
            const span = div.querySelector('span');
            if (span) salary = span.textContent?.trim() || '';
          }
        });
      }

      // Выводим результат в лог
      log(`\n--- Вакансия ${idx + 1} ---`);
      log(`Название: ${title}`);
      log(`Компания: ${company}`);
      log(`Локация: ${location}`);
      log(`Зарплата: ${salary}`);
      log(`URL: ${url}`);
    });
  }

  /**
   * Основной метод: ищет ссылку на профессию и парсит вакансии
   */
  async parse(config: ParserConfig): Promise<ParseResult> {
    try {
      const url = this.buildSearchUrl(config);
      log(`Начинаю парсинг: ${url}`);
      const html = await this.fetchPage(url);
      const professionLink = this.findProfessionLinkJsdom(html, config.searchQuery || '');
      if (!professionLink) {
        log('Ссылка на профессию не найдена!');
        return { vacancies: [], totalFound: 0, page: 1, hasNextPage: false };
      }
      log(`Найдена ссылка на профессию: ${professionLink}`);
      // Парсим карточки вакансий на странице профессии
      await this.parseVacancyCards(professionLink);
      return { vacancies: [], totalFound: 0, page: 1, hasNextPage: false };
    } catch (error) {
      log('Ошибка при парсинге:', error);
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
   * Заглушка для parseVacancyDetails (требуется интерфейсом)
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async parseVacancyDetails(_url: string): Promise<Vacancy> {
    throw new Error('Метод parseVacancyDetails не реализован на этом этапе.');
  }
}
