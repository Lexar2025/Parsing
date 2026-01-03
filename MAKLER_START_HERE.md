# 🆕 НОВЫЙ ПАРСЕР: Makler.md (Приднестровье)

## ⚡ Быстрый запуск

```bash
# 1. Собрать проект
npm run build

# 2. Запустить парсер
npm run parse makler.md Программисты

# 3. Проверить результаты
npm run manage stats makler_md
```

## 📋 Что это?

Новый парсер для сайта **makler.md** - портала вакансий Приднестровья.

### Особенности
- ⚡ **Быстрый** - HTTP запросы (не браузер)
- 🎯 **Точный** - 90+ профессий с ID фильтрами
- 🧠 **Умный** - автопоиск по частичному совпадению
- 💾 **Кэширующий** - TTL 24 часа
- 🔄 **Регистронезависимый** - "ПОВАР" = "повар"

## 📚 Документация

| Файл | Описание |
|------|----------|
| [MAKLER_README.md](MAKLER_README.md) | Быстрый обзор и тест |
| [MAKLER_INSTRUCTIONS.md](MAKLER_INSTRUCTIONS.md) | Пошаговая инструкция |
| [MAKLER_EXAMPLES.md](MAKLER_EXAMPLES.md) | Примеры работы |
| [docs/MAKLER_MD_GUIDE.md](docs/MAKLER_MD_GUIDE.md) | Полное руководство |
| [docs/MAKLER_PROFESSIONS.md](docs/MAKLER_PROFESSIONS.md) | Словарь профессий |
| [docs/MAKLER_QUICK_START.md](docs/MAKLER_QUICK_START.md) | Быстрый старт |
| [MAKLER_CHANGELOG.md](MAKLER_CHANGELOG.md) | Полный список изменений |

## 🎯 Популярные профессии

```bash
# IT
npm run parse makler.md Программисты
npm run parse makler.md Backend
npm run parse makler.md Frontend

# Строительство
npm run parse makler.md Электрик
npm run parse makler.md Сантехник
npm run parse makler.md Грузчики

# Общепит
npm run parse makler.md Повар
npm run parse makler.md Официанты

# Торговля
npm run parse makler.md Продавцы
npm run parse makler.md Кассиры

# Медицина
npm run parse makler.md "Медицинская сестра"
npm run parse makler.md Фармацевт

# Все вакансии
npm run parse makler.md
```

## 📊 90+ категорий профессий

- **IT и Технологии** (8)
- **Строительство** (14)
- **Медицина** (9)
- **Общепит** (5)
- **Торговля** (7)
- **Дизайн и Креатив** (8)
- **Логистика** (5)
- **Бизнес и Управление** (6)
- **И еще 28+ категорий**

Полный список → [docs/MAKLER_PROFESSIONS.md](docs/MAKLER_PROFESSIONS.md)

## 🔍 Что парсится?

✅ Заголовок вакансии  
✅ Описание  
✅ Локация (Тирасполь, Бендеры, и т.д.)  
✅ Контактный телефон  
✅ Дата публикации  
✅ Полная ссылка  

## 📁 Результаты

```json
// vacancies_makler_md.json
{
  "id": "588820",
  "title": "Консультант в магазин",
  "location": "Тирасполь",
  "contactPerson": "373-77-861032",
  "publishedAt": "2026-01-03T05:58:00.000Z",
  "url": "https://makler.md/ru/job/job-offers/an/588820",
  "source": "makler.md"
}
```

## 🛠️ Управление вакансиями

```bash
# Статистика
npm run manage stats makler_md

# Активные вакансии
npm run manage active makler_md

# Новые за 24 часа
npm run manage new makler_md

# Очистка старых
npm run manage cleanup makler_md
```

## 🚀 Интеграция

Парсер полностью интегрирован в существующую систему:

- ✅ Использует VacancyManager
- ✅ Поддерживает кэширование
- ✅ Работает с общими утилитами
- ✅ Совместим с другими парсерами

## 📦 Файлы проекта

```
src/parsers/maklerMd.ts       - Парсер
src/config/parsers.ts         - Конфигурация
cache/makler-md/              - Кэш
vacancies_makler_md.json      - Результаты
```

## ⚙️ Конфигурация

```typescript
'makler.md': {
  baseUrl: 'https://makler.md',
  defaultCategory: 'Программисты',
  maxPages: 10,
  delay: 1000,
  concurrency: 3,
  cacheEnabled: true,
}
```

## 🔗 Полезные ссылки

- [Сайт Makler.md](https://makler.md/transnistria/job/job-offers)
- [Главная документация проекта](docs/README.md)
- [Полное руководство по Makler.md](docs/MAKLER_MD_GUIDE.md)

## ❓ Нужна помощь?

1. Начните с → [MAKLER_README.md](MAKLER_README.md)
2. Следуйте → [MAKLER_INSTRUCTIONS.md](MAKLER_INSTRUCTIONS.md)
3. Смотрите примеры → [MAKLER_EXAMPLES.md](MAKLER_EXAMPLES.md)
4. Изучайте руководство → [docs/MAKLER_MD_GUIDE.md](docs/MAKLER_MD_GUIDE.md)

## 🎓 Следующие шаги

1. ✅ Соберите проект: `npm run build`
2. ✅ Запустите тест: `npm run parse makler.md Программисты`
3. ✅ Проверьте результаты: `npm run manage stats makler_md`
4. ✅ Изучите документацию в папке `docs/`

---

**Приднестровье** 🇲🇩 | **Версия** v0.4.0 | **Январь 2026**

**✅ ГОТОВО К ИСПОЛЬЗОВАНИЮ**
