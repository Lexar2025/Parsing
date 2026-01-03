/**
 * Парсер для сайта makler.md (Transnistria)
 * Puppeteer + Stealth для обхода Cloudflare защиты
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Browser, Page } from 'puppeteer';
import * as fs from 'fs/promises';
import * as path from 'path';
import crypto from 'crypto';
import pLimit from 'p-limit';
import { Parser, ParserConfig, ParseResult, Vacancy } from '../types/vacancy.js';
import { log, pause } from '../utils/helpers.js';

// Используем Stealth plugin для обхода Cloudflare
puppeteer.use(StealthPlugin());

type ParserOptions = {
  headless?: boolean;
  concurrency?: number;
  cacheEnabled?: boolean;
  cacheDir?: string;
  cacheTTLSeconds?: number;
  parseDetails?: boolean;
};

/**
 * Словарь профессий с их ID для фильтров
 * field_446[] - основные категории профессий
 */
export const MAKLER_PROFESSIONS: Record<string, number> = {
  'Логистика': 0,
  'Другая деятельность': 2862,
  'Руководитель': 2863,
  'Кассиры': 2864,
  'Работа для студентов': 2865,
  'Медицинские услуги': 2866,
  'Образование': 2867,
  'Работа в IT': 2868,
  'Программисты': 2869,
  'Backend': 2870,
  'Frontend': 2871,
  'Системные администраторы': 2872,
  'Руководители проектов': 2873,
  'Техподдержка': 2874,
  'SEO': 2875,
  'Рабочие специальности': 2876,
  'Строительство': 2877,
  'Грузчики': 2878,
  'Сварщики': 2879,
  'Автослесарь': 2880,
  'Плотник': 2881,
  'Сантехник': 2882,
  'Строитель': 2883,
  'Штукатур': 2884,
  'Электрик': 2885,
  'Столяры': 2886,
  'Сварщики (Еще одна категория)': 2887,
  'Монтажники': 2888,
  'Гигиенист': 2889,
  'Сиделка-уход за больными': 2890,
  'Ветеринар': 2891,
  'Медицинская сестра': 2892,
  'Фармацевт': 2893,
  'Массажист': 2894,
  'Стоматолог': 2895,
  'Медбрат': 2896,
  'Госслужба': 2897,
  'ISA': 2898,
  'Сантехник/электрик': 2899,
  'Маляры': 2900,
  'Доставщики': 2901,
  'Таксисты': 2902,
  'Охрана': 2903,
  'Охранники': 2904,
  'Фриланс': 2905,
  'Рекламная графика': 2906,
  'UX/UI': 2907,
  'Графический дизайн': 2908,
  'SMM': 2909,
  'Контент': 2910,
  'Копирайтинг': 2911,
  'Экономисты': 2912,
  'Бухгалтерия': 2913,
  'Маркетологи': 2914,
  'HR': 2915,
  'Менеджеры по продажам': 2916,
  'Менеджеры по закупкам': 2917,
  'Операторы call-центра': 2918,
  'Продавцы': 2919,
  'Кладовщики': 2920,
  'Повар': 2921,
  'Официанты': 2922,
  'Администраторы залов': 2923,
  'Бариста': 2924,
  'Бармены': 2925,
  'Курьеры': 2926,
  'Торговые представители': 2927,
  'Иностранные языки': 2928,
  'Юристы': 2929,
  'Журналисты': 2930,
  'Фотографы': 2931,
};

export class MaklerMdParser implements Parser {
  private browser: Browser | null = null;
  private readonly baseUrl = 'https://makler.md';
  private options: Required<ParserOptions>;

  constructor(opts?: ParserOptions) {
    this.options = {
      headless: opts?.headless ?? true,
      concurrency: opts?.concurrency ?? 3,
      cacheEnabled: opts?.cacheEnabled ?? true,
      cacheDir: opts?.cacheDir ?? path.resolve(process.cwd(), 'cache', 'makler-md'),
      cacheTTLSeconds: opts?.cacheTTLSeconds ?? 60 * 60 * 24,
      parseDetails: opts?.parseDetails ?? true,
    };
  }

  async parse(config: ParserConfig): Promise<ParseResult> {
    try {
      log(`Начинаю поиск профессии: ${config.searchQuery || 'все'}\n`);

      // Запускаем браузер
      await this.launchBrowser();

      const allVacancies = await this.parseAllPages(
        config.searchQuery || '',
        config.maxPages || 10,
        config.delay || 2000,
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

      // Закрываем браузер
      await this.closeBrowser();

      return {
        vacancies: finalVacancies,
        totalFound: finalVacancies.length,
        page: 1,
        hasNextPage: false,
      };
    } catch (error) {
      log('❌ Ошибка при парсинге:', error);
      await this.closeBrowser();
      throw error;
    }
  }

  /**
   * Запуск браузера с настройками для обхода детекции
   */
  private async launchBrowser(): Promise<void> {
    if (this.browser) return;

    log('🚀 Запуск браузера...');
    this.browser = await puppeteer.launch({
      headless: this.options.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
      ],
    });
    log('✅ Браузер запущен');
  }

