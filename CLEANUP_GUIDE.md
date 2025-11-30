# План очистки проекта

## Файлы для удаления (связаны с API подходом)

### Корневая папка
- [x] `PARSER_README.md` - старый README
- [x] `SETUP.md` - старая инструкция по установке
- [x] `SOLUTION_999MD.md` - описание проблемы с API
- [x] `TEST_999MD.md` - старая инструкция по тестированию  
- [x] `TESTING_CHECKLIST.md` - старый чеклист тестирования
- [x] `GRAPHQL_SUCCESS.md` - успехи с GraphQL API (не актуально)
- [x] `debug_999_page.html` - отладочный HTML файл
- [x] `debug_rabota_page.html` - отладочный HTML файл
- [x] `vacancies_999md_graphql.json` - результаты GraphQL запросов

### src/
- [x] `debug.ts` - скрипт отладки (для HTTP парсинга)
- [x] `debug999.ts` - скрипт отладки 999.md (для HTTP парсинга)

## Файлы которые ОСТАВЛЯЕМ

### Корневая папка
- ✅ `README.md` - новый актуальный README
- ✅ `CHANGELOG.md` - история изменений
- ✅ `package.json` - зависимости проекта
- ✅ `tsconfig.json` - конфигурация TypeScript
- ✅ `eslint.config.mjs` - конфигурация ESLint
- ✅ `.prettierrc` - конфигурация Prettier
- ✅ `.gitignore` - игнорируемые файлы
- ✅ `vacancies.json` - результаты rabota.md
- ✅ `vacancies_999md.json` - результаты 999.md
- ✅ `vacancies_999_md.json` - результаты 999.md (альтернативное имя)

### src/
- ✅ `main.ts` - запуск rabota.md
- ✅ `test999.ts` - запуск 999.md
- ✅ `parse.ts` - универсальный парсер
- ✅ `test.ts` - тестовый файл
- ✅ `parsers/rabotaMd.ts` - парсер rabota.md
- ✅ `parsers/nineNineNineMd.ts` - парсер 999.md (будет переписан под Puppeteer)
- ✅ `config/parsers.ts` - конфигурация
- ✅ `types/vacancy.ts` - типы TypeScript
- ✅ `utils/helpers.ts` - вспомогательные функции

## После очистки нужно:

1. Установить Puppeteer:
   ```bash
   npm install puppeteer
   npm install --save-dev @types/puppeteer
   ```

2. Переписать `src/parsers/nineNineNineMd.ts` для работы с Puppeteer

3. Обновить импорты и зависимости

4. Протестировать работу парсера
