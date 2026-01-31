/**
 * Парсер для сайта 999.md (раздел работа)
 * Версия с Puppeteer + детальный парсинг + кэширование
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
  parseDetails?: boolean;
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
      cacheTTLSeconds: opts?.cacheTTLSeconds ?? 60 * 60 * 24,
      headless: opts?.headless ?? true,
      parseDetails: opts?.parseDetails ?? true,
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

      // Шаг 4: Удаляем дубликаты по ID
      const uniqueVacancies = this.removeDuplicates(allVacancies);

      log(`\n${'='.repeat(60)}`);
      log(`📊 ИТОГО: Найдено ${allVacancies.length} вакансий`);
      log(`✅ Уникальных: ${uniqueVacancies.length} вакансий`);
      if (allVacancies.length > uniqueVacancies.length) {
        log(`🗑️  Удалено дубликатов: ${allVacancies.length - uniqueVacancies.length}`);
      }
      log('='.repeat(60));

      // Шаг 5: Парсим детали вакансий (если включено)
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
    } catch (error) {
      log('❌ Ошибка при парсинге:', error instanceof Error ? error.message : String(error));
      throw error;
    } finally {
      await this.close();
    }
  }

  /**
   * Парсинг деталей для массива вакансий с кэшированием
   */
  private async parseVacanciesDetails(vacancies: Vacancy[]): Promise<Vacancy[]> {
    // Убедимся, что папка кэша существует
    if (this.options.cacheEnabled) {
      try {
        await fs.mkdir(this.options.cacheDir, { recursive: true });
      } catch {
        log('⚠️ Не удалось создать директорию кэша:', this.options.cacheDir);
      }
    }

    const limit = pLimit(this.options.concurrency);
    let processed = 0;

    const detailed = await Promise.all(
      vacancies.map((v) =>
        limit(async () => {
          try {
            const extra = await this.parseVacancyDetailsWithCache(v.url);
            processed++;
            
            // Прогресс каждые 10 вакансий
            if (processed % 10 === 0 || processed === vacancies.length) {
              log(`   Обработано: ${processed}/${vacancies.length}`);
            }
            
            return { ...v, ...extra };
          } catch (err) {
            const errorInfo = err instanceof Error ? {
              name: err.name,
              message: err.message,
              stack: err.stack
            } : {
              name: 'UnknownError',
              message: 'Неизвестная ошибка',
              stack: undefined
            };
            
            log(`⚠️ Ошибка деталей для ${v.url}:`, {
              ...errorInfo,
              url: v.url,
              vacancyId: v.id,
              source: '999.md'
            });
            return v;
          }
        }),
      ),
    );

    return detailed;
  }

  /**
   * Парсинг деталей вакансии с кэшированием
   */
  private async parseVacancyDetailsWithCache(url: string): Promise<Partial<Vacancy>> {
    if (!this.options.cacheEnabled) {
      return this.parseVacancyDetails(url);
    }

    const key = this.hash(url);
    const filePath = path.join(this.options.cacheDir, `${key}.json`);

    try {
      const stat = await fs.stat(filePath).catch(() => null);
      if (stat) {
        const now = Date.now();
        const mtime = stat.mtime.getTime();
        const ageSeconds = (now - mtime) / 1000;

        if (ageSeconds < this.options.cacheTTLSeconds) {
          // Кэш свежий, читаем
          const raw = await fs.readFile(filePath, 'utf-8');
          const parsed = JSON.parse(raw) as Partial<Vacancy>;
          return parsed;
        }
      }
    } catch {
      // Игнорируем ошибки чтения кэша
    }

    // Кэша нет или устарел - парсим
    const details = await this.parseVacancyDetails(url);

    // Сохраняем в кэш
    try {
      await fs.writeFile(filePath, JSON.stringify(details, null, 2), 'utf-8');
    } catch {
      log('⚠️ Не удалось записать кэш:', filePath);
    }

    return details;
  }

  /**
   * Парсинг детальной страницы вакансии
   */
    async parseVacancyDetails(url: string): Promise<Partial<Vacancy>> {
    if (!this.browser) {
      await this.initBrowser();
    }

    if (!this.browser) throw new Error('Браузер не инициализирован');

    const page = await this.browser.newPage();

    try {
      await this.setupPage(page);
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 40000 });

      await page.waitForSelector('.styles_features__Ws32g', { timeout: 15000 });
      await pause(500);

      // ✅ ИСПРАВЛЕНО: используем Partial<Vacancy> вместо локального интерфейса
      const details = await page.evaluate((): Partial<Vacancy> => {
        const result: Partial<Vacancy> = {};

        const features = document.querySelectorAll('.styles_group__feature__5ZWJy');
        
        const featureMap = new Map<string, string>();
        features.forEach((feature) => {
          const keyEl = feature.querySelector('.styles_group__key__uRhnQ');
          const valueEl = feature.querySelector('.styles_group__value__XN7OI');
          const key = keyEl?.textContent?.trim();
          const value = valueEl?.textContent?.trim();
          if (key && value) {
            featureMap.set(key, value);
          }
        });

        // ✅ ИСПРАВЛЕНО: используем поля из общего интерфейса Vacancy
        result.author = featureMap.get('Автор') || undefined;
        result.education = featureMap.get('Образование') || undefined;
        result.experience = featureMap.get('Стаж работы') || undefined;
        result.salary = featureMap.get('Зарплата') || undefined;
        result.schedule = featureMap.get('График работы') || undefined;
        result.employmentType = featureMap.get('Тип занятости') || undefined;
        result.companyType = featureMap.get('Тип компании') || undefined;
        result.contactPerson = featureMap.get('Контактное лицо') || undefined;
        result.company = featureMap.get('Название компании') || undefined;
        // ✅ ДОБАВЛЕНО: новое поле для разделения "В Молдове" / "За границей"
        result.workLocationType = featureMap.get('Место работы') || undefined;
        
        const seasonalText = featureMap.get('Сезонная работа');
        result.seasonal = seasonalText === 'Да';

        // Языки
        const languagesGroup = Array.from(document.querySelectorAll('.styles_group__aota8')).find(
          (group) => group.querySelector('h2')?.textContent?.trim() === 'Знание языков',
        );
        
        if (languagesGroup) {
          const langFeatures = languagesGroup.querySelectorAll('.styles_group__feature__5ZWJy');
          result.languages = Array.from(langFeatures)
            .map((f) => f.querySelector('.styles_group__key__uRhnQ')?.textContent?.trim())
            .filter((l): l is string => l !== undefined && l.trim() !== '');
        }

        // Регион/адрес
        const addressEl = document.querySelector('.styles_address__text__duvKg');
        if (addressEl) {
          const addressText = addressEl.textContent?.trim();
          if (addressText) {
            result.region = addressText;
            result.location = addressText;
          }
        }

        // Описание
        const descriptionEl = document.querySelector('.styles_textcontent__XH6FS.styles_desktop__d_kP8');
        if (descriptionEl) {
          result.description = descriptionEl.textContent?.trim() || undefined;
        }

        return result;
      });

      return details;
    } catch (error) {
      const errorInfo = error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : {
        name: 'UnknownError',
        message: 'Неизвестная ошибка при парсинге деталей',
        stack: undefined
      };
      
      log(`❌ Ошибка при парсинге деталей ${url}:`, {
        ...errorInfo,
        url,
        source: '999.md'
      });
      return {};
    } finally {
      await page.close();
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
   * Поиск ссылки на категорию вакансий
   */
  private async findCategoryLink(searchUrl: string, searchQuery: string): Promise<string | null> {
    if (!this.browser) throw new Error('Браузер не инициализирован');

    const page = await this.browser.newPage();

    try {
      await this.setupPage(page);
      await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 40000 });

      // Ждём загрузки подкатегорий
      await page.waitForSelector('a[data-subcategory]', { timeout: 15000 });

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
 * Определение общего количества страниц
 */
private async getTotalPages(firstPageUrl: string): Promise<number> {
  if (!this.browser) throw new Error('Браузер не инициализирован');

  const page = await this.browser.newPage();

  try {
    await this.setupPage(page);
    await page.goto(firstPageUrl, { waitUntil: 'networkidle2', timeout: 40000 });

    // Новый селектор для пагинации 999.md
    const totalPages = await page.evaluate(() => {
      // Ищем контейнер пагинации
      const paginationContainer = document.querySelector('.Pagination_pagination__container__xR1GS');
      if (!paginationContainer) {
        return 1; // Пагинации нет
      }

      // Ищем все кнопки страниц с атрибутом data-test-page-value
      const pageButtons = paginationContainer.querySelectorAll('[data-test-page-value]');
      
      if (pageButtons.length === 0) {
        return 1;
      }

      // Извлекаем максимальное значение из атрибутов
      let maxPage = 1;
      pageButtons.forEach((button) => {
        const pageValue = button.getAttribute('data-test-page-value');
        if (pageValue) {
          const pageNum = parseInt(pageValue, 10);
          if (pageNum > maxPage) {
            maxPage = pageNum;
          }
        }
      });

      // Проверяем, есть ли кнопка "далее" (значит страниц больше, чем отображено)
      const nextButton = paginationContainer.querySelector('.Pagination_pagination__container__buttons__wrapper__icon__next__A22Rc');
      if (nextButton && !nextButton.hasAttribute('disabled')) {
        // Есть кнопка "далее" и она активна → страниц больше
        // Возвращаем увеличенное значение
        return Math.max(maxPage, 20);
      }

      return maxPage;
    });

    return totalPages;
  } catch (error) {
    log('⚠️ Не удалось определить количество страниц:', error instanceof Error ? error.message : String(error));
    return 10; // По умолчанию
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
    
    // Определяем реальное количество страниц
    const totalPages = await this.getTotalPages(categoryUrl);
    const pagesToParse = Math.min(totalPages, maxPages);
    
    log(`📊 Всего страниц на сайте: ${totalPages}`);
    log(`📄 Будет обработано: ${pagesToParse} страниц\n`);

    for (let currentPage = 1; currentPage <= pagesToParse; currentPage++) {
      log(`📄 Парсинг страницы ${currentPage}/${pagesToParse}...`);

      const pageUrl = this.buildPageUrl(categoryUrl, currentPage);
      log(`   URL: ${pageUrl}`);

      try {
        const vacancies = await this.parseVacanciesFromPage(pageUrl);

        if (vacancies.length === 0) {
          log(`   ⚠️  Страница ${currentPage} пуста`);
        } else {
          allVacancies.push(...vacancies);
          log(`   ✅ Найдено ${vacancies.length} вакансий (всего: ${allVacancies.length})`);
        }

        if (currentPage < pagesToParse) {
          await pause(delay);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log(`   ❌ Ошибка при парсинге страницы ${currentPage}:`, errorMessage);

        // Если таймаут, пробуем еще раз с увеличенной задержкой
        if (error instanceof Error && error.name === 'TimeoutError') {
          log(`   ⏳ Увеличиваю задержку и пробую еще раз...`);
          await pause(delay * 2);
          
          // Повторная попытка
          try {
            const vacancies = await this.parseVacanciesFromPage(pageUrl);
            if (vacancies.length > 0) {
              allVacancies.push(...vacancies);
              log(`   ✅ Повторная попытка успешна: ${vacancies.length} вакансий`);
            }
          } catch (retryError) {
            const retryMessage = retryError instanceof Error ? retryError.message : String(retryError);
            log(`   ❌ Повторная попытка не удалась:`, retryMessage);
          }
        }
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
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 40000 });
      await page.waitForSelector('.styles_adlist__3YsgA', { timeout: 15000 });
      await page.waitForSelector('article.AdVacancies_wrapper__oZp_b', { timeout: 10000 }).catch(() => {});
      await pause(1000);

      const vacancies = await page.$$eval('article.AdVacancies_wrapper__oZp_b', (cards) =>
        cards
          .map((card) => {
            try {
              const titleLink = card.querySelector('h5.AdVacancies_title__link__V9IOY a');
              const title = titleLink?.textContent?.trim() || '';
              const url = titleLink?.getAttribute('href') || '';

              if (!title || !url) return null;

              const features = card.querySelectorAll('.AdVacancies_features__item__IBTIr');
              const schedule = features[0]?.textContent?.trim() || undefined;
              const experience = features[1]?.textContent?.trim() || undefined;
              const education = features[2]?.textContent?.trim() || undefined;

              const idMatch = url.match(/\/(\d+)/);
              const id = idMatch ? idMatch[1] : url;

              // ✅ ИСПРАВЛЕНО: убрал лишние пробелы в URL
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
          })
          .filter((v): v is NonNullable<typeof v> => v !== null) as Vacancy[],
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
    
    // Удаляем все параметры и добавляем только нужные
    url.search = '';
    
    // appl=1 означает "предлагаю работу" (это основной фильтр)
    url.searchParams.set('appl', '1');
    
    // ef - дополнительные фильтры (обязательны для корректной работы)
    url.searchParams.set('ef', '16,50,9394,56,66');
    
    // o_16_1=983 - сортировка по релевантности
    url.searchParams.set('o_16_1', '983');
    
    return url.toString();
  }

  /**
   * Нормализация URL
   */
  private normalizeUrl(url: string): string {
    return url.startsWith('http') ? url : `${this.baseUrl}${url}`;
  }

  /**
   * Утилита: md5 hash
   */
  private hash(input: string): string {
    return crypto.createHash('md5').update(input).digest('hex');
  }
}
