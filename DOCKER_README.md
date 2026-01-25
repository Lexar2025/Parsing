# 🐳 Docker Setup для Parsing проекта

Полная dockerизация проекта с PostgreSQL, Redis, API и Worker.

---

## 📋 Содержание

- [Требования](#требования)
- [Быстрый старт](#быстрый-старт)
- [Структура проекта](#структура-проекта)
- [Конфигурация](#конфигурация)
- [Команды](#команды)
- [Сервисы](#сервисы)
- [Troubleshooting](#troubleshooting)

---

## 🔧 Требования

- Docker Desktop 20.10+
- Docker Compose 2.0+
- 4GB свободной RAM
- 10GB свободного места на диске

### Установка Docker

**Windows:**
1. Скачай [Docker Desktop](https://www.docker.com/products/docker-desktop/)
2. Установи и запусти Docker Desktop
3. Убедись что Docker работает: `docker --version`

**Linux:**
```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

---

## 🚀 Быстрый старт

### Вариант 1: Автоматический (рекомендуется)

**Windows (PowerShell):**
```powershell
.\scripts\docker-start.ps1
```

**Linux/Mac:**
```bash
chmod +x scripts/docker-start.sh
./scripts/docker-start.sh
```

### Вариант 2: Makefile (если установлен make)

```bash
make dev    # Запуск в dev режиме с Adminer и Redis UI
# или
make start  # Запуск в production режиме
```

### Вариант 3: Вручную

```bash
# 1. Создай .env файл
cp .env.docker .env

# 2. Запусти контейнеры
docker-compose up -d

# 3. Проверь статус
docker-compose ps

# 4. Смотри логи
docker-compose logs -f
```

---

## 📁 Структура проекта

```
Parsing/
├── docker-compose.yml      # Конфигурация всех сервисов
├── Dockerfile              # Образ для app и worker
├── .dockerignore           # Исключения при сборке
├── .env.docker             # Пример переменных окружения
├── .env                    # Твои настройки (создай из .env.docker)
├── Makefile                # Удобные команды
└── scripts/
    ├── docker-start.sh     # Скрипт запуска (Linux/Mac)
    ├── docker-start.ps1    # Скрипт запуска (Windows)
    └── init-db.sh          # Инициализация PostgreSQL
```

---

## ⚙️ Конфигурация

### Создание .env файла

```bash
cp .env.docker .env
```

### Основные параметры:

```env
# PostgreSQL
POSTGRES_DB=parsing
POSTGRES_USER=parser
POSTGRES_PASSWORD=parser123
POSTGRES_PORT=5432

# Redis
REDIS_PASSWORD=redis123
REDIS_PORT=6379

# API
PORT=3000

# Worker
WORKER_CONCURRENCY=2
```

### Изменение портов

Если порты 3000, 5432 или 6379 заняты, измени в `.env`:

```env
PORT=3001           # Вместо 3000
POSTGRES_PORT=5433  # Вместо 5432
REDIS_PORT=6380     # Вместо 6379
```

---

## 🎮 Команды

### Основные команды

```bash
# Запуск
docker-compose up -d

# Остановка
docker-compose down

# Перезапуск
docker-compose restart

# Логи
docker-compose logs -f

# Статус
docker-compose ps
```

### С Makefile

```bash
make help       # Показать все команды
make start      # Запустить
make stop       # Остановить
make logs       # Логи
make restart    # Перезапустить
make dev        # Dev режим с UI инструментами
```

### Управление БД

```bash
# Применить миграции
docker-compose exec app npx prisma migrate deploy

# Сбросить БД
docker-compose exec app npx prisma migrate reset

# Prisma Studio
docker-compose exec app npx prisma studio

# PostgreSQL shell
docker-compose exec postgres psql -U parser -d parsing

# С Makefile
make db-migrate
make db-reset
make db-studio
make db-shell
```

### Утилиты

```bash
# Зайти в контейнер app
docker-compose exec app sh

# Зайти в контейнер worker
docker-compose exec worker sh

# Redis CLI
docker-compose exec redis redis-cli -a redis123

# С Makefile
make shell
make worker-shell
make redis-cli
```

---

## 🌐 Сервисы

### Production сервисы (всегда запущены)

| Сервис | Порт | Описание |
|--------|------|----------|
| **app** | 3000 | API сервер |
| **worker** | - | Обработчик очередей |
| **postgres** | 5432 | База данных |
| **redis** | 6379 | Кэш и очереди |

### Dev сервисы (только в dev режиме)

| Сервис | Порт | Описание |
|--------|------|----------|
| **adminer** | 8080 | UI для PostgreSQL |
| **redis-commander** | 8081 | UI для Redis |

### Доступ к сервисам

**API:**
- Health: http://localhost:3000/health
- Swagger (если есть): http://localhost:3000/docs
- Endpoints: http://localhost:3000/api/*

**Adminer (dev режим):**
- URL: http://localhost:8080
- System: PostgreSQL
- Server: postgres
- Username: parser
- Password: parser123
- Database: parsing

**Redis Commander (dev режим):**
- URL: http://localhost:8081

---

## 🔍 Проверка работы

### Health check API

```bash
curl http://localhost:3000/health
```

Ответ:
```json
{
  "status": "ok",
  "timestamp": "2026-01-24T...",
  "database": "connected",
  "sources": [...]
}
```

### Проверка БД

```bash
docker-compose exec postgres pg_isready -U parser
```

### Проверка Redis

```bash
docker-compose exec redis redis-cli -a redis123 ping
```

---

## 🐛 Troubleshooting

### Порты заняты

**Проблема:** Порт 3000/5432/6379 уже используется

**Решение:**
```bash
# Найди процесс
netstat -ano | findstr :3000  # Windows
lsof -i :3000                  # Linux/Mac

# Останови процесс или измени порт в .env
PORT=3001
```

### Контейнеры не запускаются

**Проблема:** Ошибки при запуске

**Решение:**
```bash
# Смотри логи
docker-compose logs

# Пересобери образы
docker-compose build --no-cache

# Полная очистка и перезапуск
docker-compose down -v
docker-compose up -d
```

### БД не инициализируется

**Проблема:** Prisma миграции не применены

**Решение:**
```bash
# Применить миграции вручную
docker-compose exec app npx prisma migrate deploy

# Или пересоздать БД
docker-compose down -v
docker-compose up -d
```

### Puppeteer не работает

**Проблема:** Chromium падает

**Решение:**
```bash
# Проверь логи
docker-compose logs worker

# Увеличь память для Docker
# Docker Desktop -> Settings -> Resources -> Memory: 4GB+
```

### Нет места на диске

**Проблема:** Docker занял много места

**Решение:**
```bash
# Очистка unused данных
docker system prune -a

# Очистка volumes
docker volume prune

# Полная очистка проекта
make clean-all
```

---

## 💾 Backup и Restore

### Бэкап БД

```bash
# Создать бэкап
make backup-db

# Или вручную
mkdir -p backups
docker-compose exec -T postgres pg_dump -U parser parsing > backups/backup_$(date +%Y%m%d_%H%M%S).sql
```

### Восстановление БД

```bash
# Из последнего бэкапа
make restore-db

# Или из конкретного файла
docker-compose exec -T postgres psql -U parser parsing < backups/backup_20260124.sql
```

---

## 📊 Мониторинг

### Логи всех сервисов

```bash
docker-compose logs -f --tail=100
```

### Логи конкретного сервиса

```bash
docker-compose logs -f app
docker-compose logs -f worker
docker-compose logs -f postgres
docker-compose logs -f redis
```

### Статистика ресурсов

```bash
docker stats

# Или с Makefile
make stats
```

---

## 🔄 Обновление

### Обновить код

```bash
# 1. Остановить
docker-compose down

# 2. Обновить код (git pull или другой способ)
git pull

# 3. Пересобрать и запустить
docker-compose up -d --build
```

### Обновить зависимости

```bash
# 1. Обнови package.json
# 2. Пересобери образы
docker-compose build --no-cache
docker-compose up -d
```

---

## 🚀 Production deployment

### Для production рекомендуется:

1. **Изменить пароли** в `.env`
2. **Настроить volumes** для данных
3. **Настроить backups**
4. **Использовать reverse proxy** (Nginx)
5. **Настроить SSL** (Let's Encrypt)
6. **Мониторинг** (Prometheus + Grafana)

### Пример с Nginx:

```yaml
# docker-compose.prod.yml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
```

---

## 📚 Полезные ссылки

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose](https://docs.docker.com/compose/)
- [Prisma](https://www.prisma.io/docs)
- [PostgreSQL](https://www.postgresql.org/docs/)
- [Redis](https://redis.io/docs/)

---

## 🎉 Готово!

Проект успешно запущен в Docker! 🐳

Если возникли вопросы - проверь [Troubleshooting](#troubleshooting) или создай issue.

**Happy coding!** ✨
