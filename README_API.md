# 🚀 Vacancy Parser & API

Система парсинга вакансий с молдавских сайтов (rabota.md, 999.md, makler.md) с API и фоновым worker'ом.

## 📋 Структура проекта

```
/src
  /api              # Fastify API сервер
    /routes         # API эндпоинты
    /services       # Бизнес-логика
    server.ts       # Главный файл API
  /worker           # BullMQ worker для фоновых задач
    /jobs           # Задачи (парсинг, уведомления)
    worker.ts       # Главный файл worker
  /db               # Prisma клиент
  /parsers          # Парсеры вакансий
    /adapters       # Адаптеры для унификации данных
  /shared           # Общие утилиты
    /config         # Конфигурация
  /types            # TypeScript типы
```

## 🛠️ Установка

### 1. Установите зависимости

```bash
npm install
```

### 2. Настройте .env файл

```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/vacancy?schema=public"

# API
API_PORT=3000
API_HOST=0.0.0.0

# Redis (для BullMQ Worker)
REDIS_HOST=localhost
REDIS_PORT=6379

# Worker
WORKER_CONCURRENCY=3
PARSE_INTERVAL=21600000  # 6 часов в мс
NOTIFY_INTERVAL=7200000  # 2 часа в мс

# Development
NODE_ENV=development
```

### 3. Создайте базу данных

В pgAdmin создайте базу `vacancy` (или как указано в DATABASE_URL).

### 4. Примените миграции

```bash
npm run db:migrate
```

## 🚀 Запуск

### Development режим (с hot reload)

```bash
# Запустить API сервер
npm run dev:api

# Запустить Worker (в отдельном терминале)
npm run dev:worker
```

### Production режим

```bash
# Собрать проект
npm run build

# Запустить API
npm run start:api

# Запустить Worker
npm run start:worker
```

## 📚 API Эндпоинты

### Health Check
```
GET /health
```

### Получить вакансии
```
GET /api/vacancies

Query параметры:
  - keywords: строка через запятую (например: "javascript,node.js")
  - locations: локации через запятую
  - salaryMin: минимальная зарплата
  - experience: опыт работы (no_experience, between_1_and_3, etc)
  - schedule: график (remote, office, hybrid)
  - sources: источники (rabota.md, 999.md, makler.md)
  - limit: количество результатов (по умолчанию 50)
  - offset: смещение для пагинации

Пример:
GET /api/vacancies?keywords=javascript&salaryMin=50000&schedule=remote&limit=20
```

### Получить конкретную вакансию
```
GET /api/vacancies/:id
```

### Статистика
```
GET /api/vacancies/stats
```

## 🔧 Доступные команды

```bash
# Development
npm run dev:api          # Запустить API в dev режиме
npm run dev:worker       # Запустить Worker в dev режиме

# Production
npm run build            # Собрать проект
npm run start:api        # Запустить API
npm run start:worker     # Запустить Worker

# Database
npm run db:migrate       # Применить миграции
npm run db:studio        # Открыть Prisma Studio
npm run db:generate      # Сгенерировать Prisma Client

# Testing
npm test                 # Запустить тесты
npm run test:watch       # Запустить тесты в watch режиме

# Code quality
npm run lint             # Проверить код
npm run prettier         # Форматировать код
```

## 📊 База данных

Схема включает:
- **User** - пользователи
- **UserSettings** - настройки пользователей
- **Subscription** - подписки на вакансии
- **Vacancy** - вакансии (унифицированный формат)
- **ParseLog** - логи парсинга

Посмотреть данные в удобном интерфейсе:
```bash
npm run db:studio
```

## 🔄 Worker (фоновые задачи)

Worker автоматически:
- Парсит вакансии каждые 6 часов (настраивается в .env)
- Сохраняет результаты в БД
- Логирует все операции
- Обрабатывает ошибки с retry

## 🎯 Следующие шаги

1. ✅ Настроить базу данных
2. ✅ Создать API
3. ✅ Создать Worker для парсинга
4. 🔲 Установить Redis для BullMQ
5. 🔲 Создать Telegram бота
6. 🔲 Добавить систему подписок
7. 🔲 Добавить уведомления

## 📝 Примечания

- Для работы Worker'а нужен **Redis**. Установите его или используйте Docker:
  ```bash
  docker run -d -p 6379:6379 redis:alpine
  ```

- API работает на порту 3000 (настраивается в .env)

- Worker запускается отдельно от API для масштабируемости

## 🐛 Troubleshooting

**Ошибка подключения к БД:**
- Проверьте DATABASE_URL в .env
- Убедитесь что PostgreSQL запущен
- Проверьте что база данных создана

**Ошибка подключения к Redis:**
- Убедитесь что Redis запущен
- Проверьте REDIS_HOST и REDIS_PORT в .env

**Worker не запускается:**
- Сначала запустите Redis
- Проверьте логи на ошибки
