/**
 * Парсер словаря специальностей с rabota.md
 */

import puppeteer from 'puppeteer';

export async function parseRabotaMdDictionary() {
  console.log('🔍 Парсинг словаря специальностей с rabota.md...');

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    );

    // Переходим на страницу с категориями вакансий
    await page.goto('https://www.rabota.md/ru/vacancies', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Ждем загрузки категорий
    await page.waitForSelector('.categories-list, .category-item, a[href*="/vacancies/"]', {
      timeout: 10000
    });

    // Извлекаем категории и специальности
    const professions = await page.evaluate(() => {
      const results: Array<{
        profession: string;
        professionId?: string;
        category?: string;
      }> = [];

      // Ищем все ссылки на категории вакансий
      const links = document.querySelectorAll('a[href*="/vacancies/"]');

      links.forEach(link => {
        const href = link.getAttribute('href');
        const text = link.textContent?.trim();

        if (text && href && !text.includes('Все вакансии')) {
          // Извлекаем ID категории из URL
          const match = href.match(/\/vacancies\/([^/?]+)/);
          const professionId = match ? match[1] : undefined;

          results.push({
            profession: text,
            professionId,
            category: undefined // Определим позже
          });
        }
      });

      return results;
    });

    console.log(`✅ Найдено ${professions.length} специальностей с rabota.md`);

    await browser.close();
    return professions;

  } catch (error) {
    console.error('❌ Ошибка при парсинге rabota.md:', error);
    await browser.close();
    return [];
  }
}
