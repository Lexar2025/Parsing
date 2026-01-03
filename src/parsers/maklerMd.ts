/**
 * Парсер для сайта makler.md (Transnistria)
 * HTTP парсинг с поддержкой фильтров по профессиям
 */

import axios, { AxiosInstance } from 'axios';
import { JSDOM } from 'jsdom';
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

/**
 * Дополнительные фильтры
 * field_344[] - тип работы
 */
export const MAKLER_WORK_TYPES: Record<string, number> = {
  'Удалённая работа': 4619,
};

export class MaklerMdParser implements Parser {
  private axiosInstance: AxiosInstance;
  private readonly baseUrl = 'https://makler.md';
  private options: Required<ParserOptions>;

  constructor(opts?: ParserOptions) {
    this.options = {
      concurrency: opts?.concurrency ?? 3,
      cacheEnabled: opts?.cacheEnabled ?? true,
      cacheDir: opts?.cacheDir ?? path.resolve(process.cwd(), 'cache', 'makler-md'),
      cacheTTLSeconds: opts?.cacheTTLSeconds ?? 60 * 60 * 24,
      parseDetails: opts?.parseDetails ?? true,
    };

    this.axiosInstance = axios.create({
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0',
        'DNT': '1',
      },
      timeout: 15000,
      maxRedirects: 5,
      validateStatus: (status) => status < 500,
    });
  }

  async parse(config: ParserConfig): Promise<ParseResult> {
    try {
      log(`Начинаю поиск профессии: ${config.searchQuery || 'все'}\n`);
      
      // Начальная задержка для имитации человека
      await pause(500 + Math.random() * 500);

      const allVacancies = await this.parseAllPages(
        config.searchQuery || '',
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
    } catch (error) {
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
   * Парсинг деталей для массива вакансий с кэшированием
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
   * Парсинг всех страниц с вакансиями
   */
  private async parseAllPages(
    profession: string,
    maxPages: number,
    delay: number,
  ): Promise<Vacancy[]> {
    const allVacancies: Vacancy[] = [];
    const seenIds = new Set<string>();
    let currentPage = 0; // makler.md использует 0-based индексацию
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
          emptyPagesCount = 0; // Сбрасываем счетчик

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

          log(
            `   ✅ Найдено: ${vacancies.length} (новых: ${newVacanciesCount}, дубликатов: ${duplicatesCount})`,
          );
          log(`   📊 Всего уникальных: ${allVacancies.length}`);
        }

        // Всегда делаем паузу между страницами для избежания блокировки
        if (currentPage < maxPages - 1) {
          const randomDelay = delay + Math.random() * 1000; // Добавляем случайность
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
   */
  private buildPageUrl(profession: string, page: number): string {
    let url = `${this.baseUrl}/transnistria/job/job-offers?list&list=detail`;

    // Добавляем фильтр профессии если указана
    if (profession) {
      const professionId = this.findProfessionId(profession);
      if (professionId !== null) {
        url += `&field_446[]=${professionId}`;
      }
    }

    // Добавляем номер страницы
    if (page > 0) {
      url += `&page=${page}`;
    }

    return url;
  }

  /**
   * Поиск ID профессии по названию (нечувствительно к регистру)
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
   * Парсинг вакансий со страницы
   */
  private async parseVacanciesFromPage(url: string): Promise<Vacancy[]> {
    const html = await this.fetchPage(url);
    const dom = new JSDOM(html);
    const document = dom.window.document;

    // Ищем все article элементы с вакансиями
    const articles = document.querySelectorAll('article');
    const vacancies: Vacancy[] = [];

    articles.forEach((article) => {
      try {
        const vacancy = this.extractVacancyFromArticle(article);
        if (vacancy) {
          vacancies.push(vacancy);
        }
      } catch {
        // Тихо пропускаем ошибки
      }
    });

    return vacancies;
  }

  /**
   * Извлечение данных вакансии из article элемента
   */
  private extractVacancyFromArticle(article: Element): Vacancy | null {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

    return {
      id: this.extractIdFromUrl(url),
      title,
      description,
      location,
      url: this.normalizeUrl(url),
      publishedAt: this.parseDate(timeText),
      contactPerson: phone, // Используем поле contactPerson для телефона
      source: 'makler.md',
    };
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

      // Формат: "03 Января 05:58"
      const match = dateStr.match(/(\d+)\s+(\w+)\s+(\d+):(\d+)/i);
      if (match) {
        const day = parseInt(match[1]);
        const month = months[match[2].toLowerCase()];
        const hour = parseInt(match[3]);
        const minute = parseInt(match[4]);

        const now = new Date();
        const date = new Date(now.getFullYear(), month, day, hour, minute);

        // Если дата в будущем, значит это прошлый год
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
   * Парсинг деталей вакансии со страницы
   */
  async parseVacancyDetails(url: string): Promise<Partial<Vacancy>> {
    const html = await this.fetchPage(url);
    const dom = new JSDOM(html);
    const document = dom.window.document;

    const details: Partial<Vacancy> = {};

    // Можно добавить дополнительные поля с детальной страницы
    // Пока возвращаем пустой объект, так как основные данные уже есть
    
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
   * Получение HTML страницы с retry логикой
   */
  private async fetchPage(url: string, retries = 3): Promise<string> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        // Добавляем случайную задержку перед запросом
        if (attempt > 1) {
          const delay = Math.random() * 2000 + 1000; // 1-3 сек
          await pause(delay);
        }

        const response = await this.axiosInstance.get(url, {
          headers: {
            'Referer': this.baseUrl,
            'Origin': this.baseUrl,
          },
        });

        // Проверяем статус код
        if (response.status === 418) {
          log(`   ⚠️  Получен статус 418 (попытка ${attempt}/${retries})`);
          if (attempt === retries) {
            throw new Error('Сайт заблокировал запросы (HTTP 418)');
          }
          continue;
        }

        return response.data;
      } catch (error) {
        if (axios.isAxiosError(error)) {
          const status = error.response?.status;
          
          if (status === 418 && attempt < retries) {
            log(`   ⚠️  HTTP 418 - попытка ${attempt}/${retries}`);
            continue;
          }
          
          log(`❌ Ошибка HTTP: ${error.message}`);
        }
        
        if (attempt === retries) {
          throw error;
        }
      }
    }
    
    throw new Error('Не удалось загрузить страницу после всех попыток');
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
    const match = url.match(/\/an\/(\d+)/);
    return match ? match[1] : url;
  }

  /**
   * Хэш строки для кэша
   */
  private hash(input: string): string {
    return crypto.createHash('md5').update(input).digest('hex');
  }
}
