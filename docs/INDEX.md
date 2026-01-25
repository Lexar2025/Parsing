# 📚 Документация проекта Parsing

Добро пожаловать в документацию платформы для парсинга вакансий!

---

## 🚀 Быстрый старт

Новичок в проекте? Начни отсюда:

1. [README.md](../../README.md) - Обзор проекта
2. [🐳 Docker Setup](guides/DOCKER.md) - Запуск проекта через Docker
3. [🔌 API Reference](guides/API.md) - Использование API
4. [❓ FAQ](guides/FAQ.md) - Частые вопросы

---

## 📖 Руководства (Guides)

### Основные
- [🐳 **Docker Setup**](guides/DOCKER.md) - Полное руководство по Docker
- [🔌 **API Reference**](guides/API.md) - Документация REST API
- [💾 **Database**](guides/DATABASE.md) - Схема БД и миграции
- [❓ **FAQ**](guides/FAQ.md) - Частые вопросы и ответы

### Компоненты системы
- [🤖 **Parsers**](guides/PARSERS.md) - Как работают парсеры
- [⚙️ **Workers**](guides/WORKER.md) - Фоновые задачи (BullMQ)
- [📊 **Managers**](guides/MANAGERS_GUIDE.md) - VacancyManager и SubscriptionManager

### Продвинутые темы
- [🧠 **Logic Guide**](guides/NEW_LOGIC_GUIDE.md) - Логика работы системы
- [📝 **Synonyms Guide**](guides/SYNONYMS_GUIDE.md) - Семантический поиск
- [🔄 **Pagination Migration**](guides/PAGINATION_MIGRATION.md) - Новая система пагинации

---

## 🏗️ Архитектура

- [📐 **Architecture Overview**](architecture/ARCHITECTURE.md) - Общая архитектура
- [📊 **System Diagrams**](architecture/DIAGRAM.md) - Диаграммы системы
- [🎨 **Flow Diagrams**](architecture/) - HTML диаграммы процессов
  - [rabota.md Flow](architecture/rabota_md_flow.html)
  - [999.md Flow](architecture/999_md_flow.html)
  - [Project Architecture](architecture/project_architecture.html)

---

## 📦 Дополнительные ресурсы

- [📋 **CHANGELOG**](CHANGELOG.md) - История изменений
- [📊 **Project Status**](PROJECT_STATUS.md) - Текущее состояние проекта
- [🔧 **TypeScript Fixes**](../../TYPESCRIPT_FIXES_SUMMARY.md) - Технические детали исправлений

---

## 🎯 Быстрая навигация по темам

### Хочу начать работать с проектом
1. [Docker Setup](guides/DOCKER.md) - Запусти проект
2. [API Reference](guides/API.md) - Изучи API
3. [FAQ](guides/FAQ.md) - Реши проблемы

### Хочу понять как устроен проект
1. [Architecture](architecture/ARCHITECTURE.md) - Архитектура
2. [Logic Guide](guides/NEW_LOGIC_GUIDE.md) - Логика работы
3. [Managers Guide](guides/MANAGERS_GUIDE.md) - Менеджеры

### Хочу добавить новую функцию
1. [Architecture](architecture/ARCHITECTURE.md) - Понять структуру
2. [Database](guides/DATABASE.md) - Работа с БД
3. [API](guides/API.md) - Добавить эндпоинт

### Хочу создать парсер для нового сайта
1. [Parsers Guide](guides/PARSERS.md) - Как работают парсеры
2. [Architecture](architecture/ARCHITECTURE.md) - Где добавить код

