/**
 * Парсер для сайта makler.md (Transnistria)
 * Puppeteer с настройками для обхода Cloudflare защиты
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import pLimit from 'p-limit';
import { Parser, ParserConfig, ParseResult, Vacancy } from '../types/vacancy.js';
import { log, pause } from '../utils/helpers.js';

type ParserOptions = {
  headless?: boolean;
  concurrency?: number;
  parseDetails?: boolean;
};

/**
 * Словарь профессий с их ID для фильтров
 * field_446[] - основные категории профессий
 */
export const MAKLER_PROFESSIONS: Record<string, number> = {
  // Транспорт, логистика, складское хозяйство
  'Менеджеры перевозок': 2892,
  'Водители': 2893,
  'Грузчики': 2894,
  'Экспедиторы': 2895,
  'Кладовщики': 2896,
  'Механики, автослесари': 2897,
  'Мойщики авто': 2898,
  'Работники заправочной станции': 2899,

  // Строительство и ремонт
  'Инженеры (Строительство)': 2951,
  'Прорабы': 2952,
  'Строитель': 2953,
  'Сантехники': 2954,
  'Электромонтажники': 2955,
  'Монтажники вентиляционных систем': 2956,
  'Монтажники газового оборудования': 2957,
  'Разнорабочие': 2958,

  // Производство, промышленность
  'Инженеры-технологи': 2881,
  'Рабочие': 2882,

  // Торговля и продажи
  'Менеджеры по работе с клиентами': 2888,
  'Продавцы, кассиры': 2889,
  'Продажи по телефону': 2890,

  // Охрана и безопасность
  'Охранники': 2919,
  'Оперативники': 2920,
  'Вахтёры': 2921,

  // Дизайн, культура, искусство
  'Дизайнеры, художники': 2905,
  'Ведущие, актеры': 2907,
  'Фотографы, операторы': 2906,
  'Музыканты, певцы': 2908,

  // Информационные технологии
  'Программисты': 2869,
  'Тестировщики, QA': 2870,
  'Дизайнеры (UX, web)': 2871,
  'Системные администраторы': 2872,
  'Руководители проектов': 2873,
  'Техподдержка': 2874,
  'SEO': 2875,

  // Маркетинг, реклама, PR
  'Маркетологи': 2910,
  'SMM': 2911,
  'Копирайтеры, рерайтеры': 2912,
  'Промоутеры': 2913,

  // Медицина, фармацевтика
  'Врачи': 2942,
  'Фармацевты': 2943,
  'Медицинский персонал': 2944,
  'Психологи': 2945,

  // Образование, воспитание
  'Преподаватели, педагоги': 2924,
  'Воспитатели': 2923,
  'Помощники воспитателей': 3121,

  // Офисный персонал
  'Офис-менеджеры, секретари': 2902,

  // Персонал для дома
  'Няни, гувернантки': 2926,
  'Сиделки': 2927,
  'Домработницы': 2928,

  // Рестораны, общественное питание
  'Администраторы (Рестораны)': 2930,
  'Повара, работники кухни': 2931,
  'Кондитеры': 2932,
  'Бармены, официанты': 2933,

  // Салоны красоты, фитнес
  'Администраторы (Салоны)': 2935,
  'Визажисты, косметологи': 2936,
  'Стилисты, парикмахеры': 2937,
  'Тренера, инструкторы': 2938,
  'Массажисты': 2939,
  'Маникюр, педикюр': 2940,

  // Сельское хозяйство
  'Сельхоз работники': 2947,
  'Агрономы': 2948,
  'Ветеринары': 2949,

  // СМИ, переводы
  'Журналисты': 2915,
  'Теле- и радиоведущие': 2916,
  'Переводчики': 2917,
  'Редактор, корректор': 4812,

  // Телекоммуникации и связь
  'Инженеры (Связь)': 2877,
  'Монтажники, техники': 2878,
  'Операторы': 2879,

  // Топ-менеджмент
  'Директора': 2884,
  'Руководители подразделений': 2885,
  'Кадры, HR': 2886,

  // Туризм, гостиничное дело
  'Администраторы (Туризм)': 2960,
  'Менеджеры по туризму': 2961,
  'Гиды/экскурсоводы': 2962,

  // Юриспруденция и бухучёт
  'Бухгалтеры': 2964,
  'Юристы': 2965,
  'Помощники нотариуса': 2966,
  'Страховые агенты': 2967,

  // Прочее
  'Уборщицы': 2903,
  'Персонал без специальной подготовки': 2969,
  'Прочее': 2972,
};

