import axios from 'axios';

const testUrl = 'https://makler.md/transnistria/job/job-offers?list&list=detail&field_446[]=2869';

// Различные наборы заголовков для тестирования
const headerSets = [
  {
    name: 'Базовые заголовки',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    }
  },
  {
    name: 'Полные Chrome заголовки',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Cache-Control': 'max-age=0',
    }
  },
  {
    name: 'С Referer',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'ru-RU,ru;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Referer': 'https://makler.md/',
      'Origin': 'https://makler.md',
      'Connection': 'keep-alive',
    }
  },
  {
    name: 'Firefox заголовки',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
    }
  }
];

async function testHeaders() {
  console.log('🧪 Тестирование различных наборов заголовков для makler.md\n');
  console.log(`URL: ${testUrl}\n`);
  console.log('='.repeat(80));

  for (const set of headerSets) {
    console.log(`\n📋 Тест: ${set.name}`);
    console.log('-'.repeat(80));

    try {
      const response = await axios.get(testUrl, {
        headers: set.headers,
        timeout: 15000,
        maxRedirects: 5,
        validateStatus: () => true, // Не выбрасывать ошибку на любой статус
      });

      console.log(`✅ Статус: ${response.status} ${response.statusText}`);
      console.log(`📦 Размер ответа: ${response.data.length} байт`);
      
      if (response.status === 200) {
        // Проверяем, есть ли в ответе HTML контент
        const hasHtml = response.data.includes('<!DOCTYPE') || response.data.includes('<html');
        const hasArticles = response.data.includes('article');
        
        console.log(`🎯 HTML найден: ${hasHtml ? 'ДА' : 'НЕТ'}`);
        console.log(`📝 Статьи найдены: ${hasArticles ? 'ДА' : 'НЕТ'}`);
        
        if (hasArticles) {
          const articleMatches = response.data.match(/<article/g);
          console.log(`📊 Количество <article>: ${articleMatches ? articleMatches.length : 0}`);
        }
      } else if (response.status === 418) {
        console.log(`❌ Получен статус 418 - "I'm a teapot" (антибот защита)`);
      } else {
        console.log(`⚠️  Неожиданный статус`);
      }

    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.log(`❌ Ошибка: ${error.message}`);
        if (error.response) {
          console.log(`   Статус: ${error.response.status}`);
        }
      } else {
        console.log(`❌ Неизвестная ошибка:`, error);
      }
    }

    // Задержка между запросами
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ Тестирование завершено');
}

testHeaders().catch(console.error);
