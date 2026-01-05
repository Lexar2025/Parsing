# ⚡ Quick Start Guide

Быстрый гайд по запуску всей системы за 10 минут.

---

## ✅ Checklist

- [ ] Node.js >= 22.11 установлен
- [ ] PostgreSQL установлен и запущен
- [ ] Redis 6.0+ установлен (для Worker)
- [ ] Git репозиторий склонирован

---

## 🚀 Запуск за 5 шагов

### 1️⃣ Установка зависимостей

```bash
npm install
```

### 2️⃣ Настройка .env

```env
# Database
DATABASE_URL="postgresql://postgres:твой_пароль@localhost:5432/vacancy?schema=public"

# API
API_PORT=3000
API_HOST=0.0.0.0

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Environment
NODE_ENV=development
```

### 3️⃣ Создание БД и миграции

```bash
# В pgAdmin создай базу данных 'vacancy'

# Примени миграции
npm run db:migrate
```

### 4️⃣ Тест системы

```bash
npm run test:system
```

Должно пройти:
- ✅ Подключение к БД
- ✅ Парсинг вакансий
- ✅ Сохранение в БД
- ✅ Поиск через API

### 5️⃣ Запуск

```bash
# Терминал 1: API Server
npm run dev:api

# Терминал 2: Worker (опционально, требует Redis)
npm run dev:worker
```

🎉 **Готово!**

- API: http://localhost:3000
- Health: http://localhost:3000/health
- Vacancies: http://localhost:3000/api/vacancies

---

## 🔴 Redis для Worker (опционально)

### Через Docker (проще всего)

```bash
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

### Проверка

```bash
docker ps | grep redis
# Должен быть запущен
```

📖 Подробнее: [docs/REDIS_SETUP.md](./docs/REDIS_SETUP.md)

---

## 📊 Проверь что работает

### 1. Health Check

```bash
curl http://localhost:3000/health
```

Ответ:
```json
{
  "status": "ok",
  "timestamp": "2024-01-05T12:00:00.000Z"
}
```

### 2. Получи вакансии

```bash
curl "http://localhost:3000/api/vacancies?keywords=nodejs&limit=5"
```

### 3. Статистика

```bash
curl http://localhost:3000/api/vacancies/stats
```

### 4. Prisma Studio (GUI для БД)

```bash
npm run db:studio
```

Откроется: http://localhost:5555

---

## 🐛 Проблемы?

### Ошибка подключения к БД

```
Error: Can't connect to PostgreSQL
```

**Решение:**
- Проверь `DATABASE_URL` в `.env`
- Убедись что PostgreSQL запущен
- Проверь что база `vacancy` создана

### Worker не запускается

```
Error: ECONNREFUSED 127.0.0.1:6379
```

**Решение:**
- Установи и запусти Redis (см. выше)
- Или пропусти Worker (API работает и без него)

### Порт 3000 занят

```env
# В .env измени порт
API_PORT=3001
```

---

## 🎯 Что дальше?

1. ✅ База работает
2. ✅ API работает
3. ✅ Парсеры работают
4. 🔲 Создай Telegram бота → [docs/BOT_INTEGRATION.md](./docs/BOT_INTEGRATION.md)

---

## 📚 Документация

| Раздел | Ссылка |
|--------|--------|
| Архитектура | [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) |
| Парсеры | [docs/PARSERS.md](./docs/PARSERS.md) |
| API | [docs/API.md](./docs/API.md) |
| Worker | [docs/WORKER.md](./docs/WORKER.md) |
| База данных | [docs/DATABASE.md](./docs/DATABASE.md) |
| Redis Setup | [docs/REDIS_SETUP.md](./docs/REDIS_SETUP.md) |
| Bot Integration | [docs/BOT_INTEGRATION.md](./docs/BOT_INTEGRATION.md) |

---

## 💡 Полезные команды

```bash
# Development
npm run dev:api          # API сервер
npm run dev:worker       # Worker
npm run test:system      # Тест системы

# Database
npm run db:migrate       # Применить миграции
npm run db:studio        # GUI для БД
npm run db:generate      # Обновить Prisma Client

# Production
npm run build            # Собрать
npm run start:api        # API
npm run start:worker     # Worker
```

---

## 🎊 Успехов!

Если что-то не работает - смотри полную документацию в `/docs` или создай issue!
