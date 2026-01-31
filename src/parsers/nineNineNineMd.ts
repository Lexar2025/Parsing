/**
 * Парсер для сайта 999.md (раздел работа)
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import pLimit from 'p-limit';
import { Parser, ParserConfig, ParseResult, Vacancy } from '../types/vacancy.js';
import { log, pause } from '../utils/helpers.js';

type ParserOptions = {
  concurrency?: number;
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
      headless: opts?.headless ?? true,
      parseDetails: opts?.parseDetails ?? true,
    };
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

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

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      log('👋 Браузер закрыт\n');
    }
  }

  // ---------------------------------------------------------------------------
  // Main entry
  // ---------------------------------------------------------------------------

  async parse(config: ParserConfig): Promise<ParseResult> {
    try {
      await this.initBrowser();

      log(`Начинаю поиск вакансий на 999.md: ${config.searchQuery || 'все категории'}\n`);

      // Шаг 1: Получаем главную страницу раздела работа
      const searchUrl = this.buildSearchUrl();
      const categoryLink = await this.findCategoryLink(searchUrl, config.searchQuery || '');

      if (!categoryLink) {
        log(`Категория "${config.searchQuery}" не найдена`);
        return { vacancies: [], totalFound: 0, page: 1, hasNextPage: false };
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

  // ---------------------------------------------------------------------------
  // Detail parsing
  // ---------------------------------------------------------------------------

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
          } catch (err) {
            log(`⚠️ Ошибка деталей для ${v.url}:`, err instanceof Error ? err.message : String(err));
            return v;
          }
        }),
      ),
    );
  }

  async parseVacancyDetails(url: string): Promise<Partial<Vacancy>> {
    if (!this.browser) await this.initBrowser();
    if (!this.browser) throw new Error('Браузер не инициализирован');

    const page = await this.browser.newPage();

    try {
      await this.setupPage(page);
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 40000 });
      await page.waitForSelector('.styles_features__Ws32g', { timeout: 15000 });
      await pause(500);

      return await page.evaluate((): Partial<Vacancy> => {
        const result: Partial<Vacancy> = {};

        // Собираем все key-value пары из таблицы характеристик
        const featureMap = new Map<string, string>();
        document.querySelectorAll('.styles_group__feature__5ZWJy').forEach((feature) => {
          const key = feature.querySelector('.styles_group__key__uRhnQ')?.textContent?.trim();
          const value = feature.querySelector('.styles_group__value__XN7OI')?.textContent?.trim();
          if (key && value) featureMap.set(key, value);
        });

        result.author = featureMap.get('Автор');
        result.education = featureMap.get('Образование');
        result.experience = featureMap.get('Стаж работы');
        result.salary = featureMap.get('Зарплата');
        result.schedule = featureMap.get('График работы');
        result.employmentType = featureMap.get('Тип занятости');
        result.companyType = featureMap.get('Тип компании');
        result.contactPerson = featureMap.get('Контактное лицо');
        result.company = featureMap.get('Название компании');
        result.workLocationType = featureMap.get('Место работы');
        result.seasonal = featureMap.get('Сезонная работа') === 'Да';

        // Языки — отдельная группа
        const languagesGroup = Array.from(document.querySelectorAll('.styles_group__aota8')).find(
          (group) => group.querySelector('h2')?.textContent?.trim() === 'Знание языков',
        );
        if (languagesGroup) {
          result.languages = Array.from(languagesGroup.querySelectorAll('.styles_group__feature__5ZWJy'))
            .map((f) => f.querySelector('.styles_group__key__uRhnQ')?.textContent?.trim())
            .filter((l): l is string => l !== undefined && l.trim() !== '');
        }

        // Регион / адрес
        const addressText = document.querySelector('.styles_address__text__duvKg')?.textContent?.trim();
        if (addressText) {
          result.region = addressText;
          result.location = addressText;
        }

        // Описание
        const descriptionText = document
          .querySelector('.styles_textcontent__XH6FS.styles_desktop__d_kP8')
          ?.textContent?.trim();
        if (descriptionText) {
          result.description = descriptionText;
        }

        return result;
      });
    } catch (error) {
      log(`❌ Ошибка при парсинге деталей ${url}:`, error instanceof Error ? error.message : String(error));
      return {};
    } finally {
      await page.close();
    }
  }

  // ---------------------------------------------------------------------------
  // Pagination & page parsing
  // ---------------------------------------------------------------------------

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

      if (categories.length === 0) return null;
      if (!searchQuery) return this.normalizeUrl(categories[0].href);

      const searchLower = searchQuery.trim().toLowerCase();
      const match = categories.find((cat) => cat.text.toLowerCase().includes(searchLower));
      return match ? this.normalizeUrl(match.href) : null;
    } finally {
      await page.close();
    }
  }

  /**
 * Парсинг всех страниц с вакансиями.
 * Итерируем page=1, page=2, … пока не получаем 2 страницы подряд
 * с только дубликатами или не достигаем maxPages.
 */
