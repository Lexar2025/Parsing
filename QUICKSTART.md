# ⚡ БЫСТРЫЙ СТАРТ - 3 КОМАНДЫ

## 🎯 Цель
Исправить ошибку HTTP 418 на makler.md и запустить парсер.

---

## 📝 Команды (выполнить по порядку)

### 1️⃣ Пересборка проекта
```powershell
npm run build
```
**Что делает:** Компилирует TypeScript → JavaScript с исправлениями

**Ожидаемый результат:**
```
> rabota-md-parser@0.1.0 build
> tsc -p tsconfig.json

✔ Compiled successfully
```

---

### 2️⃣ Тест HTTP заголовков
```powershell
node test-makler-headers.js
```
**Что делает:** Проверяет 4 набора заголовков, находит рабочий

**Ожидаемый успех:**
```
✅ Статус: 200 OK
📦 Размер ответа: 45678 байт
🎯 HTML найден: ДА
📝 Статьи найдены: ДА
📊 Количество <article>: 20
```

**Если видите:**
```
❌ Получен статус 418
```
Переходите к команде 3 👇

---

### 3️⃣ Тест с Puppeteer (если HTTP не работает)
```powershell
node test-makler-puppeteer.js
```
**Что делает:** Открывает реальный браузер, обходит защиту

**Ожидаемый успех:**
```
✅ Статус ответа: 200
📋 Заголовок страницы: Работа в Тирасполе...
📊 Найдено article элементов: 20

✅ Страница загружена успешно! Парсим первые 3 вакансии:

1. Программист Python
   URL: /transnistria/job/an/1234567
   Время: 03 Января 14:30
```

---

## 🚀 Запуск парсера

Если хотя бы один из тестов (2 или 3) работает:

```powershell
npm run parse makler.md
```

**Успешный вывод:**
```
🚀 Запуск парсера для makler.md

============================================================
📋 Категория: Программисты
📄 Макс. страниц: 10
⏱️  Задержка: 1000мс
============================================================

📄 Парсинг страницы 1/10...
   ✅ Найдено: 20 (новых: 20)
   ⏳ Пауза 1234мс перед следующей страницей...

📄 Парсинг страницы 2/10...
   ✅ Найдено: 20 (новых: 20)
...

============================================================
📊 ИТОГО: Найдено 156 вакансий
✅ Уникальных: 156 вакансий
============================================================

✅ Результаты сохранены в файл: vacancies_makler_md.json
```

---

## ✅ Проверка результатов

```powershell
# Посмотреть количество вакансий
node -e "console.log('Найдено:', require('./vacancies_makler_md.json').stats.total)"

# Показать первые 5 заголовков
node -e "require('./vacancies_makler_md.json').vacancies.slice(0,5).forEach((v,i) => console.log(`${i+1}. ${v.title}`))"
```

---

## ❌ Если не работает

### Вариант A: HTTP 418 остался

**Решение:** Используйте Puppeteer парсер

1. Скопируйте `src/parsers/rabotaMd.ts` → `src/parsers/maklerMdPuppeteer.ts`
2. Измените URL и селекторы для makler.md
3. Обновите `src/parse.js`:
```javascript
import { MaklerMdPuppeteerParser } from './parsers/maklerMdPuppeteer.js';

configs['makler.md'].parser = new MaklerMdPuppeteerParser({ headless: true });
```
4. Пересоберите: `npm run build`
5. Запустите: `npm run parse makler.md`

### Вариант B: Puppeteer ошибки

```powershell
# Установите Chromium
npx puppeteer browsers install chrome

# Проверьте установку
node -e "require('puppeteer').launch().then(b => { console.log('✅ OK'); b.close(); })"
```

### Вариант C: TypeScript ошибки

```powershell
npm run clean
npm install
npm run build
```

---

## 📚 Подробная документация

Если нужно больше информации:

- `README.md` - Полная документация проекта
- `SUMMARY.md` - Что было изменено и почему
- `MAKLER_FIX.md` - Детальное решение проблем
- `NEXT_STEPS.md` - Подробные инструкции
- `CHEATSHEET.md` - Все команды

---

## 💡 Советы

1. **Всегда начинайте с build:** `npm run build`
2. **Тестируйте перед парсингом:** `node test-makler-*.js`
3. **Смотрите логи:** Они объясняют что пошло не так
4. **Puppeteer надежнее HTTP:** Для сложных сайтов

---

## 🎯 Чеклист

- [ ] `npm run build` ✅
- [ ] `node test-makler-headers.js` (или Puppeteer) ✅
- [ ] Один тест показал статус 200 ✅
- [ ] `npm run parse makler.md` ✅
- [ ] Файл `vacancies_makler_md.json` создан ✅
- [ ] В файле есть вакансии (total > 0) ✅

---

## ⏱️ Время выполнения

- Команда 1 (build): ~5-10 сек
- Команда 2 (test HTTP): ~20-30 сек
- Команда 3 (test Puppeteer): ~30-60 сек
- Парсинг 10 страниц: ~1-2 мин

**Общее время:** 2-4 минуты ⚡

---

## 🆘 Нужна помощь?

Создайте issue с выводом команд:
```powershell
npm run build > build.log 2>&1
node test-makler-headers.js > test1.log 2>&1
node test-makler-puppeteer.js > test2.log 2>&1
```

Приложите файлы: `build.log`, `test1.log`, `test2.log`

---

## 🎉 Готово!

После выполнения 3 команд ваш парсер должен работать.

**Следующий шаг:** 
```powershell
npm run parse makler.md
```

Удачи! 🚀
