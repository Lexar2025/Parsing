# Инструкция по запуску парсера Makler.md

## 1️⃣ Убедитесь что проект собран

```bash
npm run build
```

Если увидите ошибки, убедитесь что все зависимости установлены:

```bash
npm install
```

## 2️⃣ Проверьте что файлы созданы

После сборки должны появиться файлы в папке `build/`:

```
build/
  src/
    parsers/
      maklerMd.js        ✅ Должен быть создан
      rabotaMd.js
      nineNineNineMd.js
    parse.js
    config/
      parsers.js         ✅ Обновлен
    types/
      vacancy.js         ✅ Обновлен
```

## 3️⃣ Запустите тестовый парсинг

Попробуйте самые популярные профессии:

```bash
# Программисты (IT)
npm run parse makler.md Программисты

# Повар (Общепит)
npm run parse makler.md Повар

# Продавцы (Торговля)
npm run parse makler.md Продавцы

# Грузчики (Логистика)
npm run parse makler.md Грузчики

# Все вакансии (без фильтра)
npm run parse makler.md
```

## 4️⃣ Проверьте результаты

### Файл с результатами
```bash
# Windows
type vacancies_makler_md.json

# Linux/Mac
cat vacancies_makler_md.json
```

### Статистика
```bash
npm run manage stats makler_md
```

Вы должны увидеть что-то вроде:

```
📈 Общая статистика:
   Всего в базе: 45
   ✅ Активных: 45
   ❌ Неактивных: 0
   🆕 Новых (за 24ч): 45

📍 По источникам:
   makler.md: 45

📍 По локациям (активные):
   Тирасполь: 30
   Бендеры: 10
   Рыбница: 5
```

## 5️⃣ Примеры других профессий

```bash
# IT
npm run parse makler.md Backend
npm run parse makler.md Frontend
npm run parse makler.md "Системные администраторы"

# Строительство
npm run parse makler.md Электрик
npm run parse makler.md Сантехник
npm run parse makler.md Строитель

# Медицина
npm run parse makler.md "Медицинская сестра"
npm run parse makler.md Фармацевт
npm run parse makler.md Ветеринар

# Дизайн
npm run parse makler.md "UX/UI"
npm run parse makler.md "Графический дизайн"
npm run parse makler.md SMM
```

## 📋 Полный список доступных профессий

См. файл: `docs/MAKLER_PROFESSIONS.md`

Или запустите help:
```bash
npm run parse --help
```

## ⚠️ Возможные проблемы

### Проблема: "Cannot find module"

**Решение:**
```bash
npm run clean
npm run build
```

### Проблема: "Unknown parser: makler.md"

**Решение:** Убедитесь что проект собран:
```bash
npm run build
```

### Проблема: Профессия не найдена

**Решение:** Проверьте написание или используйте частичное совпадение:
```bash
# Вместо
npm run parse makler.md "Програмисты"  # ❌

# Используйте
npm run parse makler.md Программисты    # ✅

# Или частичное совпадение
npm run parse makler.md програм          # ✅
```

### Проблема: Пустые результаты

**Причины:**
1. На сайте нет вакансий по этой профессии
2. Неправильное название профессии
3. Проблемы с сетью

**Решение:**
```bash
# Попробуйте без фильтра
npm run parse makler.md

# Или увеличьте количество страниц в config
```

## 🔍 Отладка

### Проверка URL парсера

Парсер выводит URL каждой страницы. Проверьте что URL правильный:

```
📄 Парсинг страницы 1/10...
   URL: https://makler.md/transnistria/job/job-offers?list&list=detail&field_446[]=2869
```

Скопируйте этот URL и откройте в браузере. Должны показаться вакансии.

### Проверка словаря профессий

```typescript
// src/parsers/maklerMd.ts
export const MAKLER_PROFESSIONS: Record<string, number> = {
  'Программисты': 2869,  // ✅ Есть
  'Backend': 2870,        // ✅ Есть
  // ...
};
```

### Ручное тестирование URL

Откройте в браузере:

```
# Программисты
https://makler.md/transnistria/job/job-offers?list&list=detail&field_446[]=2869

# Повар
https://makler.md/transnistria/job/job-offers?list&list=detail&field_446[]=2921

# Все вакансии
https://makler.md/transnistria/job/job-offers?list&list=detail
```

## 📊 Понимание вывода

### Успешный парсинг
```
📄 Парсинг страницы 1/10...
   URL: https://...
   ✅ Найдено: 25 (новых: 25, дубликатов: 0)
   📊 Всего уникальных: 25
```

### Пустая страница
```
📄 Парсинг страницы 5/10...
   ⚠️  Страница 5 пуста
   ⛔ Две пустые страницы подряд - завершаем парсинг
```

### Дубликаты
```
📄 Парсинг страницы 3/10...
   ✅ Найдено: 20 (новых: 15, дубликатов: 5)
```

## 🎯 Следующие шаги

1. ✅ Запустите тестовый парсинг
2. ✅ Проверьте результаты в JSON
3. ✅ Изучите статистику через manage
4. ✅ Попробуйте разные профессии
5. ✅ Настройте автоматический запуск (cron/задачи)

## 📚 Дополнительные ресурсы

- **Быстрый старт:** `docs/MAKLER_QUICK_START.md`
- **Полное руководство:** `docs/MAKLER_MD_GUIDE.md`
- **Список профессий:** `docs/MAKLER_PROFESSIONS.md`
- **Главная документация:** `docs/README.md`

---

**Успешного парсинга!** 🚀
