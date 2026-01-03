/**
 * Тестовый парсер с Puppeteer для makler.md
 * Для обхода антибот защиты
 */

import puppeteer from 'puppeteer';

async function testMaklerWithPuppeteer() {
  console.log('🚀 Запуск тестирования makler.md с Puppeteer\n');
  
  const url = 'https://makler.md/transnistria/job/job-offers?list&list=detail&field_446[]=2869';
  
  const browser = await puppeteer.launch({
    headless: false, // Показываем браузер для отладки
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
    ],
  });

  try {
    const page = await browser.newPage();
    
    // Устанавливаем viewport
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Устанавливаем user agent
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
    
    // Убираем признаки автоматизации
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });
      
      // @ts-ignore
      window.navigator.chrome = {
        runtime: {},
      };
      
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });
      
      Object.defineProperty(navigator, 'languages', {
        get: () => ['ru-RU', 'ru', 'en-US', 'en'],
      });
    });

    console.log(`📄 Переход на: ${url}`);
    
    const response = await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    const status = response?.status();
    console.log(`\n✅ Статус ответа: ${status}`);

    if (status === 418) {
      console.log('❌ Получен статус 418 - антибот защита активна\n');
      
      // Пробуем подождать и обновить
      console.log('⏳ Ждем 3 секунды...');
      await page.waitForTimeout(3000);
      
      console.log('🔄 Обновляем страницу...');
      await page.reload({ waitUntil: 'networkidle2' });
      
      const newStatus = response?.status();
      console.log(`✅ Новый статус: ${newStatus}`);
    }

    // Проверяем наличие контента
    const title = await page.title();
    console.log(`\n📋 Заголовок страницы: ${title}`);

    // Ищем article элементы
    const articles = await page.$$('article');
    console.log(`\n📊 Найдено article элементов: ${articles.length}`);

    if (articles.length > 0) {
      console.log('\n✅ Страница загружена успешно! Парсим первые 3 вакансии:\n');
      
      for (let i = 0; i < Math.min(3, articles.length); i++) {
        const article = articles[i];
        
        const title = await article.$eval('.ls-detail_antTitle a', el => el.textContent?.trim() || '');
        const url = await article.$eval('.ls-detail_antTitle a', el => el.getAttribute('href') || '');
        const time = await article.$eval('.ls-detail_time', el => el.textContent?.trim() || '').catch(() => '');
        
        console.log(`${i + 1}. ${title}`);
        console.log(`   URL: ${url}`);
        console.log(`   Время: ${time}\n`);
      }
    } else {
      console.log('\n❌ Вакансии не найдены');
      
      // Сохраняем скриншот для отладки
      await page.screenshot({ path: 'makler-debug.png', fullPage: true });
      console.log('📸 Скриншот сохранен: makler-debug.png');
      
      // Сохраняем HTML
      const html = await page.content();
      const fs = await import('fs/promises');
      await fs.writeFile('makler-debug.html', html);
      console.log('💾 HTML сохранен: makler-debug.html');
    }

    // Ждем перед закрытием
    console.log('\n⏳ Ждем 5 секунд перед закрытием...');
    await page.waitForTimeout(5000);

  } catch (error) {
    console.error('\n❌ Ошибка:', error);
  } finally {
    await browser.close();
    console.log('\n✅ Браузер закрыт');
  }
}

testMaklerWithPuppeteer().catch(console.error);
