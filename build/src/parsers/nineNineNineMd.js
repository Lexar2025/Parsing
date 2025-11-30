/**
 * Парсер для сайта 999.md (раздел работа)
 * Версия с пагинацией + парсинг деталей + p-limit + файловый кэш
 */
import axios from 'axios';
import { JSDOM } from 'jsdom';
import * as fs from 'fs/promises';
import * as path from 'path';
import crypto from 'crypto';
import pLimit from 'p-limit';
import { log, pause } from '../utils/helpers.js';
export class NineNineNineMdParser {
    axiosInstance;
    baseUrl = 'https://999.md';
    options;
    constructor(opts) {
        this.options = {
            concurrency: opts?.concurrency ?? 3,
            cacheEnabled: opts?.cacheEnabled ?? true,
            cacheDir: opts?.cacheDir ?? path.resolve(process.cwd(), 'cache', '999-md'),
            cacheTTLSeconds: opts?.cacheTTLSeconds ?? 60 * 60 * 24, // 24 часа
        };
        this.axiosInstance = axios.create({
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
            },
            timeout: 10000,
        });
    }
    /**
     * Основной метод парсинга с поддержкой пагинации
     */
    async parse(config) {
        try {
            log(`Начинаю поиск вакансий на 999.md: ${config.searchQuery || 'все категории'}\n`);
            // Шаг 1: Получаем главную страницу раздела работа
            const searchUrl = this.buildSearchUrl();
            const searchHtml = await this.fetchPage(searchUrl);
            // Шаг 2: Ищем ссылку на нужную категорию
            const categoryLink = this.findCategoryLink(searchHtml, config.searchQuery || '');
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
            // Шаг 3: Добавляем фильтр "Предлагая работу"
            const categoryWithFilter = this.addJobOfferFilter(categoryLink);
            log(`URL с фильтром: ${categoryWithFilter}\n`);
            // Шаг 4: Парсим все страницы с вакансиями
            const allVacancies = await this.parseAllPages(categoryWithFilter, config.maxPages || 10, config.delay || 1000);
            log(`\n${'='.repeat(60)}`);
            log(`📊 ИТОГО: Найдено ${allVacancies.length} вакансий`);
            log('='.repeat(60));
            return {
                vacancies: allVacancies,
                totalFound: allVacancies.length,
                page: 1,
                hasNextPage: false,
            };
        }
        catch (error) {
            log('❌ Ошибка при парсинге:', error);
            throw error;
        }
    }
    /**
     * Парсинг всех страниц с вакансиями
     */
    async parseAllPages(categoryUrl, maxPages, delay) {
        const allVacancies = [];
        let currentPage = 1;
        let emptyPagesCount = 0;
        while (currentPage <= maxPages && emptyPagesCount < 2) {
            log(`📄 Парсинг страницы ${currentPage}...`);
            // Формируем URL для текущей страницы
            // На 999.md пагинация работает через параметр ?page=N
            const pageUrl = this.buildPageUrl(categoryUrl, currentPage);
            log(`   URL: ${pageUrl}`);
            try {
                // Парсим вакансии со страницы
                const vacancies = await this.parseVacanciesFromPage(pageUrl);
                if (vacancies.length === 0) {
                    emptyPagesCount++;
                    log(`   ⚠️  Страница ${currentPage} пуста (пустых подряд: ${emptyPagesCount})`);
                    if (emptyPagesCount >= 2) {
                        log(`   ⛔ Две пустые страницы подряд - завершаем парсинг`);
                        break;
                    }
                }
                else {
                    emptyPagesCount = 0;
                    allVacancies.push(...vacancies);
                    log(`   ✅ Найдено ${vacancies.length} вакансий (всего: ${allVacancies.length})`);
                }
                // Задержка между запросами
                if (currentPage < maxPages) {
                    await pause(delay);
                }
                currentPage++;
            }
            catch (error) {
                if (axios.isAxiosError(error) && error.response?.status === 404) {
                    log(`   ⛔ Получен 404 — страница не существует, завершаем парсинг.`);
                    break;
                }
                log(`   ❌ Ошибка при парсинге страницы ${currentPage}:`, error);
                currentPage++;
            }
        }
        // Парсинг деталей вакансий
        if (allVacancies.length === 0) {
            return allVacancies;
        }
        // Убедимся, что папка кэша существует
        if (this.options.cacheEnabled) {
            try {
                await fs.mkdir(this.options.cacheDir, { recursive: true });
            }
            catch {
                log('⚠️ Не смог создать директорию кэша:', this.options.cacheDir);
            }
        }
        const limit = pLimit(this.options.concurrency);
        log('\n🔍 Начинаю загрузку детальной информации по вакансиям...\n');
        const detailed = await Promise.all(allVacancies.map((v) => limit(async () => {
            try {
                const extra = await this.parseVacancyDetailsWithCache(v.url);
                return { ...v, ...extra };
            }
            catch (err) {
                log(`⚠️ Ошибка деталей для ${v.url}`, err);
                return v;
            }
        })));
        log(`\n✅ Детальная информация загружена: ${detailed.length} вакансий`);
        return detailed;
    }
    /**
     * Построение URL для страницы с пагинацией
     */
    buildPageUrl(categoryUrl, page) {
        // На 999.md пагинация работает через ?page=N
        // Но нужно учитывать, что в URL может быть уже query string
        const url = new URL(categoryUrl, this.baseUrl);
        if (page > 1) {
            url.searchParams.set('page', page.toString());
        }
        return url.toString();
    }
    /**
     * Поиск ссылки на категорию вакансий
     */
    findCategoryLink(html, searchQuery) {
        const dom = new JSDOM(html);
        const document = dom.window.document;
        // Ищем все подкатегории (subcategories)
        const subcategoryLinks = document.querySelectorAll('a[data-subcategory]');
        if (subcategoryLinks.length === 0) {
            return null;
        }
        const searchLower = searchQuery.trim().toLowerCase();
        // Если не указана категория, берем первую попавшуюся
        if (!searchQuery) {
            const firstLink = subcategoryLinks[0];
            const href = firstLink.getAttribute('href');
            return href ? this.normalizeUrl(href) : null;
        }
        // Ищем категорию по названию
        for (const link of subcategoryLinks) {
            const text = link.textContent?.trim().toLowerCase() || '';
            if (text.includes(searchLower)) {
                const href = link.getAttribute('href');
                return href ? this.normalizeUrl(href) : null;
            }
        }
        return null;
    }
    /**
     * Парсинг вакансий с одной страницы
     */
    async parseVacanciesFromPage(url) {
        const html = await this.fetchPage(url);
        const dom = new JSDOM(html);
        const document = dom.window.document;
        // Ищем контейнер со списком вакансий
        const container = document.querySelector('.styles_adlist__3YsgA');
        if (!container) {
            return [];
        }
        // Получаем все карточки вакансий
        const cards = container.querySelectorAll('article.AdVacancies_wrapper__oZp_b');
        const vacancies = [];
        cards.forEach((card) => {
            try {
                const vacancy = this.extractVacancyFromCard(card);
                if (vacancy) {
                    vacancies.push(vacancy);
                }
            }
            catch (error) {
                // Тихо пропускаем ошибки парсинга отдельных карточек
                log('⚠️ Ошибка при парсинге карточки:', error);
            }
        });
        return vacancies;
    }
    /**
     * Извлечение данных вакансии из карточки
     */
    extractVacancyFromCard(card) {
        // Получаем заголовок и ссылку
        const titleLink = card.querySelector('h5.AdVacancies_title__link__V9IOY a');
        const title = titleLink?.textContent?.trim() || '';
        const url = titleLink?.getAttribute('href') || '';
        if (!title || !url) {
            return null;
        }
        // Получаем характеристики вакансии
        const features = card.querySelectorAll('.AdVacancies_features__item__IBTIr');
        // Обычно: [график работы, опыт работы, образование]
        const schedule = features[0]?.textContent?.trim() || undefined;
        const experience = features[1]?.textContent?.trim() || undefined;
        const education = features[2]?.textContent?.trim() || undefined;
        return {
            id: this.extractIdFromUrl(url),
            title,
            url: this.normalizeUrl(url),
            schedule,
            experience,
            education,
            source: '999.md',
        };
    }
    /**
     * Построение URL для поиска
     */
    buildSearchUrl() {
        // Для 999.md используем раздел работа
        // Сначала загружаем страницу категорий, потом ищем нужную подкатегорию
        return `${this.baseUrl}/ru/category/work`;
    }
    /**
     * Добавление фильтра "Предлагая работу" к URL категории
     */
    addJobOfferFilter(categoryUrl) {
        const url = new URL(categoryUrl, this.baseUrl);
        // appl=1 означает "предлагаю работу"
        url.searchParams.set('appl', '1');
        return url.toString();
    }
    /**
     * Загрузка HTML страницы
     */
    async fetchPage(url) {
        try {
            const response = await this.axiosInstance.get(url);
            return response.data;
        }
        catch (error) {
            if (axios.isAxiosError(error)) {
                log(`❌ Ошибка HTTP: ${error.message}`);
            }
            throw error;
        }
    }
    /**
     * Нормализация URL
     */
    normalizeUrl(url) {
        return url.startsWith('http') ? url : `${this.baseUrl}${url}`;
    }
    /**
     * Извлечение ID из URL
     */
    extractIdFromUrl(url) {
        const match = url.match(/\/(\d+)/);
        return match ? match[1] : url;
    }
    /**
     * Вспомогательная обёртка: парсит детали с учётом кэша
     */
    async parseVacancyDetailsWithCache(url) {
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
                    const parsed = JSON.parse(raw);
                    return parsed;
                }
            }
        }
        catch {
            // Игнорируем ошибки чтения кэша
        }
        const details = await this.parseVacancyDetails(url);
        try {
            await fs.writeFile(filePath, JSON.stringify(details, null, 2), 'utf-8');
        }
        catch {
            log('⚠️ Не удалось записать кэш:', filePath);
        }
        return details;
    }
    /**
     * Парсинг детальной страницы вакансии
     * TODO: реализовать парсинг деталей
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async parseVacancyDetails(url) {
        // Пока возвращаем пустой объект
        // Детальный парсинг реализуем на следующем этапе
        return {};
    }
    /**
     * Утилита: md5 hash
     */
    hash(input) {
        return crypto.createHash('md5').update(input).digest('hex');
    }
}
//# sourceMappingURL=nineNineNineMd.js.map