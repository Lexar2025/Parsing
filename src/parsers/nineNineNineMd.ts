/**
 * Парсер для сайта 999.md (раздел работа)
 * Версия с Puppeteer для обработки динамического контента Next.js
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import * as fs from 'fs/promises';
import * as path from 'path';
import crypto from 'crypto';
import pLimit from 'p-limit';
import { Parser, ParserConfig, ParseResult, Vacancy } from '../types/vacancy.js';
import { log, pause } from '../utils/helpers.js';

type ParserOptions = {
  concurrency?: number;
  cacheEnabled?: boolean;
  cacheDir?: string;
  cacheTTLSeconds?: number;
  headless?: boolean;
};

export class NineNineNineMdParser implements Parser {
  private readonly baseUrl = 'https://999.md';
  private options: Required<ParserOptions>;
  private browser: Browser | null = null;

  constructor(opts?: ParserOptions) {
    this.options = {
      concurrency: opts?.concurrency ?? 3,
      cacheEnabled: opts?.cacheEnabled ?? true,
      cacheDir: opts?.cacheDir ?? path.resolve(process.cwd(), 'cache', '999-md'),
      cacheTTLSeconds: opts?.cacheTTLSeconds ?? 60 * 60 * 24, // 24 часа
      headless: opts?.headless ?? true,
    };
  }

  /**
   * Инициализация браузера
   */
  private async initBrowser(): Promise<void> {
    if (this.browser) return;

    log('🚀 Запуск браузера Puppeteer...\n');

    this.browser = await puppeteer.launch({
      headless: this.options.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
      ],
    });
  }

  /**
   * Закрытие браузера
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      log('👋 Браузер закрыт\n');
    }
  }

  /**
   * Основной метод парсинга с поддержкой пагинации
   */
  async parse(config: ParserConfig): Promise<ParseResult> {
    try {
      await this.initBrowser();

      log(`Начинаю поиск вакансий на 999.md: ${config.searchQuery || 'все категории'}\n`);

      // Шаг 1: Получаем главную страницу раздела работа
      const searchUrl = this.buildSearchUrl();
      const categoryLink = await this.findCategoryLink(searchUrl, config.searchQuery || '');

      if (!categoryLink) {
        log(`Категория "${config.searchQuery}" не найдена`);
        return {
          vacancies: [],
          totalFound: 0,
          page: 1,
          hasNextPage: false,
        };
      }

      log(`Найдена ссылка на категорию: ${categoryLink}\n`);

      // Шаг 2: Добавляем фильтр "Предлагая работу"
      const categoryWithFilter = this.addJobOfferFilter(categoryLink);
      log(`URL с фильтром: ${categoryWithFilter}\n`);

      // Шаг 3: Парсим все страницы с вакансиями
      const allVacancies = await this.parseAllPages(
        categoryWithFilter,
        config.maxPages || 10,
        config.delay || 1500,
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
    } finally {
      await this.close();
    }
  }

  /**
   * Поиск ссылки на категорию вакансий
   */
  private async findCategoryLink(searchUrl: string, searchQuery: string): Promise<string | null> {
    if (!this.browser) throw new Error('Браузер не инициализирован');

    const page = await this.browser.newPage();

    try {
      await this.setupPage(page);
      await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });

      // Ждём загрузки подкатегорий
      await page.waitForSelector('a[data-subcategory]', { timeout: 10000 });

      // Получаем все подкатегории
      const categories = await page.$$eval('a[data-subcategory]', (links) =>
        links.map((link) => ({
          text: link.textContent?.trim() || '',
          href: link.getAttribute('href') || '',
        })),
      );

      if (categories.length === 0) {
        return null;
      }

      const searchLower = searchQuery.trim().toLowerCase();

      // Если не указана категория, берем первую
      if (!searchQuery) {
        return this.normalizeUrl(categories[0].href);
      }

      // Ищем категорию по названию
      for (const cat of categories) {
        if (cat.text.toLowerCase().includes(searchLower)) {
          return this.normalizeUrl(cat.href);
        }
      }

      return null;
    } finally {
      await page.close();
    }
  }

  /**
   * Парсинг всех страниц с вакансиями
   */
  private async parseAllPages(
    categoryUrl: string,
    maxPages: number,
    delay: number,
  ): Promise<Vacancy[]> {
    const allVacancies: Vacancy[] = [];
    let currentPage = 1;
    let emptyPagesCount = 0;

    while (currentPage <= maxPages && emptyPagesCount < 2) {
      log(`📄 Парсинг страницы ${currentPage}...`);

      const pageUrl = this.buildPageUrl(categoryUrl, currentPage);
      log(`   URL: ${pageUrl}`);

      try {
        const vacancies = await this.parseVacanciesFromPage(pageUrl);

        if (vacancies.length === 0) {
          emptyPagesCount++;
          log(`   ⚠️  Страница ${currentPage} пуста (пустых подряд: ${emptyPagesCount})`);

          if (emptyPagesCount >= 2) {
            log(`   ⛔ Две пустые страницы подряд - завершаем парсинг`);
            break;
          }
        } else {
          emptyPagesCount = 0;
          allVacancies.push(...vacancies);
          log(`   ✅ Найдено ${vacancies.length} вакансий (всего: ${allVacancies.length})`);
        }

        if (currentPage < maxPages) {
          await pause(delay);
        }

        currentPage++;
      } catch (error) {
        log(`   ❌ Ошибка при парсинге страницы ${currentPage}:`, error);
        emptyPagesCount++;
        currentPage++;
      }
    }

    // Парсинг деталей вакансий (если требуется)
    if (allVacancies.length === 0) {
      return allVacancies;
    }

    // Убедимся, что папка кэша существует
    if (this.options.cacheEnabled) {
      try {
        await fs.mkdir(this.options.cacheDir, { recursive: true });
      } catch {
        log('⚠️ Не смог создать директорию кэша:', this.options.cacheDir);
      }
    }

    return allVacancies;
  }

  /**
   * Парсинг вакансий с одной страницы
   */
  private async parseVacanciesFromPage(url: string): Promise<Vacancy[]> {
    if (!this.browser) throw new Error('Браузер не инициализирован');

    const page = await this.browser.newPage();

    try {
      await this.setupPage(page);
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

      // Ждём загрузки контейнера с вакансиями
      await page.waitForSelector('.styles_adlist__3YsgA', { timeout: 10000 });

      // Ждём загрузки карточек вакансий (даём дополнительное время на JS)
      await page.waitForSelector('article.AdVacancies_wrapper__oZp_b', {
        timeout: 5000,
      }).catch(() => {
        // Карточек может не быть на странице
      });

      // Извлекаем данные вакансий
      const vacancies = await page.$$eval('article.AdVacancies_wrapper__oZp_b', (cards) =>
        cards.map((card) => {
          try {
            // Заголовок и ссылка
            const titleLink = card.querySelector('h5.AdVacancies_title__link__V9IOY a');
            const title = titleLink?.textContent?.trim() || '';
            const url = titleLink?.getAttribute('href') || '';

            if (!title || !url) return null;

            // Характеристики вакансии
            const features = card.querySelectorAll('.AdVacancies_features__item__IBTIr');

            // Обычно: [график работы, опыт работы, образование]
            const schedule = features[0]?.textContent?.trim() || undefined;
            const experience = features[1]?.textContent?.trim() || undefined;
            const education = features[2]?.textContent?.trim() || undefined;

            // Извлекаем ID из URL
            const idMatch = url.match(/\/(\d+)/);
            const id = idMatch ? idMatch[1] : url;

            return {
              id,
              title,
              url: url.startsWith('http') ? url : `https://999.md${url}`,
              schedule,
              experience,
              education,
              source: '999.md',
            };
          } catch {
            return null;
          }
        }).filter((v): v is Vacancy => v !== null),
      );

      return vacancies;
    } finally {
      await page.close();
    }
  }

  /**
   * Настройка страницы (User-Agent, viewport)
   */
  private async setupPage(page: Page): Promise<void> {
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    );
  }

  /**
   * Построение URL для поиска
   */
  private buildSearchUrl(): string {
    return `${this.baseUrl}/ru/category/work`;
  }

  /**
   * Построение URL для страницы с пагинацией
   */
  private buildPageUrl(categoryUrl: string, page: number): string {
    const url = new URL(categoryUrl, this.baseUrl);
    if (page > 1) {
      url.searchParams.set('page', page.toString());
    }
    return url.toString();
  }

  /**
   * Добавление фильтра "Предлагая работу" к URL категории
   */
  private addJobOfferFilter(categoryUrl: string): string {
    const url = new URL(categoryUrl, this.baseUrl);
    url.searchParams.set('appl', '1');
    return url.toString();
  }

  /**
   * Нормализация URL
   */
  private normalizeUrl(url: string): string {
    return url.startsWith('http') ? url : `${this.baseUrl}${url}`;
  }

  /**
   * Парсинг детальной страницы вакансии
   * TODO: реализовать парсинг деталей через Puppeteer
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async parseVacancyDetails(url: string): Promise<Partial<Vacancy>> {
    // Пока возвращаем пустой объект
    // Детальный парсинг реализуем на следующем этапе
    return {};
  }

  /**
   * Утилита: md5 hash
   */
  private hash(input: string): string {
    return crypto.createHash('md5').update(input).digest('hex');
  }
}
