# Rabota.md Parser - Парсер вакансий

Многофункциональный парсер вакансий для сайтов с работой в Молдове.

## 🚀 Быстрый старт

### Установка зависимостей
```bash
npm install
```

### Сборка проекта
```bash
npm run build
```

### Запуск парсинга
```bash
# Для rabota.md
npm run parse rabota.md

# Для 999.md
npm run parse 999.md

# Для makler.md
npm run parse makler.md
```

## 🌐 Поддерживаемые сайты

### 1. rabota.md
- **Технология:** Puppeteer
- **Статус:** ✅ Работает

### 2. 999.md
- **Технология:** HTTP/Cheerio
- **Статус:** ✅ Работает

### 3. makler.md
- **Технология:** Puppeteer + Stealth Plugin
- **Защита:** Cloudflare (обходится автоматически)
- **Статус:** ✅ Работает

## 🔧 Настройка парсера makler.md

### Доступные профессии

В файле `src/parsers/maklerMd.ts` есть словарь `MAKLER_PROFESSIONS`:

```typescript
'Программисты': 2869,
'Backend': 2870,
'Frontend': 2871,
'Системные администраторы': 2872,
// ... и другие
```

### Изменение параметров в parse.js

```javascript
'makler.md': {
  parser: new MaklerMdParser({
    headless: false,       // true = без UI, false = видно браузер
    cacheEnabled: true,
    parseDetails: false,   // Отключить парсинг деталей для скорости
  }),
  config: {
    searchQuery: 'Программисты',
    maxPages: 10,
    delay: 2000,
  },
},
```

## 📋 Команды

```bash
npm run build          # Сборка
npm run parse <site>   # Парсинг
npm run manage         # Управление вакансиями
npm test              # Тесты
```

## 🐛 Решение проблем

### makler.md не находит вакансии

1. Запустите с `headless: false` чтобы видеть что происходит
2. Увеличьте задержки: `delay: 5000`
3. Проверьте словарь профессий в коде

### Puppeteer ошибки

```bash
# Установка Chromium
npx puppeteer browsers install chrome
```

### TypeScript ошибки

```bash
npm run clean
npm run build
```

## 📊 Структура результатов

Результаты сохраняются в `vacancies_*.json`:

```json
{
  "vacancies": [
    {
      "id": "12345",
      "title": "Программист Python",
      "url": "https://makler.md/...",
      "source": "makler.md",
      // ...
    }
  ],
  "stats": {
    "total": 150,
    "active": 145
  }
}
```

## 📚 Технологии

- **Puppeteer** - автоматизация браузера
- **puppeteer-extra-plugin-stealth** - обход Cloudflare
- **Axios** - HTTP запросы
- **Cheerio** - парсинг HTML
- **TypeScript** - типизация

## 📞 Поддержка

При проблемах:
1. Проверьте версию Node.js: `node --version` (>= 22.11)
2. Переустановите зависимости: `npm install`
3. Пересоберите: `npm run build`