  /**
   * Закрытие браузера
   */
  private async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      log('🔒 Браузер закрыт');
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
   * Парсинг всех страниц с вакансиями
   */
  private async parseAllPages(
    profession: string,
    maxPages: number,
    delay: number,
  ): Promise<Vacancy[]> {
    const allVacancies: Vacancy[] = [];
    const seenIds = new Set<string>();
    let currentPage = 0;
    let emptyPagesCount = 0;

    log(`📊 Начинаю парсинг страниц (макс: ${maxPages})\n`);

    while (currentPage < maxPages && emptyPagesCount < 2) {
      log(`📄 Парсинг страницы ${currentPage + 1}/${maxPages}...`);

      const pageUrl = this.buildPageUrl(profession, currentPage);
      log(`   URL: ${pageUrl}`);

      try {
        const vacancies = await this.parseVacanciesFromPage(pageUrl);

        if (vacancies.length === 0) {
          log(`   ⚠️  Страница ${currentPage + 1} пуста`);
          emptyPagesCount++;

          if (emptyPagesCount >= 2) {
            log(`   ⛔ Две пустые страницы подряд - завершаем парсинг`);
            break;
          }
        } else {
          emptyPagesCount = 0;

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

          log(
            `   ✅ Найдено: ${vacancies.length} (новых: ${newVacanciesCount}, дубликатов: ${duplicatesCount})`,
          );
          log(`   📊 Всего уникальных: ${allVacancies.length}`);
        }

        if (currentPage < maxPages - 1) {
          const randomDelay = delay + Math.random() * 1000;
          log(`   ⏳ Пауза ${Math.round(randomDelay)}мс перед следующей страницей...`);
          await pause(randomDelay);
        }

        currentPage++;
      } catch (error) {
        log(`   ❌ Ошибка при парсинге страницы ${currentPage + 1}:`, error);
        currentPage++;
      }
    }

    return allVacancies;
  }

  /**
   * Построение URL для страницы с фильтрами
   * Используем list=false как в рабочем примере
   */
  private buildPageUrl(profession: string, page: number): string {
    let url = `${this.baseUrl}/transnistria/job/job-offers?list`;

    // Добавляем фильтр профессии если указана
    if (profession) {
      const professionId = this.findProfessionId(profession);
      if (professionId !== null) {
        url += `&field_446[]=${professionId}`;
      }
    }

    // Добавляем list=false (из рабочего примера)
    url += '&list=false';

    // Добавляем номер страницы
    if (page > 0) {
      url += `&page=${page}`;
    }

    return url;
  }

  /**
   * Поиск ID профессии по названию
   */
  private findProfessionId(profession: string): number | null {
    const professionLower = profession.toLowerCase().trim();

    for (const [key, value] of Object.entries(MAKLER_PROFESSIONS)) {
      if (key.toLowerCase() === professionLower) {
        return value;
      }
    }

    // Пробуем частичное совпадение
    for (const [key, value] of Object.entries(MAKLER_PROFESSIONS)) {
      if (key.toLowerCase().includes(professionLower) || professionLower.includes(key.toLowerCase())) {
        log(`   ℹ️  Найдено совпадение: "${profession}" -> "${key}"`);
        return value;
      }
    }

    log(`   ⚠️  Профессия "${profession}" не найдена в словаре, парсим все вакансии`);
    return null;
  }

  /**
   * Парсинг вакансий со страницы с имитацией человеческой активности
   */
  private async parseVacanciesFromPage(url: string): Promise<Vacancy[]> {
    if (!this.browser) {
      throw new Error('Браузер не запущен');
    }

    const page = await this.browser.newPage();

    try {
      // Устанавливаем viewport
      await page.setViewport({ width: 1920, height: 1080 });

      // Переход на страницу
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 60000,
      });

      // ВАЖНО: Имитируем человеческую активность для обхода Cloudflare
      // Проверяем, загрузились ли вакансии
      let articlesCount = await page.$$eval('article', (articles) => articles.length);

      if (articlesCount === 0) {
        log(`   ⚠️  Вакансии не видны, имитируем активность...`);

        // Двигаем мышкой в случайные точки
        await page.mouse.move(100, 100);
        await pause(200);
        await page.mouse.move(500, 300);
        await pause(200);

        // Делаем клик в безопасное место (в body)
        await page.mouse.click(400, 400);
        
        // Ждем пока Cloudflare нас "пропустит"
        await pause(5000);

        // Проверяем еще раз
        articlesCount = await page.$$eval('article', (articles) => articles.length);
        
        if (articlesCount === 0) {
          log(`   ⚠️  Вакансии все еще не видны после активности`);
        } else {
          log(`   ✅ После активности найдено ${articlesCount} вакансий`);
        }
      }

