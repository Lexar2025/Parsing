/**
 * Парсер словаря специальностей с 999.md
 */

import puppeteer from 'puppeteer';

export async function parseNineNineNineMdDictionary(): Promise<Array<{
  profession: string;
  professionId?: string;
  category?: string;
  vacancyCount?: number;
}>> {
  console.log('🔍 Парсинг словаря специальностей с 999.md...');

  const browser = await puppeteer.launch({
    headless: 'shell',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-software-rasterizer',
      '--disable-background-networking',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-infobars',
      '--disable-breakpad',
      '--disable-notifications',
      '--mute-audio',
      '--no-service-autorun',
      '--password-store=basic',
      '--use-gl=swiftshader',
      '--hide-scrollbars',
      '--disable-features=VizDisplayCompositor'
    ],
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser',
    timeout: 60000
  });
  const page = await browser.newPage();

  try {
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    );

    // Переходим на главную страницу работы
    await page.goto('https://999.md/ru/category/work', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Ждем загрузки подкатегорий
    await page.waitForSelector('a[data-subcategory]', {
      timeout: 10000
    });

    // Извлекаем подкатегории (специальности) с количеством вакансий
    const professions = await page.evaluate(() => {
      const results: Array<{
        profession: string;
        professionId?: string;
        category?: string;
        vacancyCount?: number;
      }> = [];

      const items = document.querySelectorAll('li');

      items.forEach(item => {
        const link = item.querySelector('a[data-subcategory]');
        const countSpan = item.querySelector('.styles_subcategory__count__6PvHA');
        
        if (link) {
          const text = link.textContent?.trim();
          const subcategoryId = link.getAttribute('data-subcategory');
          
          if (text && text !== 'Все объявления') {
            const countText = countSpan?.textContent?.trim();
            const vacancyCount = countText ? parseInt(countText) : undefined;
            
            results.push({
              profession: text,
              professionId: subcategoryId || undefined,
              category: 'Работа',
              vacancyCount
            });
          }
        }
      });

      return results;
    });

    console.log(`✅ Найдено ${professions.length} специальностей с 999.md`);

    await browser.close();
    return professions;

  } catch (error) {
    console.error('❌ Ошибка при парсинге 999.md:', error);
    await browser.close();
    return [];
  }
}
