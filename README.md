# 🔍 Vacancy Parser Platform

> Платформа для автоматизированного парсинга вакансий с сайтов **rabota.md**, **999.md** и **makler.md** с поддержкой семантического поиска, подписок и уведомлений.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20-green)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-ready-blue)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

---

## ✨ Особенности

- 🤖 **Парсинг вакансий** с 3 основных источников Молдовы
- 🧠 **Семантический поиск** - находит похожие профессии автоматически
- 📊 **REST API** с умной пагинацией и кэшированием
- 🔄 **Фоновые задачи** - автоматический парсинг и обновление
- 🔔 **Система подписок** с уведомлениями о новых вакансиях
- ⚡ **Быстрый поиск** - кэширование в Redis (10-20мс)
- 🐳 **Docker-ready** - запуск одной командой
- 💪 **TypeScript** - 100% строгая типизация, 0 использований `any`

---

## 🚀 Быстрый старт

### С Docker (рекомендуется)

```bash
# Windows
.\scripts\docker-start.ps1

# Linux/Mac
docker-compose up -d
```

**Готово!** Все сервисы запущены.

**Доступ:**
- 🌐 API: http://localhost:3000
- ✅ Health: http://localhost:3000/health
- 💾 Adminer (БД): http://localhost:8080
- 🔴 Redis UI: http://localhost:8081

### Без Docker (локальная разработка)

```bash
# 1. Установить зависимости
npm install

# 2. Настроить окружение
cp .env.example .env

# 3. Запустить PostgreSQL и Redis
docker-compose up -d postgres redis

# 4. Применить миграции
npx prisma migrate dev

# 5. Запустить в dev режиме
npm run dev:api     # Терминал 1 - API
npm run dev:worker  # Терминал 2 - Worker
```

---

## 📖 Документация

### 🎯 Быстрые ссылки
- [🐳 Docker Setup](docs/guides/DOCKER.md) - Запуск и настройка Docker
- [🔌 API Reference](docs/guides/API.md) - Полная документация API
- [❓ FAQ](docs/guides/FAQ.md) - Частые вопросы и ответы

### 📚 Полная документация
- [📋 Индекс документации](docs/INDEX.md) - Навигация по всей документации
- [📊 Project Status](docs/PROJECT_STATUS.md) - Что реализовано
- [📝 Changelog](docs/CHANGELOG.md) - История изменений

### 🏗️ Для разработчиков
- [🏛️ Architecture](docs/architecture/ARCHITECTURE.md) - Архитектура системы
- [💾 Database](docs/guides/DATABASE.md) - Схема БД и миграции
- [🤖 Parsers](docs/guides/PARSERS.md) - Как работают парсеры
- [⚙️ Workers](docs/guides/WORKER.md) - Фоновые задачи
- [📊 Managers](docs/guides/MANAGERS_GUIDE.md) - Бизнес-логика

---

## 💡 Примеры использования

### Поиск вакансий

```bash
# Простой поиск
curl "http://localhost:3000/api/vacancies?keywords=developer&limit=5"

# С пагинацией и кэшированием
curl "http://localhost:3000/api/vacancies?keywords=nodejs&page=1&limit=10&userId=user123"

# Семантический поиск
curl "http://localhost:3000/api/vacancies?keywords=программист&useSemanticSearch=true"
```

### Ответ API

```json
{
  "data": [
    {
      "id": "123",
      "title": "Node.js Developer",
      "company": "Tech Company",
      "salary": "2000 - 3000 EUR",
      "location": "Chisinau",
      "url": "https://rabota.md/...",
      "source": "rabota.md"
    }
  ],
  "meta": {
    "total": 150,
    "totalPages": 15,
    "currentPage": 1,
    "limit": 10,
    "source": "cache-paginated"
  }
}
```

---

## 🛠️ Технологический стек

### Backend
- **Runtime**: Node.js 20
- **Language**: TypeScript 5.7
- **Framework**: Fastify 5.x
- **ORM**: Prisma
- **Validation**: TypeScript strict mode

### Infrastructure
- **Database**: PostgreSQL 16
- **Cache**: Redis 7
- **Queue**: BullMQ
- **Container**: Docker + Docker Compose

### Parsing
- **Tools**: Puppeteer, JSDOM, Cheerio
- **Concurrency**: p-limit
- **Rate Limiting**: Built-in

---

## 📁 Структура проекта

```
parsing/
├── src/
│   ├── api/              # REST API (Fastify)
│   │   ├── routes/       # API endpoints
│   │   ├── services/     # Business logic
│   │   └── server.ts     # Server setup
│   ├── worker/           # Background jobs (BullMQ)
│   │   ├── jobs/         # Job processors
│   │   └── worker.ts     # Worker process
│   ├── parsers/          # Site parsers
│   │   ├── rabotaMd.ts
│   │   ├── nineNineNineMd.ts
│   │   └── maklerMd.ts
│   ├── shared/           # Shared code
│   │   ├── managers/     # VacancyManager, SubscriptionManager
│   │   └── config/       # Configuration
│   ├── db/               # Prisma client
│   └── types/            # TypeScript types
├── prisma/               # Database schema & migrations
├── docs/                 # Documentation
├── scripts/              # Utility scripts
└── docker-compose.yml    # Docker configuration
```