### Проблемы и вопросы
1. [FAQ](guides/FAQ.md) - Частые вопросы
2. [Docker Troubleshooting](guides/DOCKER.md#-troubleshooting)
3. [API Errors](guides/API.md#ошибки)

---

## 📚 Документация по типам

### 🔰 Для начинающих
- README.md - Что это и зачем
- Docker Setup - Как запустить
- API Reference - Как использовать
- FAQ - Частые вопросы

### 👨‍💻 Для разработчиков
- Architecture - Как устроено
- Database - Как работать с БД
- Managers Guide - Бизнес-логика
- Parsers - Как парсить

### 🚀 Для DevOps
- Docker Setup - Deployment
- Database - Миграции и backups
- Worker - Фоновые задачи

### 📊 Для аналитики
- Project Status - Что готово
- CHANGELOG - Что изменилось
- API Reference - Какие данные доступны

---

## 🔍 Поиск по документации

### API
- Поиск вакансий: [API - GET /api/vacancies](guides/API.md#get-apivacancies)
- Подписки: [API - Subscriptions](guides/API.md#подписки-subscriptions)
- Словари: [API - Dictionaries](guides/API.md#словари-профессий)

### База данных
- Схема БД: [Database - Schema](guides/DATABASE.md#схема-базы-данных)
- Миграции: [Database - Migrations](guides/DATABASE.md#миграции)
- Индексы: [Database - Indexes](guides/DATABASE.md#индексы)

### Docker
- Запуск: [Docker - Quick Start](guides/DOCKER.md#-быстрый-старт)
- Команды: [Docker - Commands](guides/DOCKER.md#-основные-команды)
- Troubleshooting: [Docker - Troubleshooting](guides/DOCKER.md#-troubleshooting)

### Парсеры
- rabota.md: [Parsers - Rabota.md](guides/PARSERS.md#rabotamd)
- 999.md: [Parsers - 999.md](guides/PARSERS.md#999md)
- makler.md: [Parsers - Makler.md](guides/PARSERS.md#maklermd)

---

## 📝 Как пользоваться документацией

### Структура документов
Каждый документ содержит:
- **Заголовок** с emoji для быстрой идентификации
- **Содержание** (Table of Contents)
- **Примеры кода** с синтаксической подсветкой
- **Советы и предупреждения** (💡 Tips, ⚠️ Warnings)
- **Ссылки** на связанные документы

### Навигация
- Используй ссылки в начале каждого раздела
- Возвращайся к INDEX.md для общего обзора
- Используй поиск в редакторе (Ctrl+F) для быстрого поиска

### Обратная связь
Нашел ошибку или хочешь улучшить документацию?
- Открой Issue
- Создай Pull Request
- Напиши в комментариях

---

## 🎓 Рекомендуемый порядок изучения

### День 1: Знакомство
1. [README.md](../../README.md) - 10 мин
2. [Docker Setup](guides/DOCKER.md) - 15 мин
3. Запустить проект - 5 мин
4. [API Reference](guides/API.md) - 20 мин
5. Попробовать API - 10 мин

**Итого: ~1 час**

### День 2: Углубление
1. [Architecture](architecture/ARCHITECTURE.md) - 30 мин
2. [Logic Guide](guides/NEW_LOGIC_GUIDE.md) - 20 мин
3. [Managers Guide](guides/MANAGERS_GUIDE.md) - 30 мин
4. [Database](guides/DATABASE.md) - 20 мин

**Итого: ~1.5 часа**

### День 3: Практика
1. [Parsers](guides/PARSERS.md) - 30 мин
2. Изучить код парсера - 30 мин
3. [Worker](guides/WORKER.md) - 20 мин
4. Написать свой job - 40 мин

**Итого: ~2 часа**

---

## 🎯 Цели документации

1. ✅ **Быстрый старт** - новый разработчик может запустить проект за 15 минут
2. ✅ **Понятная архитектура** - диаграммы и описания помогают понять систему
3. ✅ **Примеры кода** - каждая функция имеет примеры использования
4. ✅ **Troubleshooting** - решения типичных проблем
5. ✅ **Актуальность** - документация обновляется вместе с кодом

---

## 📊 Статистика документации

- **Markdown файлов:** 15+
- **Страниц:** 200+
- **Примеров кода:** 100+
- **Диаграмм:** 5+
- **Последнее обновление:** 25 января 2026

---

## 🔗 Внешние ресурсы

### Технологии
- [Node.js Documentation](https://nodejs.org/docs/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Fastify Documentation](https://fastify.dev/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [BullMQ Documentation](https://docs.bullmq.io/)
- [Docker Documentation](https://docs.docker.com/)

### Инструменты
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Redis Documentation](https://redis.io/documentation)
- [Puppeteer Documentation](https://pptr.dev/)

---

**Приятного изучения! 📚**

Если у тебя есть вопросы - начни с [FAQ](guides/FAQ.md) или открой Issue в репозитории.

---

📅 **Последнее обновление:** 25 января 2026  
📖 **Версия документации:** 2.1  
✅ **Статус:** Актуально
