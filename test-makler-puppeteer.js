import puppeteer from 'puppeteer';
import fs from 'fs/promises';

// Функция для задержки (замена waitForTimeout)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function testMaklerWithPuppeteer() {
  console.log('🚀 Запуск тестирования makler.md с Puppeteer\n');
  
  const url = 'https://makler.md/transnistria/job/job-offers?list&field_446[]=2869&list=false';
  
  const browser = await puppeteer.launch({
    headless: false, 
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
    
    // Эмуляция отсутствия автоматизации
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      // @ts-ignore
      window.navigator.chrome = { runtime: {} };
    });

    console.log(`📄 Переход на: ${url}`);
    
    let response = await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 60000, // Увеличил таймаут для медленной загрузки Cloudflare
    });

    let status = response?.status();
    console.log(`✅ Статус ответа: ${status}`);

    // Если 418 или если страница пустая (Cloudflare Challenge)
    if (status === 418 || status === 403) {
      console.log('⏳ Обнаружена защита. Ждем 5 секунд для прохождения проверки...');
      await delay(5000);
    }

    // КРИТИЧЕСКИЙ МОМЕНТ: Ждем, пока на странице появится ХОТЯ БЫ ОДНА вакансия
    console.log('🔍 Ожидание рендеринга вакансий...');
    try {
      await page.waitForSelector('.ls-detail_anUrl', { timeout: 15000 });
      console.log('✅ Вакансии найдены в DOM!');
    } catch (e) {
      console.log('⚠️ Вакансии не появились вовремя. Возможно, проверка не пройдена.');
    }

    const title = await page.title();
    console.log(`📋 Заголовок страницы: ${title}`);

    const articlesCount = (await page.$$('article')).length;
    console.log(`📊 Найдено article элементов: ${articlesCount}`);

    if (articlesCount > 0) {
      const vacancies = await page.evaluate(() => {
        const results = [];
        const items = document.querySelectorAll('article');

        items.forEach(article => {
          const titleLink = article.querySelector('.ls-detail_anUrl');
          if (!titleLink) return;

          results.push({
            title: titleLink.textContent?.trim() || 'Без заголовка',
            url: titleLink.getAttribute('href') || '',
            time: article.querySelector('.ls-detail_time')?.textContent?.trim() || 'Не указано',
            phone: article.querySelector('.phone_icon')?.textContent?.trim() || 'Нет телефона'
          });
        });
        return results;
      });

      vacancies.slice(0, 5).forEach((v, i) => {
        console.log(`${i + 1}. ${v.title} | Тел: ${v.phone}`);
      });

    } else {
      console.log('❌ Список пуст. Делаем скриншот...');
      await page.screenshot({ path: 'makler-debug.png' });
      const html = await page.content();
      await fs.writeFile('makler-debug.html', html);
    }

    console.log('\n⏳ Завершение через 5 секунд...');
    await delay(5000);

  } catch (error) {
    console.error('\n❌ Ошибка:', error);
  } finally {
    await browser.close();
    console.log('\n✅ Браузер закрыт');
  }
}

testMaklerWithPuppeteer();