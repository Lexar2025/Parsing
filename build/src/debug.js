/**
 * Скрипт для отладки - сохраняет HTML страницы для анализа
 */
import axios from 'axios';
import { writeFileSync } from 'fs';
import { log } from './utils/helpers.js';
async function debugFetchPage() {
    const url = 'https://www.rabota.md/ru/jobs?search=программист';
    log(`Загружаю страницу: ${url}`);
    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
            },
            timeout: 10000,
        });
        const html = response.data;
        // Сохраняем HTML в файл
        writeFileSync('debug_page.html', html, 'utf-8');
        log('HTML страница сохранена в файл: debug_page.html');
        log(`Размер страницы: ${html.length} символов`);
        // Выводим первые 2000 символов для анализа
        console.log('\n=== Первые 2000 символов HTML ===\n');
        console.log(html.substring(0, 2000));
    }
    catch (error) {
        if (axios.isAxiosError(error)) {
            log(`Ошибка HTTP: ${error.message}`);
            if (error.response) {
                log(`Статус: ${error.response.status}`);
                log(`Заголовки:`, error.response.headers);
            }
        }
        else {
            log('Неизвестная ошибка:', error);
        }
    }
}
debugFetchPage();
//# sourceMappingURL=debug.js.map