private async parseAllPages(
  categoryUrl: string,
  maxPages: number,
  delay: number,
): Promise<Vacancy[]> {
  const allVacancies: Vacancy[] = [];
  const seenIds = new Set<string>(); // Отслеживаем уникальные ID
  let duplicatePagesCount = 0; // Счётчик страниц с только дубликатами

  for (let currentPage = 1; currentPage <= maxPages; currentPage++) {
    log(`📄 Парсинг страницы ${currentPage}/${maxPages}...`);

    const pageUrl = this.buildPageUrl(categoryUrl, currentPage);
    log(`   URL: ${pageUrl}`);

    try {
      const rawVacancies = await this.parseVacanciesFromPage(pageUrl);

      // Фильтруем только новые вакансии (не дубликаты)
      const newVacancies: Vacancy[] = [];

      for (const vacancy of rawVacancies) {
        if (!seenIds.has(vacancy.id)) {
          seenIds.add(vacancy.id);
          newVacancies.push(vacancy);
        } else {
          // Это дубликат
        }
      }

      const duplicatesOnPage = rawVacancies.length - newVacancies.length;

      // Анализируем результат
      if (newVacancies.length === 0) {
        // Страница содержит ТОЛЬКО дубликаты
        duplicatePagesCount++;
        log(`   ⚠️  Страница ${currentPage} содержит только дубликаты (${duplicatesOnPage} дубликатов, 0 новых)`);
        log(`   📊 Страниц с дубликатами подряд: ${duplicatePagesCount}/2`);

        if (duplicatePagesCount >= 2) {
          log(`   ⛔ Две страницы подряд с только дубликатами — завершаем парсинг`);
          break;
        }
      } else {
        // Нашли новые вакансии
        duplicatePagesCount = 0; // Сбрасываем счётчик
        allVacancies.push(...newVacancies);
        log(`   ✅ Найдено: ${rawVacancies.length} вакансий (${newVacancies.length} новых, ${duplicatesOnPage} дубликатов)`);
        log(`   📊 Всего уникальных: ${allVacancies.length}`);
      }

      if (currentPage < maxPages) {
        await pause(delay);
      }
    } catch (error) {
      log(`   ❌ Ошибка страницы ${currentPage}:`, error instanceof Error ? error.message : String(error));

      // При таймауте — одна повторная попытка с увеличенной задержкой
      if (error instanceof Error && error.name === 'TimeoutError') {
        log(`   ⏳ Повторная попытка после увеличенной задержки...`);
        await pause(delay * 2);

        try {
          const rawVacancies = await this.parseVacanciesFromPage(pageUrl);
          
          const newVacancies: Vacancy[] = [];
          for (const vacancy of rawVacancies) {
            if (!seenIds.has(vacancy.id)) {
              seenIds.add(vacancy.id);
              newVacancies.push(vacancy);
            }
          }

          if (newVacancies.length > 0) {
            duplicatePagesCount = 0;
            allVacancies.push(...newVacancies);
            log(`   ✅ Повтор успешен: ${newVacancies.length} новых вакансий`);
          } else {
            duplicatePagesCount++;
            log(`   ⚠️  Повтор вернул только дубликаты`);
          }
        } catch (retryError) {
          log(`   ❌ Повтор не удался:`, retryError instanceof Error ? retryError.message : String(retryError));
        }
      }
    }
  }
  log(`\n📊 Итого обработано: ${allVacancies.length} уникальных вакансий`);
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
      await pause(1000);

      return await page.$$eval('article.AdVacancies_wrapper__oZp_b', (cards) =>
        cards
          .map((card) => {
            const titleLink = card.querySelector('h5.AdVacancies_title__link__V9IOY a');
            const title = titleLink?.textContent?.trim() || '';
            const href = titleLink?.getAttribute('href') || '';

            if (!title || !href) return null;

            const features = card.querySelectorAll('.AdVacancies_features__item__IBTIr');
            const idMatch = href.match(/\/(\d+)/);

            return {
              id: idMatch ? idMatch[1] : href,
              title,
              url: href.startsWith('http') ? href : `https://999.md${href}`,
              schedule: features[0]?.textContent?.trim(),
              experience: features[1]?.textContent?.trim(),
              education: features[2]?.textContent?.trim(),
              source: '999.md',
            };
          })
          .filter((v): v is NonNullable<typeof v> => v !== null) as Vacancy[],
      );
    } finally {
      await page.close();
    }
  }

  // ---------------------------------------------------------------------------
  // URL helpers
  // ---------------------------------------------------------------------------

  private buildSearchUrl(): string {
    return `${this.baseUrl}/ru/category/work`;
  }

  /**
   * Построение URL для страницы с пагинацией
   */
  private buildPageUrl(categoryUrl: string, page: number): string {
    const url = new URL(categoryUrl, this.baseUrl);
    if (page === 1) return url.toString();

    // page должен идти первым параметром — иначе 999.md игнорирует пагинацию
    const existingParams = Array.from(url.searchParams.entries());
    url.search = '';
    url.searchParams.set('page', page.toString());
    for (const [key, value] of existingParams) {
      url.searchParams.set(key, value);
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

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private removeDuplicates(vacancies: Vacancy[]): Vacancy[] {
    const seen = new Set<string>();
    return vacancies.filter((v) => {
      if (seen.has(v.id)) return false;
      seen.add(v.id);
      return true;
    });
  }

  private async setupPage(page: Page): Promise<void> {
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    );
  }
}