      // Парсим вакансии
      const vacancies = await page.$$eval('article', (articles) => {
        return articles.map((article) => {
          try {
            // Время публикации
            const timeElement = article.querySelector('.ls-detail_time');
            const timeText = timeElement?.textContent?.trim();

            // Заголовок и ссылка
            const titleLink = article.querySelector('.ls-detail_antTitle a.ls-detail_anUrl');
            const title = titleLink?.textContent?.trim() || '';
            const url = titleLink?.getAttribute('href') || '';

            if (!title || !url) {
              return null;
            }

            // Описание
            const descElement = article.querySelector('.subfir');
            const description = descElement?.textContent?.trim() || undefined;

            // Локация и телефон
            const infoBlock = article.querySelector('.ls-detail_anData');
            const location = infoBlock?.querySelector('#pointer_icon')?.textContent?.trim() || undefined;
            const phone = infoBlock?.querySelector('.phone_icon')?.textContent?.trim() || undefined;

            // Извлекаем ID из URL
            const idMatch = url.match(/\/an\/(\d+)/);
            const id = idMatch ? idMatch[1] : url;

            return {
              id,
              title,
              description,
              location,
              url: url.startsWith('http') ? url : `https://makler.md${url}`,
              publishedAt: timeText,
              contactPerson: phone,
              source: 'makler.md',
            };
          } catch {
            return null;
          }
        }).filter(Boolean);
      });

      await page.close();

      // Обрабатываем даты
      return vacancies.map((v: any) => ({
        ...v,
        publishedAt: this.parseDate(v.publishedAt),
      })) as Vacancy[];

    } catch (error) {
      await page.close();
      throw error;
    }
  }

  /**
   * Парсинг даты из формата "03 Января 05:58"
   */
  private parseDate(dateStr: string | undefined): Date | undefined {
    if (!dateStr) return undefined;

    try {
      const months: Record<string, number> = {
        'января': 0, 'февраля': 1, 'марта': 2, 'апреля': 3,
        'мая': 4, 'июня': 5, 'июля': 6, 'августа': 7,
        'сентября': 8, 'октября': 9, 'ноября': 10, 'декабря': 11,
      };

      const match = dateStr.match(/(\d+)\s+(\w+)\s+(\d+):(\d+)/i);
      if (match) {
        const day = parseInt(match[1]);
        const month = months[match[2].toLowerCase()];
        const hour = parseInt(match[3]);
        const minute = parseInt(match[4]);

        const now = new Date();
        const date = new Date(now.getFullYear(), month, day, hour, minute);

        if (date > now) {
          date.setFullYear(now.getFullYear() - 1);
        }

        return date;
      }
    } catch {
      // Игнорируем ошибки парсинга
    }

    return undefined;
  }

  /**
   * Парсинг деталей для массива вакансий
   */
  private async parseVacanciesDetails(vacancies: Vacancy[]): Promise<Vacancy[]> {
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

            if (processed % 10 === 0 || processed === vacancies.length) {
              log(`   Обработано: ${processed}/${vacancies.length}`);
            }

            return { ...v, ...extra };
          } catch (err) {
            log(`⚠️ Ошибка деталей для ${v.url}:`, err);
            return v;
          }
        }),
      ),
    );

    return detailed;
  }

  /**
   * Парсинг деталей вакансии
   */
  async parseVacancyDetails(url: string): Promise<Partial<Vacancy>> {
    if (!this.browser) {
      await this.launchBrowser();
    }

    const page = await this.browser!.newPage();
    const details: Partial<Vacancy> = {};

    try {
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      // Можно добавить парсинг дополнительных полей с детальной страницы
      // Пока оставляем пустым, так как основные данные уже есть

      await page.close();
    } catch (error) {
      await page.close();
      throw error;
    }

    return details;
  }

  /**
   * Парсинг деталей с кэшированием
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
          const raw = await fs.readFile(filePath, 'utf-8');
          const parsed = JSON.parse(raw) as Partial<Vacancy>;
          return parsed;
        }
      }
    } catch {
      // Игнорируем
    }

    const details = await this.parseVacancyDetails(url);

    try {
      await fs.writeFile(filePath, JSON.stringify(details, null, 2), 'utf-8');
    } catch {
      log('⚠️ Не удалось записать кэш:', filePath);
    }

    return details;
  }

  /**
   * Хэш строки для кэша
   */
  private hash(input: string): string {
    return crypto.createHash('md5').update(input).digest('hex');
  }
}