---

## 🔧 Основные команды

### Development
```bash
npm run dev:api          # Запуск API в dev режиме
npm run dev:worker       # Запуск Worker в dev режиме
npm run lint             # Проверка кода ESLint
```

### Build
```bash
npm run build            # Компиляция TypeScript
npm start                # Запуск API (после build)
npm run start:worker     # Запуск Worker (после build)
```

### Database
```bash
npm run db:migrate       # Применить миграции
npm run db:studio        # Открыть Prisma Studio
npm run db:generate      # Генерировать Prisma Client
```

### Docker
```bash
docker-compose up -d            # Запустить все сервисы
docker-compose down             # Остановить все
docker-compose logs -f          # Посмотреть логи
docker-compose ps               # Статус контейнеров
docker-compose restart app      # Перезапустить API
```

---

## 🎯 Возможности API

### Вакансии
- ✅ Поиск с фильтрацией (keywords, locations, salary, experience, schedule)
- ✅ Умная пагинация по page (не offset)
- ✅ Семантический поиск через словари
- ✅ Кэширование результатов (10-20мс)
- ✅ Детали вакансии по ID
- ✅ Статистика по источникам
- ✅ Принудительный парсинг

### Подписки
- ✅ Создание/обновление/удаление подписок
- ✅ Получение активных подписок
- ✅ Автоматическая проверка новых вакансий
- ✅ Настройка фильтров

### Словари профессий
- ✅ Семантический поиск профессий
- ✅ Статистика по словарям
- ✅ Обновление словарей

### Кэш
- ✅ Персональные кэши для пользователей
- ✅ Очистка кэша
- ✅ Статистика кэша

---

## 🚀 Production Deployment

### Docker Deployment

```bash
# 1. Настроить production .env
cp .env.example .env
# Изменить пароли и настройки

# 2. Запустить
docker-compose up -d

# 3. Проверить health
curl http://your-domain.com/health
```

### Рекомендации
- ✅ Используй HTTPS (nginx/traefik)
- ✅ Настрой backups БД
- ✅ Включи мониторинг
- ✅ Настрой логирование
- ✅ Ограничь ресурсы контейнеров

Подробнее в [Docker Guide](docs/guides/DOCKER.md#-production-deployment).

---

## 📊 Статус проекта

✅ **Production Ready**

- [x] Парсеры для всех источников (rabota.md, 999.md, makler.md)
- [x] REST API с полным функционалом
- [x] Система подписок
- [x] Семантический поиск
- [x] Docker инфраструктура
- [x] Кэширование и пагинация
- [x] Фоновые задачи
- [x] 100% TypeScript типизация
- [x] Полная документация
- [ ] Telegram Bot (в планах)
- [ ] Web UI (в планах)

Детали в [Project Status](docs/PROJECT_STATUS.md).

---

## 🤝 Для разработчиков

### Установка для разработки

```bash
# 1. Клонировать
git clone <repo-url>
cd Parsing

# 2. Установить зависимости
npm install

# 3. Настроить .env
cp .env.example .env

# 4. Запустить БД через Docker
docker-compose up -d postgres redis

# 5. Применить миграции
npx prisma migrate dev

# 6. Запустить dev серверы
npm run dev:api     # Terminal 1
npm run dev:worker  # Terminal 2
```

### Рекомендуемые расширения для VS Code

- ESLint
- Prettier
- Docker
- Prisma

### Качество кода

- ✅ TypeScript со строгой типизацией
- ✅ ESLint для проверки кода
- ✅ Prettier для форматирования
- ✅ DRY принцип (без дублирования)
- ✅ KISS принцип (простой код)
- ✅ Type guards для безопасности

---

## 📝 Лицензия

Apache-2.0 License - see [LICENSE](LICENSE) file for details.

---

## 🔗 Полезные ссылки

- [📚 Полная документация](docs/INDEX.md)
- [🐳 Docker Guide](docs/guides/DOCKER.md)
- [🔌 API Reference](docs/guides/API.md)
- [❓ FAQ](docs/guides/FAQ.md)
- [📝 Changelog](docs/CHANGELOG.md)

---

## 💬 Поддержка

Нужна помощь? 
1. Проверь [FAQ](docs/guides/FAQ.md)
2. Посмотри [Documentation](docs/INDEX.md)
3. Открой Issue в репозитории

---

<div align="center">

**Сделано с ❤️ для автоматизации поиска работы в Молдове**

[Документация](docs/INDEX.md) • [API](docs/guides/API.md) • [Docker](docs/guides/DOCKER.md) • [FAQ](docs/guides/FAQ.md)

</div>

---

📅 **Последнее обновление:** 25 января 2026  
🔖 **Версия:** 2.1.0  
🐳 **Docker:** Ready ✅  
📚 **Документация:** Complete ✅
