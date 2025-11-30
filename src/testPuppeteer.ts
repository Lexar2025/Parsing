/**
 * Тестовый скрипт для проверки Puppeteer
 * Загружает страницу 999.md и проверяет наличие карточек вакансий
 */

import puppeteer from 'puppeteer';

async function testPuppeteer(): Promise<void> {
  console.log('🚀 Запуск Puppeteer...\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  // Устанавливаем viewport
  await page.setViewport({ width: 1920, height: 1080 });

  // Устанавливаем User-Agent
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  );

  console.log('📄 Загружаем страницу 999.md...\n');

  // Пример URL с вакансиями грузчиков
  const url = 'https://999.md/ru/list/work/loader?appl=1';

  try {
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    console.log('✅ Страница загружена\n');

    // Ждём загрузки контента
    await page.waitForSelector('.styles_adlist__3YsgA', { timeout: 10000 });

    console.log('✅ Контейнер .styles_adlist__3YsgA найден\n');

    // Проверяем наличие карточек вакансий
    const cards = await page.$$('article.AdVacancies_wrapper__oZp_b');

    console.log(`📋 Найдено карточек вакансий: ${cards.length}\n`);

    if (cards.length > 0) {
      console.log('🎉 Puppeteer работает! Карточки загружены.\n');

      // Извлекаем данные из первых 3 карточек для проверки
      console.log('📝 Примеры вакансий:\n');

      for (let i = 0; i < Math.min(3, cards.length); i++) {
        const card = cards[i];

        const title = await card.$eval('h5.AdVacancies_title__link__V9IOY a', (el) =>
          el.textContent?.trim(),
        );
        const url = await card.$eval('h5.AdVacancies_title__link__V9IOY a', (el) =>
          el.getAttribute('href'),
        );

        console.log(`${i + 1}. ${title}`);
        console.log(`   URL: https://999.md${url}\n`);
      }
    } else {
      console.log('❌ Карточки не найдены. Возможные причины:');
      console.log('   1. Селекторы изменились');
      console.log('   2. Контент не успел загрузиться');
      console.log('   3. На странице нет вакансий\n');
    }

    // Сохраняем скриншот для отладки
    await page.screenshot({ path: 'puppeteer_test_screenshot.png', fullPage: true });
    console.log('📸 Скриншот сохранён: puppeteer_test_screenshot.png\n');
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await browser.close();
    console.log('👋 Браузер закрыт');
  }
}

testPuppeteer().catch(console.error);
