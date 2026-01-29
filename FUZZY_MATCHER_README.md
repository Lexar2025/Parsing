# 🎯 Fuzzy Matcher Integration - Quick Start

## Что это?

Улучшение извлечения данных из вакансий с помощью библиотеки `fuse.js` для нечеткого сопоставления строк.

## ⚡ Быстрый старт

```bash
# 1. Установить библиотеку
npm install fuse.js

# 2. Пересобрать проект
npm run build

# 3. Запустить парсинг
npm run parse
```

## ✨ Что улучшилось?

### Навыки (Skills)
- **До:** `[]` (не распознал "JS", "реакт", "python")
- **После:** `["JavaScript", "React", "Python"]` ✅

### Опыт (Experience)
- **До:** `undefined` (не распознал "Junior специалист")
- **После:** `"between_1_and_3"` ✅

### Тип занятости (Employment)
- **До:** `undefined` (не распознал "full time")
- **После:** `"full"` ✅

### Валюта (Currency)
- **До:** `undefined` (не распознал "леев")
- **После:** `"MDL"` ✅

## 📊 100+ технологий с синонимами

### Языки программирования
JavaScript, TypeScript, Python, Java, C#, C++, PHP, Ruby, Go, Rust, Swift, Kotlin, Scala, R, Dart, и др.

### Frontend
React, Vue.js, Angular, Svelte, Next.js, Nuxt.js, Webpack, Vite, Tailwind CSS, Bootstrap, Material-UI, и др.

### Backend
Node.js, Express, NestJS, Django, Flask, FastAPI, Spring, Laravel, Symfony, Ruby on Rails, ASP.NET, и др.

### Базы данных
SQL, MySQL, PostgreSQL, MongoDB, Redis, Elasticsearch, SQLite, MariaDB, Oracle, MS SQL, и др.

### DevOps
Docker, Kubernetes, Jenkins, GitLab CI, GitHub Actions, Terraform, Ansible, AWS, Azure, Google Cloud, и др.

### Остальное
Git, Jira, Agile, Scrum, GraphQL, REST API, Prisma, Sequelize, TypeORM, и многое другое...

## 📁 Файлы проекта

```
src/
├── utils/
│   └── fuzzy-matcher.ts          # ⭐ НОВЫЙ - Модуль с синонимами
├── parsers/
│   └── adapters/
│       ├── base.adapter.ts        # ✏️ ОБНОВЛЕН - Добавлены методы
│       ├── rabota.adapter.ts      # ✏️ ОБНОВЛЕН - Использует fuzzy-matcher
│       ├── 999.adapter.ts         # ✏️ ОБНОВЛЕН - Использует fuzzy-matcher
│       └── makler.adapter.ts      # ✏️ ОБНОВЛЕН - Использует fuzzy-matcher
```

## 🔍 Проверка результатов

```sql
-- Сколько вакансий получили навыки?
SELECT 
  source,
  COUNT(*) as total,
  COUNT(CASE WHEN array_length(skills, 1) > 0 THEN 1 END) as with_skills
FROM "Vacancy"
GROUP BY source;

-- Примеры нормализации
SELECT 
  title,
  skills,
  experience,
  employment,
  schedule
FROM "Vacancy"
LIMIT 10;
```

## 🎛️ Настройка (опционально)

### Изменить строгость сопоставления

В `src/utils/fuzzy-matcher.ts`:

```typescript
// Строже (меньше ложных срабатываний)
threshold: 0.2

// Мягче (больше совпадений)
threshold: 0.5
```

### Добавить новые синонимы

```typescript
// В src/utils/fuzzy-matcher.ts
const SKILL_SYNONYMS: SkillEntry[] = [
  // ... существующие ...
  {
    normalized: 'Ваша технология',
    synonyms: ['синоним1', 'синоним2', 'синоним3']
  },
];
```

## 📚 Полная документация

См. `FUZZY_MATCHER_SETUP.md` для подробной информации.

## 🆘 Проблемы?

### "Cannot find module 'fuse.js'"
```bash
npm install fuse.js
npm run build
```

### Мало совпадений?
1. Увеличьте `threshold` в fuzzy-matcher
2. Добавьте больше синонимов

### Много ложных срабатываний?
1. Уменьшите `threshold`
2. Проверьте список синонимов

---

**Готово! 🚀** Теперь парсер значительно лучше распознает навыки и другие поля из вакансий.
