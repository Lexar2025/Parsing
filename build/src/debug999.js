/**
 * Скрипт для отладки парсера 999.md
 * Проверяет, что именно возвращается с сервера
 */
import axios from 'axios';
import { JSDOM } from 'jsdom';
import * as fs from 'fs';
async function debugPage(url) {
    console.log(`\n🔍 Проверка URL: ${url}\n`);
    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
            },
        });
        const html = response.data;
        // Сохраняем HTML в файл для анализа
        fs.writeFileSync('debug_999_page.html', html, 'utf-8');
        console.log('✅ HTML сохранен в файл: debug_999_page.html\n');
        // Парсим с JSDOM
        const dom = new JSDOM(html);
        const document = dom.window.document;
        // Проверяем наличие контейнера со списком
        console.log('📋 Проверка селекторов:\n');
        const container = document.querySelector('.styles_adlist__3YsgA');
        console.log(`1. Контейнер .styles_adlist__3YsgA: ${container ? '✅ НАЙДЕН' : '❌ НЕ НАЙДЕН'}`);
        if (container) {
            const cards = container.querySelectorAll('article.AdVacancies_wrapper__oZp_b');
            console.log(`2. Карточки article.AdVacancies_wrapper__oZp_b: ${cards.length} шт.`);
            if (cards.length > 0) {
                console.log('\n📄 Первая карточка:');
                const firstCard = cards[0];
                const titleLink = firstCard.querySelector('h5.AdVacancies_title__link__V9IOY a');
                const title = titleLink?.textContent?.trim();
                const url = titleLink?.getAttribute('href');
                console.log(`   Заголовок: ${title || 'НЕ НАЙДЕН'}`);
                console.log(`   URL: ${url || 'НЕ НАЙДЕН'}`);
                const features = firstCard.querySelectorAll('.AdVacancies_features__item__IBTIr');
                console.log(`   Характеристики: ${features.length} шт.`);
                features.forEach((f, i) => {
                    console.log(`     ${i + 1}. ${f.textContent?.trim()}`);
                });
            }
        }
        else {
            // Пробуем найти другие возможные контейнеры
            console.log('\n🔍 Поиск альтернативных селекторов:\n');
            const allDivs = document.querySelectorAll('div[class*="adlist"]');
            console.log(`Найдено div с "adlist" в классе: ${allDivs.length}`);
            const allArticles = document.querySelectorAll('article');
            console.log(`Найдено article: ${allArticles.length}`);
            const allCards = document.querySelectorAll('[class*="Vacancies"]');
            console.log(`Найдено элементов с "Vacancies" в классе: ${allCards.length}`);
            // Выводим первые 10 классов, которые есть на странице
            const allElements = document.querySelectorAll('[class]');
            const classes = new Set();
            allElements.forEach(el => {
                el.classList.forEach(cls => classes.add(cls));
            });
            console.log('\n📝 Примеры классов на странице:');
            Array.from(classes).slice(0, 20).forEach(cls => {
                console.log(`   - ${cls}`);
            });
        }
        // Проверяем, есть ли скрипты для динамической загрузки
        const scripts = document.querySelectorAll('script');
        console.log(`\n⚙️ Скриптов на странице: ${scripts.length}`);
        let hasReact = false;
        let hasNext = false;
        scripts.forEach(script => {
            const src = script.getAttribute('src');
            if (src?.includes('react'))
                hasReact = true;
            if (src?.includes('next'))
                hasNext = true;
        });
        console.log(`   React: ${hasReact ? '✅' : '❌'}`);
        console.log(`   Next.js: ${hasNext ? '✅' : '❌'}`);
        if (hasReact || hasNext) {
            console.log('\n⚠️ ВНИМАНИЕ: Сайт использует React/Next.js!');
            console.log('   Контент загружается динамически через JavaScript.');
            console.log('   Простой HTTP запрос не получит данные.');
            console.log('   Необходимо использовать headless browser (Puppeteer/Playwright).');
        }
    }
    catch (error) {
        console.error('❌ Ошибка:', error);
    }
}
// Запуск
const url = process.argv[2] || 'https://999.md/ru/list/work/loader?appl=1';
debugPage(url);
//# sourceMappingURL=debug999.js.map