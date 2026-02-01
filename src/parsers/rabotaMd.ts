/**
 * Парсер для сайта rabota.md
 */

import axios, { AxiosInstance } from 'axios';
import { JSDOM } from 'jsdom';
import pLimit from 'p-limit';
import { Parser, ParserConfig, ParseResult, Vacancy } from '../types/vacancy.js';
import { log, pause } from '../utils/helpers.js';

type ParserOptions = {
  concurrency?: number;
  parseDetails?: boolean;
};

export class RabotaMdParser implements Parser {
  private axiosInstance: AxiosInstance;
  private readonly baseUrl = 'https://www.rabota.md';
  private options: Required<ParserOptions>;

  constructor(opts?: ParserOptions) {
    this.options = {
      concurrency: opts?.concurrency ?? 3,
      parseDetails: opts?.parseDetails ?? true,
    };

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

  async parse(config: ParserConfig): Promise<ParseResult> {
    try {
      log(`Начинаю поиск профессии: ${config.searchQuery}\n`);

      const searchUrl = this.buildSearchUrl(config);
      const searchHtml = await this.fetchPage(searchUrl);

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

      const allVacancies = await this.parseAllPages(
        professionLink,
        config.maxPages || 10,
        config.delay || 1000,
      );

      // Удаляем дубликаты по ID
      const uniqueVacancies = this.removeDuplicates(allVacancies);

      log(`\n${'='.repeat(60)}`);
      log(`📊 ИТОГО: Найдено ${allVacancies.length} вакансий`);
      log(`✅ Уникальных: ${uniqueVacancies.length} вакансий`);
      if (allVacancies.length > uniqueVacancies.length) {
        log(`🗑️  Удалено дубликатов: ${allVacancies.length - uniqueVacancies.length}`);
      }
      log('='.repeat(60));

      // Парсинг деталей вакансий (если включено)
      let finalVacancies = uniqueVacancies;
      if (this.options.parseDetails && uniqueVacancies.length > 0) {
        log(`\n🔍 Начинаю парсинг деталей для ${uniqueVacancies.length} вакансий...\n`);
        finalVacancies = await this.parseVacanciesDetails(uniqueVacancies);
        log(`\n✅ Детальный парсинг завершен\n`);
      }

      return {
        vacancies: finalVacancies,
        totalFound: finalVacancies.length,
        page: 1,
        hasNextPage: false,
      };
    } catch (error: unknown) {
      log('❌ Ошибка при парсинге:', error);
      throw error;
    }
  }

  /**
   * Удаление дубликатов по ID
   */
  private removeDuplicates(vacancies: Vacancy[]): Vacancy[] {
    const seen = new Set<string>();
    const unique: Vacancy[] = [];

    for (const vacancy of vacancies) {
      if (!seen.has(vacancy.id)) {
        seen.add(vacancy.id);
        unique.push(vacancy);
      }
    }

    return unique;
  }

  /**
   * Парсинг деталей для массива вакансий
   */
  private async parseVacanciesDetails(vacancies: Vacancy[]): Promise<Vacancy[]> {
    const limit = pLimit(this.options.concurrency);
    let processed = 0;

    return Promise.all(
      vacancies.map((v) =>
        limit(async () => {
          try {
            const extra = await this.parseVacancyDetails(v.url);
            processed++;

            if (processed % 10 === 0 || processed === vacancies.length) {
              log(`   Обработано: ${processed}/${vacancies.length}`);
            }

            return { ...v, ...extra };
          } catch (err: unknown) {
            log(`⚠️ Ошибка деталей для ${v.url}:`, err);
            return v;
          }
        }),
      ),
    );
  }

  /**
   * Парсинг всех страниц с вакансиями
   * С проверкой на дубликаты ID для определения конца
   */
  private async parseAllPages(
    professionUrl: string,
    maxPages: number,
    delay: number,
  ): Promise<Vacancy[]> {
    const allVacancies: Vacancy[] = [];
    const seenIds = new Set<string>();
    let currentPage = 1;
    let duplicatePagesCount = 0;

    log(`📊 Начинаю парсинг страниц (макс: ${maxPages})\n`);

    while (currentPage <= maxPages && duplicatePagesCount < 2) {
      log(`📄 Парсинг страницы ${currentPage}/${maxPages}...`);

      // Формируем URL для текущей страницы
      const pageUrl = this.buildPageUrl(professionUrl, currentPage);
      log(`   URL: ${pageUrl}`);

      try {
        const vacancies = await this.parseVacanciesFromPage(pageUrl);

        if (vacancies.length === 0) {
          log(`   ⚠️  Страница ${currentPage} пуста`);
          duplicatePagesCount++;
          
          if (duplicatePagesCount >= 2) {
            log(`   ⛔ Две пустые страницы подряд - завершаем парсинг`);
            break;
          }
        } else {
          // Проверяем на дубликаты
          let newVacanciesCount = 0;
          let duplicatesCount = 0;

          for (const vacancy of vacancies) {
            if (!seenIds.has(vacancy.id)) {
              seenIds.add(vacancy.id);
              allVacancies.push(vacancy);
              newVacanciesCount++;
            } else {
              duplicatesCount++;
            }
          }

          log(`   ✅ Найдено: ${vacancies.length} (новых: ${newVacanciesCount}, дубликатов: ${duplicatesCount})`);
          log(`   📊 Всего уникальных: ${allVacancies.length}`);

          // Если ВСЕ вакансии на странице - дубликаты, значит это повтор последней страницы
          if (newVacanciesCount === 0 && duplicatesCount > 0) {
            duplicatePagesCount++;
            log(`   ⚠️  Все вакансии - дубликаты (счетчик: ${duplicatePagesCount})`);

            if (duplicatePagesCount >= 2) {
              log(`   ⛔ Две страницы подряд с дубликатами - завершаем парсинг`);
              break;
            }
          } else {
            duplicatePagesCount = 0; // Сбрасываем счетчик если нашли новые
          }
        }

        if (currentPage < maxPages) {
          await pause(delay);
        }

        currentPage++;
      } catch (error: unknown) {
        if (
          error &&
          typeof error === 'object' &&
          'response' in error &&
          (error as { response?: { status?: number } }).response?.status === 404
        ) {
          log(`   ⛔ Получен 404 - страница не существует, завершаем парсинг`);
          break;
        }
        log(`   ❌ Ошибка при парсинге страницы ${currentPage}:`, error);
        currentPage++;
      }
    }

    return allVacancies;
  }

  /**
   * Построение URL для страницы с пагинацией
   * Новый формат: /profession, /profession/page-2, /profession/page-3
   */
  private buildPageUrl(professionUrl: string, page: number): string {
    if (page === 1) {
      return professionUrl;
    }
    
    // Убираем trailing slash если есть
    const cleanUrl = professionUrl.endsWith('/') ? professionUrl.slice(0, -1) : professionUrl;
    
    return `${cleanUrl}/page-${page}`;
  }

  private findProfessionLink(html: string, searchQuery: string): string | null {
    const dom = new JSDOM(html);
    const document = dom.window.document;

    const targetContainer = document.querySelector(
      '#main .content-container.px-3.lg\\:px-0.pt-5.sm\\:pt-6',
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

    cards.forEach((card: Element) => {
      try {
        const vacancy = this.extractVacancyFromCard(card);
        if (vacancy) {
          vacancies.push(vacancy);
        }
      } catch {
        // Тихо пропускаем ошибки
      }
    });

    return vacancies;
  }

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

  private extractInfoByIcon(infoBlock: Element | null, iconName: string): string | undefined {
    if (!infoBlock) return undefined;

    const divs = infoBlock.querySelectorAll('div.flex.items-center');

    for (const div of Array.from(divs)) {
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

  private buildSearchUrl(config: ParserConfig): string {
    const params = new URLSearchParams();

    if (config.searchQuery) {
      params.append('search', config.searchQuery);
    }

    const queryString = params.toString();
    return queryString ? `${this.baseUrl}/ru/jobs?${queryString}` : `${this.baseUrl}/ru/jobs`;
  }

  private async fetchPage(url: string): Promise<string> {
    try {
      const response = await this.axiosInstance.get(url);
      return response.data as string;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        log(`❌ Ошибка HTTP: ${error.message}`);
      }
      throw error;
    }
  }

  private normalizeUrl(url: string): string {
    return url.startsWith('http') ? url : `${this.baseUrl}${url}`;
  }

  private extractIdFromUrl(url: string): string {
    const match = url.match(/\/(\d+)/);
    return match ? match[1] : url;
  }

  async parseVacancyDetails(url: string): Promise<Partial<Vacancy>> {
    const html = await this.fetchPage(url);
    const dom = new JSDOM(html);
    const document = dom.window.document;

    const details: Partial<Vacancy> = {};

    // --- Извлечение описания (два типа страниц: VIP и free) ---
    // VIP: контейнер .vacancy-content.inbody внутри .vip-vacancy-content
    const vipDesc = document.querySelector(
      '.vip-vacancy-content .vacancy-content.inbody'
    );

    // Free: div.text-black внутри контейнера с calc-шириной в .free-vacancy-content
    let freeDesc: Element | null = null;
    const freeContainer = document.querySelector('.free-vacancy-content');
    if (freeContainer) {
      const allDivs = freeContainer.querySelectorAll('div');
      for (const div of Array.from(allDivs)) {
        const hasCalcWidth = Array.from(div.classList).some(
          (c) => c.startsWith('w-[calc(') && c.includes('66.666')
        );
        if (hasCalcWidth) {
          const textBlack = div.querySelector('div > div.text-black');
          if (textBlack) {
            freeDesc = textBlack;
            break;
          }
        }
      }
    }

    const descriptionEl = vipDesc || freeDesc;
    if (descriptionEl) {
      const text = descriptionEl.textContent?.trim();
      if (text) {
        details.description = text;
        details.fullDescription = text;
      }
    }

    // --- Извлечение полей из таблицы деталей ---
    const labelNodes = document.querySelectorAll('.text-gray-400');

    labelNodes.forEach((labelNode: Element) => {
      const label = labelNode.textContent?.trim().replace(':', '') || '';
      const valueNode = labelNode.parentElement?.querySelector('.text-gray-700');
      const value = valueNode?.textContent?.trim();

      if (!label || !value) return;

      switch (label) {
        case 'Город':
          details.location = value;
          break;
        case 'Главный офис':
          // Адрес головного офиса — используется как location когда город = "За границей"
          details.workPlace = value;
          break;
        case 'Образование':
          details.education = value;
          break;
        case 'Опыт работы':
          details.experience = value;
          break;
        case 'Зарплата':
          details.salary = value;
          break;
        case 'График работы':
          // Значения: "На постоянной основе", "Неполная занятость", "Посменно" и др.
          // Адаптер маппит это в наш employment (full/part/project)
          details.schedule = value;
          break;
        case 'Рабочее место':
          // Значения: "По месту нахождения работодателя", "Удаленный", "Гибридный режим" и др.
          // Адаптер маппит это в наш schedule (office/remote/hybrid)
          details.employmentType = value;
          break;
      }
    });

    return details;
  }

}
