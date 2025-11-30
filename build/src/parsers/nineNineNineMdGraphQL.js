/**
 * Парсер для сайта 999.md через GraphQL API
 * Использует официальный GraphQL endpoint вместо парсинга HTML
 */
import axios from 'axios';
import * as path from 'path';
import crypto from 'crypto';
import { log, pause } from '../utils/helpers.js';
// Маппинг категорий на subCategoryId
const CATEGORY_MAP = {
    'Грузчик': 7809,
    'Загрузчик': 7809,
    'Водитель': 6211,
    'Курьер': 6154,
    'Повар': 6198,
    'Официант': 6197,
    'Продавцы': 6168,
    'Бухгалтер': 6148,
};
export class NineNineNineMdGraphQLParser {
    axiosInstance;
    baseUrl = 'https://999.md';
    graphqlUrl = 'https://999.md/graphql';
    options;
    constructor(opts) {
        this.options = {
            concurrency: opts?.concurrency ?? 3,
            cacheEnabled: opts?.cacheEnabled ?? true,
            cacheDir: opts?.cacheDir ?? path.resolve(process.cwd(), 'cache', '999-md-graphql'),
            cacheTTLSeconds: opts?.cacheTTLSeconds ?? 60 * 60 * 24,
        };
        this.axiosInstance = axios.create({
            headers: {
                'Content-Type': 'application/json',
                'Accept': '*/*',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'lang': 'ru',
                'source': 'desktop',
            },
            timeout: 15000,
        });
    }
    /**
     * Основной метод парсинга
     */
    async parse(config) {
        try {
            log(`Начинаю поиск вакансий на 999.md через GraphQL API: ${config.searchQuery || 'все категории'}\n`);
            // Получаем subCategoryId по названию категории
            const subCategoryId = this.getCategoryId(config.searchQuery || '');
            if (!subCategoryId) {
                log(`Категория "${config.searchQuery}" не найдена в маппинге`);
                log('Доступные категории:', Object.keys(CATEGORY_MAP).join(', '));
                return {
                    vacancies: [],
                    totalFound: 0,
                    page: 1,
                    hasNextPage: false,
                };
            }
            log(`Найдена категория ID: ${subCategoryId}\n`);
            // Парсим все страницы
            const allVacancies = await this.parseAllPages(subCategoryId, config.maxPages || 10, config.delay || 1000);
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
     * Получить ID категории по названию
     */
    getCategoryId(categoryName) {
        const normalized = categoryName.trim();
        return CATEGORY_MAP[normalized] || null;
    }
    /**
     * Парсинг всех страниц через GraphQL API
     */
    async parseAllPages(subCategoryId, maxPages, delay) {
        const allVacancies = [];
        const pageSize = 78; // Стандартный размер страницы из API
        let currentPage = 0;
        let totalCount = 0;
        while (currentPage < maxPages) {
            const skip = currentPage * pageSize;
            log(`📄 Парсинг страницы ${currentPage + 1} (skip: ${skip})...`);
            try {
                const response = await this.fetchGraphQL(subCategoryId, pageSize, skip);
                if (!response.data.searchAds.ads || response.data.searchAds.ads.length === 0) {
                    log(`   ⚠️  Страница ${currentPage + 1} пуста`);
                    break;
                }
                totalCount = response.data.searchAds.count;
                const vacancies = response.data.searchAds.ads.map(ad => this.convertAdToVacancy(ad));
                allVacancies.push(...vacancies);
                log(`   ✅ Найдено ${vacancies.length} вакансий (всего: ${allVacancies.length} из ${totalCount})`);
                // Если получили все вакансии, прерываем
                if (allVacancies.length >= totalCount) {
                    log(`   🎉 Получены все вакансии!`);
                    break;
                }
                // Задержка между запросами
                if (currentPage < maxPages - 1) {
                    await pause(delay);
                }
                currentPage++;
            }
            catch (error) {
                log(`   ❌ Ошибка при парсинге страницы ${currentPage + 1}:`, error);
                break;
            }
        }
        return allVacancies;
    }
    /**
     * Запрос к GraphQL API
     */
    async fetchGraphQL(subCategoryId, limit, skip) {
        const query = `
      query SearchAds($input: Ads_SearchInput!, $isWorkCategory: Boolean = false, $locale: Common_Locale) {
        searchAds(input: $input) {
          ads {
            id
            title
            price: feature(id: 2) {
              id
              type
              value
            }
            salary: feature(id: 266) {
              id
              type
              value
            }
            workSchedule: feature(id: 260) {
              id
              type
              value
            }
            workExperience: feature(id: 263) {
              id
              type
              value
            }
            education: feature(id: 261) {
              id
              type
              value
            }
          }
          count
        }
      }
    `;
        const variables = {
            isWorkCategory: true,
            locale: 'ru_RU',
            input: {
                subCategoryId,
                source: 'AD_SOURCE_DESKTOP',
                pagination: {
                    limit,
                    skip,
                },
                filters: [],
            },
        };
        const response = await this.axiosInstance.post(this.graphqlUrl, {
            operationName: 'SearchAds',
            query,
            variables,
        });
        return response.data;
    }
    /**
     * Конвертация GraphQL объявления в наш формат Vacancy
     */
    convertAdToVacancy(ad) {
        const vacancy = {
            id: ad.id,
            title: ad.title,
            url: `${this.baseUrl}/ru/${ad.id}`,
            source: '999.md',
        };
        // Зарплата
        if (ad.price?.value) {
            const price = ad.price.value;
            vacancy.salary = `${price.value} ${price.unit}`;
        }
        else if (ad.salary?.value) {
            vacancy.salary = ad.salary.value.translated;
        }
        // График работы
        if (ad.workSchedule?.value) {
            vacancy.schedule = ad.workSchedule.value.translated;
        }
        // Опыт работы
        if (ad.workExperience?.value) {
            vacancy.experience = ad.workExperience.value.translated;
        }
        // Образование
        if (ad.education?.value) {
            vacancy.education = ad.education.value.translated;
        }
        return vacancy;
    }
    /**
     * Парсинг детальной страницы вакансии
     * TODO: реализовать через GraphQL или отдельный запрос
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async parseVacancyDetails(url) {
        // Пока возвращаем пустой объект
        // Детальная информация уже есть в основном запросе
        return {};
    }
    /**
     * Утилита: md5 hash
     */
    hash(input) {
        return crypto.createHash('md5').update(input).digest('hex');
    }
}
//# sourceMappingURL=nineNineNineMdGraphQL.js.map