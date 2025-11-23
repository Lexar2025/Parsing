/**
 * Парсер для сайта rabota.md
 * Версия с упрощенной пагинацией
 */

import axios, { AxiosInstance } from 'axios';
import { JSDOM } from 'jsdom';
import { Parser, ParserConfig, ParseResult, Vacancy } from '../types/vacancy.js';
import { log, pause } from '../utils/helpers.js';

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
   * Основной метод парсинга с поддержкой пагинации
   */
  async parse(config: ParserConfig): Promise<ParseResult> {
    try {
      log(`Начинаю поиск профессии: ${config.searchQuery}\n`);

      // Шаг 1: Получаем главную страницу поиска
      const searchUrl = this.buildSearchUrl(config);
      const searchHtml = await this.fetchPage(searchUrl);

      // Шаг 2: Ищем ссылку на профессию
      const professionLink = this.findProfessionLink(searchHtml, config.searchQuery || '');

      if (!professionLink) {
        log(`Профессия "${config.searchQuery}" не найдена`);
        return {
          vacancies: [],
          totalFound: 0,
          page: 1,
          hasNextPage: false,
        };
      }

      log(`Найдена ссылка на профессию: ${professionLink}\n`);

      // Шаг 3: Парсим все страницы с вакансиями
      const allVacancies = await this.parseAllPages(
        professionLink,
        config.maxPages || 10,
        config.delay || 1000,
      );

      log(`\n${'='.repeat(60)}`);
      log(`📊 ИТОГО: Найдено ${allVacancies.length} вакансий`);
      log('='.repeat(60));

      return {
        vacancies: allVacancies,
        totalFound: allVacancies.length,
        page: 1,
        hasNextPage: false,
      };
    } catch (error) {
      log('❌ Ошибка при парсинге:', error);
      throw error;
    }
  }

  /**
   * Парсинг всех страниц с вакансиями
   * URL формируется как: базовый_url, базовый_url/2, базовый_url/3 и т.д.
   */
  private async parseAllPages(
    professionUrl: string,
    maxPages: number,
    delay: number,
  ): Promise<Vacancy[]> {
    const allVacancies: Vacancy[] = [];
    let currentPage = 1;
    let emptyPagesCount = 0;

    while (currentPage <= maxPages && emptyPagesCount < 2) {
      log(`📄 Парсинг страницы ${currentPage}...`);

      // Формируем URL для текущей страницы
      // Страница 1: baseUrl (без /1)
      // Страница 2: baseUrl/2
      // Страница 3: baseUrl/3 и т.д.
      const pageUrl = currentPage === 1 ? professionUrl : `${professionUrl}/${currentPage}`;

      log(`   URL: ${pageUrl}`);

      try {
        // Парсим вакансии со страницы
        const vacancies = await this.parseVacanciesFromPage(pageUrl);

        if (vacancies.length === 0) {
          emptyPagesCount++;
          log(`   ⚠️  Страница ${currentPage} пуста (пустых подряд: ${emptyPagesCount})`);

          // Если 2 страницы подряд пустые - точно конец
          if (emptyPagesCount >= 2) {
            log(`   ⛔ Две пустые страницы подряд - завершаем парсинг`);
            break;
          }
        } else {
          emptyPagesCount = 0; // Сбрасываем счетчик пустых страниц
          allVacancies.push(...vacancies);
          log(`   ✅ Найдено ${vacancies.length} вакансий (всего: ${allVacancies.length})`);
        }

        // Задержка между запросами
        if (currentPage < maxPages) {
          await pause(delay);
        }

        currentPage++;
      } catch (error) {
        // Если ошибка 404 — останавливаем парсинг
        if (error && typeof error === 'object' && 'response' in error && error.response?.status === 404) {
          log(`   ⛔ Получен 404 — страница не существует, завершаем парсинг.`);
          break;
        }
        log(`   ❌ Ошибка при парсинге страницы ${currentPage}:`, error);
        // Продолжаем даже при ошибке
        currentPage++;
      }
    }

    return allVacancies;
  }

  /**
   * Поиск ссылки на профессию по названию
   */
  private findProfessionLink(html: string, searchQuery: string): string | null {
    const dom = new JSDOM(html);
    const document = dom.window.document;

    // Упрощённый поиск контейнера профессий через прямой селектор
    const targetContainer = document.querySelector(
      '#main .content-container.px-3.lg\\:px-0.pt-5.sm\\:pt-6'
 );

    if (!targetContainer) {
      return null;
    }

    const professionLinks = targetContainer.querySelectorAll('a.professionsItem');

    if (professionLinks.length === 0) {
      return null;
    }

    const searchLower = searchQuery.trim().toLowerCase();

    for (const link of professionLinks) {
      const titleElement = link.querySelector('div.text-black');
      const title = titleElement?.textContent?.trim().toLowerCase() || '';

      if (title === searchLower) {
        const href = link.getAttribute('href');
        return href ? this.normalizeUrl(href) : null;
      }
    }

    return null;
  }

  /**
   * Парсинг вакансий с одной страницы
   */
  private async parseVacanciesFromPage(url: string): Promise<Vacancy[]> {
    const html = await this.fetchPage(url);
    const dom = new JSDOM(html);
    const document = dom.window.document;

    const container = document.querySelector('.b_info10');

    if (!container) {
      return [];
    }

    const cards = container.querySelectorAll('.vacancyCardItem');
    const vacancies: Vacancy[] = [];

    cards.forEach((card) => {
      try {
        const vacancy = this.extractVacancyFromCard(card);
        if (vacancy) {
          vacancies.push(vacancy);
        }
      } catch {
        // Тихо пропускаем ошибки парсинга отдельных карточек
      }
    });

    return vacancies;
  }

  /**
   * Извлечение данных вакансии из карточки
   */
  private extractVacancyFromCard(card: Element): Vacancy | null {
    const titleLink = card.querySelector('a.vacancyShowPopup');
    const titleElement = titleLink?.querySelector('span');
    const title = titleElement?.textContent?.trim() || '';
    const url = titleLink?.getAttribute('href') || '';

    if (!title || !url) {
      return null;
    }

    const infoBlock = card.querySelector('.text-black.flex.items-center');
    const companyElement = infoBlock?.querySelector('a span');
    const company = companyElement?.textContent?.trim() || undefined;

    const location = this.extractInfoByIcon(infoBlock, '_location');
    const salary = this.extractInfoByIcon(infoBlock, '_salary');

    return {
      id: this.extractIdFromUrl(url),
      title,
      company,
      salary,
      location,
      url: this.normalizeUrl(url),
      source: 'rabota.md',
    };
  }

  /**
   * Извлечение информации по SVG иконке
   */
  private extractInfoByIcon(infoBlock: Element | null, iconName: string): string | undefined {
    if (!infoBlock) return undefined;

    const divs = infoBlock.querySelectorAll('div.flex.items-center');

    for (const div of divs) {
      const svg = div.querySelector('svg use');
      const href = svg?.getAttribute('href') || '';

      if (href.includes(iconName)) {
        const span = div.querySelector('span');
        const text = span?.textContent?.trim();
        return text || undefined;
      }
    }

    return undefined;
  }

  /**
   * Построение URL для поиска
   */
  private buildSearchUrl(config: ParserConfig): string {
    const params = new URLSearchParams();

    if (config.searchQuery) {
      params.append('search', config.searchQuery);
    }

    const queryString = params.toString();
    return queryString ? `${this.baseUrl}/ru/jobs?${queryString}` : `${this.baseUrl}/ru/jobs`;
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
        log(`❌ Ошибка HTTP: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Нормализация URL
   */
  private normalizeUrl(url: string): string {
    return url.startsWith('http') ? url : `${this.baseUrl}${url}`;
  }

  /**
   * Извлечение ID из URL
   */
  private extractIdFromUrl(url: string): string {
    const match = url.match(/\/(\d+)/);
    return match ? match[1] : url;
  }

  /**
   * Парсинг детальной страницы вакансии (пока не реализовано)
   */
  async parseVacancyDetails(url: string): Promise<Vacancy> {
    log(`parseVacancyDetails вызван для ${url}, но пока не реализован`);
    throw new Error('Метод parseVacancyDetails пока не реализован');
  }
}