export class MaklerMdParser implements Parser {
  private browser: Browser | null = null;
  private readonly baseUrl = 'https://makler.md';
  private options: Required<ParserOptions>;

  constructor(opts?: ParserOptions) {
    this.options = {
      headless: opts?.headless ?? true,
      concurrency: opts?.concurrency ?? 3,
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
    } catch (error: unknown) {
      log('❌ Ошибка при парсинге:', error instanceof Error ? error.message : String(error));
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
        '--window-size=1920,1080',
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
   * Настройка страницы для обхода детекции
   */
  private async setupPage(page: Page): Promise<void> {
    // Скрываем webdriver и добавляем свойства для обхода детекции
    await page.evaluateOnNewDocument(() => {
      // Скрываем webdriver
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });

      // Типизированный Chrome объект
      interface Chrome {
        runtime: Record<string, unknown>;
        app: Record<string, unknown>;
      }

      // Безопасное приведение window для доступа к chrome
      const windowAny = window as unknown as { chrome?: Chrome };
      if (!windowAny.chrome) {
        windowAny.chrome = {
          runtime: {},
          app: {}
        };
      }

      // Переопределяем permissions
      const originalPermissions = Object.getOwnPropertyDescriptor(navigator, 'permissions');
      if (originalPermissions) {
        Object.defineProperty(navigator, 'permissions', {
          ...originalPermissions,
          value: {
            ...originalPermissions.value,
            query: (parameters: { name: string }) => {
              if (parameters.name === 'notifications') {
                return Promise.resolve({
                  state: Notification.permission
                } as PermissionStatus);
              }
              return originalPermissions.value!.query(parameters);
            }
          }
        });
      }

      // Добавляем плагины с правильной типизацией
      interface Plugin {
        name: string;
        filename: string;
        description: string;
      }

      Object.defineProperty(navigator, 'plugins', {
        get: () => {
          return [
            { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
            { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: 'Portable Document Format' },
            { name: 'Native Client', filename: 'internal-nacl-plugin', description: '' }
          ] as Plugin[];
        }
      });

      // Добавляем языки
      Object.defineProperty(navigator, 'languages', {
        get: () => {
          return ['ru-RU', 'ru', 'en-US', 'en'] as const;
        }
      });

      // Добавляем deviceMemory
      Object.defineProperty(navigator, 'deviceMemory', {
        get: () => 8,
      });

      // Добавляем hardwareConcurrency
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        get: () => 4,
      });
    });

    // Устанавливаем viewport
    await page.setViewport({ width: 1920, height: 1080 });

