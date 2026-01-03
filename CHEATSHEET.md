# 📋 Шпаргалка команд

## 🔨 Сборка
```powershell
npm run build          # Компиляция TypeScript
npm run build:watch    # Компиляция с автообновлением
npm run clean          # Очистка build/ coverage/ tmp/
```

## 🚀 Запуск парсеров
```powershell
npm run parse rabota.md    # Парсинг rabota.md (Puppeteer)
npm run parse 999.md       # Парсинг 999.md (HTTP)
npm run parse makler.md    # Парсинг makler.md (HTTP + защита)
```

## 🧪 Тестирование
```powershell
npm test                   # Все тесты
npm run test:watch         # Тесты в watch режиме
npm run test:coverage      # Тесты с покрытием
npm run test:puppeteer     # Тест Puppeteer

# Специальные тесты для makler.md
node test-makler-headers.js    # Тест HTTP заголовков
node test-makler-puppeteer.js  # Тест с браузером
```

## 🛠️ Разработка
```powershell
npm run lint               # Проверка кода (ESLint)
npm run prettier           # Форматирование кода
npm run prettier:check     # Проверка форматирования
```

## 📊 Управление данными
```powershell
npm run manage             # Интерактивное управление вакансиями
```

## 🔍 Отладка

### Просмотр результатов
```powershell
# JSON результаты
cat vacancies_rabota_md.json
cat vacancies_999_md.json
cat vacancies_makler_md.json

# Красивый вывод JSON
node -e "console.log(JSON.stringify(require('./vacancies_makler_md.json'), null, 2))"
```

### Логи и отладка
```powershell
# Просмотр кэша
ls cache/

# Очистка кэша
Remove-Item -Recurse cache/*

# Проверка версии Node.js
node --version    # Должно быть >= 22.11
```

## ⚡ Быстрые решения проблем

### HTTP 418 на makler.md
```powershell
# 1. Тест заголовков
node test-makler-headers.js

# 2. Тест с браузером
node test-makler-puppeteer.js

# 3. Пересборка и парсинг
npm run build
npm run parse makler.md
```

### Puppeteer ошибки
```powershell
# Установка Chromium
npx puppeteer browsers install chrome

# Проверка установки
node -e "require('puppeteer').launch().then(b => b.close())"
```

### TypeScript ошибки
```powershell
# Полная пересборка
npm run clean
npm run build
```

## 📁 Полезные пути

```
Исходный код:        src/
Скомпилированный:    build/
Кэш:                 cache/
Результаты:          vacancies_*.json
Конфигурация:        tsconfig.json
                     package.json
```

## 🎯 Типичные workflow

### Новый парсинг
```powershell
npm run build
npm run parse makler.md
```

### Отладка парсера
```powershell
# 1. Создайте тестовый скрипт
# test-debug.js

# 2. Запустите
node test-debug.js

# 3. Исправьте код
# src/parsers/yourparser.ts

# 4. Пересоберите
npm run build

# 5. Повторите
node test-debug.js
```

### Разработка функции
```powershell
# Терминал 1: автосборка
npm run build:watch

# Терминал 2: тесты
npm run test:watch

# Терминал 3: парсер
npm run parse makler.md
```

## 🔥 Горячие клавиши в PowerShell

```powershell
Ctrl+C          # Остановить процесс
Ctrl+L          # Очистить консоль
↑ / ↓           # История команд
Tab             # Автодополнение
Ctrl+R          # Поиск в истории
```

## 📞 Помощь

```powershell
npm run build --help       # Справка по команде
node script.js --help      # Справка по скрипту

# Документация
cat README.md
cat MAKLER_FIX.md
cat NEXT_STEPS.md
```

## 💾 Резервное копирование

```powershell
# Сохранить результаты
Copy-Item vacancies_*.json backup/

# Экспорт в CSV (если нужно)
node -e "
  const data = require('./vacancies_makler_md.json');
  console.log('id,title,url');
  data.vacancies.forEach(v => 
    console.log(\`\${v.id},\${v.title},\${v.url}\`)
  );
" > vacancies.csv
```

## 🎨 Форматирование вывода

```powershell
# Количество вакансий
node -e "console.log(require('./vacancies_makler_md.json').stats.total)"

# Только заголовки
node -e "
  require('./vacancies_makler_md.json')
    .vacancies
    .forEach((v, i) => console.log(\`\${i+1}. \${v.title}\`))
"

# Топ 5 компаний
node -e "
  const data = require('./vacancies_rabota_md.json');
  const companies = {};
  data.vacancies.forEach(v => {
    companies[v.company] = (companies[v.company] || 0) + 1;
  });
  Object.entries(companies)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .forEach(([c, n]) => console.log(\`\${c}: \${n}\`));
"
```

---

💡 **Совет:** Добавьте эту шпаргалку в закладки или держите открытой при работе!