    // Устанавливаем user agent
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Устанавливаем дополнительные заголовки
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    });
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

        if (newVacanciesCount === 0) {
          log(`   ⚠️  Нет новых вакансий на странице (все дубли)`);
          emptyPagesCount++;
          if (emptyPagesCount >= 2) {
            log(`   ⛔ Две страницы подряд без новых вакансий - завершаем парсинг`);
            break;
          }
        } else {
          emptyPagesCount = 0;
        }

        log(
          `   ✅ Найдено: ${vacancies.length} (новых: ${newVacanciesCount}, дубликатов: ${duplicatesCount})`,
        );
        log(`   📊 Всего уникальных: ${allVacancies.length}`);

        if (currentPage < maxPages - 1) {
          const randomDelay = delay + Math.random() * 1000;
          log(`   ⏳ Пауза ${Math.round(randomDelay)}мс перед следующей страницей...`);
          await pause(randomDelay);
        }

        currentPage++;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log(`   ❌ Ошибка при парсинге страницы ${currentPage + 1}:`, errorMessage);
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

    // Добавляем list=detail (из рабочего примера)
    url += '&list=detail';

    // ВАЖНО: page=2 для второй страницы, page=3 для третьей и т.д.
    if (page > 0) {
      url += `&page=${page + 1}`;
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
      // Настраиваем страницу для обхода детекции
      await this.setupPage(page);

      // Переход на страницу
      log(`   🌐 Загрузка страницы...`);
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 60000,
      });

      // Ждем немного после загрузки
      await pause(2000);

      // Если после перехода url содержит attempt=, делаем повторный переход по исходному url
      let currentUrl = page.url();
      if (/attempt=\d+/.test(currentUrl)) {
        log(`   ⚠️  Обнаружен временный URL (Cloudflare): ${currentUrl}`);
        // Имитация активности
        for (let i = 0; i < 5; i++) {
          const x = Math.floor(Math.random() * 800) + 100;
          const y = Math.floor(Math.random() * 600) + 100;
          await page.mouse.move(x, y, { steps: 10 });
          await pause(300);
        }
        await page.mouse.click(400, 400);
        await pause(1000);
        await page.evaluate(() => { window.scrollBy(0, 300); });
        await pause(1000);
        await page.evaluate(() => { window.scrollBy(0, -300); });
        log(`   🔄 Повторный переход по исходному URL для снятия защиты...`);
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        await pause(3000);
        currentUrl = page.url();
        log(`   ✅ После повторного перехода: ${currentUrl}`);
      }

      // ВАЖНО: Имитируем человеческую активность для обхода Cloudflare
      // Проверяем, загрузились ли вакансии
      let articlesCount = await page.$$eval('article', (articles) => articles.length);

      if (articlesCount === 0) {
        log(`   ⚠️  Вакансии не видны, имитируем активность...`);

        // Двигаем мышкой в случайные точки (как человек)
        for (let i = 0; i < 5; i++) {
          const x = Math.floor(Math.random() * 800) + 100;
          const y = Math.floor(Math.random() * 600) + 100;
          await page.mouse.move(x, y, { steps: 10 });
          await pause(300);
        }

        // Делаем клик в безопасное место
        try {
          await page.mouse.click(400, 400);
        } catch {
          // Игнорируем ошибки клика
        }
        await pause(1000);

        // Скроллим страницу (как человек)
        await page.evaluate(() => {
          window.scrollBy({ top: 300, behavior: 'smooth' });
        });
        await pause(1000);

        await page.evaluate(() => {
          window.scrollBy({ top: -300, behavior: 'smooth' });
        });
        
        // Ждем пока Cloudflare нас "пропустит"
        log(`   ⏳ Ждем загрузки (Cloudflare проверка)...`);
        await pause(5000);

        // Проверяем еще раз
        articlesCount = await page.$$eval('article', (articles) => articles.length);

        if (articlesCount === 0) {
          log(`   ⚠️  Вакансии все еще не видны после активности`);
        }
      } else {
        log(`   ✅ Найдено ${articlesCount} вакансий`);
      }

      // Парсим вакансии
      const vacancies = await page.$$eval('article', (articles) => {
          return articles.map((article) => {
        try {
        // Время публикации
        const timeElement = article.querySelector('.ls-detail_time');
        const timeText = timeElement?.textContent?.trim() || undefined;

        // Заголовок и ссылка
        const titleLink = article.querySelector('.ls-detail_antTitle a.ls-detail_anUrl');
        const title = titleLink?.textContent?.trim() || '';
        const href = titleLink?.getAttribute('href') || '';

        if (!title || !href) {
        return null;
        }

        // Описание
        const descriptionBlock = document.querySelector('.subfir');
        const description = descriptionBlock?.textContent?.trim() || undefined;

        // Локация и телефон
        const infoBlock = article.querySelector('.ls-detail_anData');
        const locationElement = infoBlock?.querySelector('#pointer_icon');
        const location = locationElement?.textContent?.trim() || undefined;
        
        const phoneElement = infoBlock?.querySelector('.phone_icon');
        const phone = phoneElement?.textContent?.trim() || undefined;

        // Извлекаем ID из URL
        const idMatch = href.match(/\/an\/(\d+)/);
        const id = idMatch ? idMatch[1] : href;

        const url = href.startsWith('http') ? href : `https://makler.md${href}`;

        return {
        id,
        title,
        description,
        location,
        url,
        publishedAt: timeText,
        contactPerson: phone,
        source: 'makler.md',
        };
        } catch (error) {
        console.error('Ошибка при парсинге карточки вакансии:', error);
        return null;
        }
        }).filter((v): v is NonNullable<typeof v> => v !== null);
        });

      await page.close();

      // Обрабатываем даты
      return vacancies.map((v): Vacancy => ({
        ...v,
        publishedAt: this.parseDate(v.publishedAt),
        source: 'makler.md',
      }));

    } catch (error) {
    await page.close();
    const errorMessage = error instanceof Error ? error.message : String(error);
      log(`⚠️ Ошибка при парсинге страницы вакансий ${url}:`, errorMessage);
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
        const monthName = match[2].toLowerCase();
        const month = months[monthName];
        const hour = parseInt(match[3]);
        const minute = parseInt(match[4]);

        if (isNaN(day) || isNaN(hour) || isNaN(minute) || month === undefined) {
          return undefined;
        }

        const now = new Date();
        const date = new Date(now.getFullYear(), month, day, hour, minute);

        // Проверяем корректность даты
        if (isNaN(date.getTime())) {
          return undefined;
        }

        // Если дата в будущем, считаем, что она из прошлого года
        if (date > now) {
          date.setFullYear(now.getFullYear() - 1);
        }

        return date;
      }
      return undefined;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log(`⚠️ Ошибка при парсинге даты "${dateStr}":`, errorMessage);
      return undefined;
    }
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
          } catch (err) {
            log(`⚠️ Ошибка деталей для ${v.url}:`, err instanceof Error ? err.message : String(err));
            return v;
          }
        }),
      ),
    );
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
      await this.setupPage(page);
      
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      // Парсим дополнительные поля с детальной страницы
      const detailsData = await page.evaluate((): Partial<Vacancy> => {
        const result: Partial<Vacancy> = {};
        
        // Парсим таблицу с деталями
        const itemTable = document.querySelector('ul.itemtable.box-columns');
        if (itemTable) {
          const items = itemTable.querySelectorAll('li');
          
          items.forEach(item => {
            const fieldDiv = item.querySelector('.fields');
            const valueDiv = item.querySelector('.values');
            
            if (fieldDiv && valueDiv) {
              const field = fieldDiv.textContent?.trim();
              const value = valueDiv.textContent?.trim();
              
              if (field && value) {
                switch (field) {
                  case 'Форма занятости':
                    result.employmentType = value;
                    break;
                  case 'График работы':
                    result.schedule = value;
                    break;
                  case 'Образование':
                    result.education = value;
                    break;
                  case 'Тип вакансии':
                    result.vacancyType = value;
                    break;
                  case 'Сферы деятельности':
                    result.industry = value;
                    break;
                  case 'Специализация':
                    result.specialization = value;
                    break;
                  case 'Расположение вакансии':
                    // Сохраняем тип локации (внутри страны/за границей)
                    result.workLocationType = value;
                    break;
                }
              }
            }
          });
        }

        // Парсим полное описание если есть
        const descriptionBlock = document.querySelector('#anText');
        if (descriptionBlock) {
          result.fullDescription = descriptionBlock.textContent?.trim() || undefined;
        }
        return result;
      });

      // Объединяем с details
      Object.assign(details, detailsData);

      await page.close();
    } catch (error) {
      await page.close();
      const errorMessage = error instanceof Error ? error.message : String(error);
      log(`⚠️ Ошибка при парсинге деталей вакансии ${url}:`, errorMessage);
      throw error;
    }

    return details;
  }

}
