# 🐳 Docker Setup Guide

Полное руководство по запуску и настройке проекта через Docker.

---

## 🚀 Быстрый старт

### Windows

```powershell
# Запуск всей инфраструктуры
.\scripts\docker-start.ps1
```

### Linux/Mac

```bash
# Дать права на выполнение (один раз)
chmod +x scripts/*.sh

# Запуск
docker-compose up -d
```

**Готово!** Все сервисы запущены.

---

## 📦 Что включено

### Основные сервисы

| Сервис | Описание | Порт | Health Check |
|--------|----------|------|--------------|
| **postgres** | PostgreSQL 16 Alpine | 5432 | ✅ |
| **redis** | Redis 7 Alpine | 6379 | ✅ |
| **app** | API Server (Fastify) | 3000 | ✅ |
| **worker** | Background Jobs (BullMQ) | - | ✅ |

### Dev Tools (опционально)

| Сервис | Описание | Порт | Как запустить |
|--------|----------|------|---------------|
| **adminer** | GUI для PostgreSQL | 8080 | `docker-compose --profile dev up -d adminer` |
| **redis-commander** | GUI для Redis | 8081 | `docker-compose --profile dev up -d redis-commander` |

---

## 🔗 Доступ к сервисам

После запуска доступны:

```
✅ API Server:     http://localhost:3000
✅ Health Check:   http://localhost:3000/health
✅ Adminer (БД):   http://localhost:8080
✅ Redis UI:       http://localhost:8081
```

### Проверка работы

```bash
# Health check API
curl http://localhost:3000/health

# Поиск вакансий
curl "http://localhost:3000/api/vacancies?keywords=developer&limit=5"

# Статистика
curl http://localhost:3000/api/vacancies/stats
```

---

## ⚙️ Конфигурация

### Переменные окружения

Создайте `.env` файл в корне проекта (опционально):

```bash
# Database
POSTGRES_DB=parsing
POSTGRES_USER=parser
POSTGRES_PASSWORD=parser123
POSTGRES_PORT=5432

# Redis  
REDIS_PORT=6379
REDIS_PASSWORD=redis123

# API
PORT=3000
NODE_ENV=production

# Worker
WORKER_CONCURRENCY=2
```

**По умолчанию** используются значения из `docker-compose.yml`.

### Volumes (Персистентность данных)

Docker создает volumes для сохранения данных:

```yaml
volumes:
  postgres_data:   # Данные PostgreSQL
  redis_data:      # Данные Redis
```

Данные сохраняются даже после остановки контейнеров.

---

## 🛠️ Основные команды

### Управление контейнерами

```bash
# Запустить все сервисы
docker-compose up -d

# Посмотреть статус
docker-compose ps

# Посмотреть логи
docker-compose logs -f

# Логи конкретного сервиса
docker-compose logs -f app
docker-compose logs -f worker

# Остановить все
docker-compose down

# Остановить и удалить volumes (⚠️ удалит данные!)
docker-compose down -v

# Перезапустить сервис
docker-compose restart app
docker-compose restart worker
```

### Пересборка образов

```bash
# После изменения кода - пересобрать образы
docker-compose build

# Пересобрать и запустить
docker-compose up -d --build

# Пересобрать конкретный сервис
docker-compose build app
docker-compose build worker
```

### Dev Tools

```bash
# Запустить Adminer (GUI для БД)
docker-compose --profile dev up -d adminer

# Запустить Redis Commander
docker-compose --profile dev up -d redis-commander

# Запустить все dev tools
docker-compose --profile dev up -d
```

---

## 📊 Мониторинг

### Просмотр логов

```bash
# Все логи
docker-compose logs -f

# Последние 100 строк
docker-compose logs --tail=100 -f

# Логи API
docker-compose logs -f app

# Логи Worker
docker-compose logs -f worker

# Логи БД
docker-compose logs -f postgres

# Логи Redis
docker-compose logs -f redis
```

### Проверка ресурсов

```bash
# Использование ресурсов
docker stats

# Информация о контейнерах
docker-compose ps -a

# Детали сервиса
docker inspect parsing-app
```

---

## 🔧 Работа с базой данных

### Через Adminer (GUI)

1. Открой http://localhost:8080
2. Заполни форму:
   - **System**: PostgreSQL
   - **Server**: postgres
   - **Username**: parser
   - **Password**: parser123
   - **Database**: parsing

### Через командную строку

```bash
# Войти в контейнер PostgreSQL
docker exec -it parsing-postgres psql -U parser -d parsing

# Примеры команд:
\dt              # Список таблиц
\d "Vacancy"     # Структура таблицы
SELECT COUNT(*) FROM "Vacancy";  # Количество вакансий
```

### Применение миграций вручную

```bash
# Если нужно применить миграции вручную
docker exec -it parsing-app npx prisma migrate deploy

# Или через docker-compose
docker-compose exec app npx prisma migrate deploy
```

### Prisma Studio

```bash
# Запустить Prisma Studio
docker exec -it parsing-app npx prisma studio

# Откроется на http://localhost:5555
```

---

## 🔴 Работа с Redis

### Через Redis Commander (GUI)

1. Открой http://localhost:8081
2. Автоматически подключится к Redis

### Через CLI

```bash
# Войти в контейнер Redis
docker exec -it parsing-redis redis-cli

# Аутентификация
AUTH redis123

# Примеры команд:
KEYS *                    # Все ключи
GET search:user123:hash   # Получить значение
DEL search:user123:hash   # Удалить ключ
FLUSHDB                   # Очистить всю БД (⚠️)
```

---

## 🐛 Troubleshooting

### Проблема: Контейнеры не запускаются

```bash
# Посмотреть логи
docker-compose logs

# Проверить что порты не заняты
netstat -ano | findstr :3000
netstat -ano | findstr :5432
netstat -ano | findstr :6379

# Остановить старые контейнеры
docker-compose down
docker-compose up -d
```

### Проблема: База данных не создается

```bash
# Проверить логи PostgreSQL
docker-compose logs postgres

# Пересоздать контейнер
docker-compose down
docker volume rm parsing_postgres_data
docker-compose up -d postgres
```

### Проблема: API не отвечает

```bash
# Проверить health check
curl http://localhost:3000/health

# Посмотреть логи API
docker-compose logs app

# Перезапустить API
docker-compose restart app
```

### Проблема: Worker не обрабатывает задачи

```bash
# Проверить логи Worker
docker-compose logs worker

# Проверить Redis
docker-compose logs redis

# Проверить подключение к Redis
docker exec -it parsing-redis redis-cli ping

# Перезапустить Worker
docker-compose restart worker
```

### Проблема: "Module not found" ошибка

```bash
# Пересобрать образы
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Проблема: Нехватка памяти

```bash
# Увеличить память для Docker Desktop
# Settings -> Resources -> Memory -> 4GB+

# Очистить неиспользуемые образы
docker system prune -a
```

---

## 🏗️ Архитектура Docker

### Multi-stage Build

Dockerfile использует multi-stage build для оптимизации:

```dockerfile
# Этап 1: Builder - компиляция TypeScript
FROM node:20-alpine AS builder
RUN npm ci                    # Установка ВСЕХ зависимостей
RUN npm run build             # Компиляция TypeScript
RUN npm prune --production    # Удаление devDependencies

# Этап 2: Production - финальный образ
FROM node:20-alpine
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/build ./build
CMD ["node", "build/src/api/server.js"]
```

**Преимущества:**
- Финальный образ содержит только production зависимости
- Меньший размер образа
- Быстрее деплой

### Сети

Все сервисы работают в изолированной сети `parsing-network`:

```yaml
networks:
  parsing-network:
    driver: bridge
```

Это позволяет сервисам общаться по именам (`postgres`, `redis`).

### Health Checks

Каждый сервис имеет health check:

```yaml
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U parser"]
  interval: 10s
  timeout: 5s
  retries: 5
```

Docker автоматически проверяет здоровье сервисов.

---

## 🎯 Production Deployment

### Рекомендации для production

1. **Измени пароли** в `.env`:
   ```bash
   POSTGRES_PASSWORD=<strong-password>
   REDIS_PASSWORD=<strong-password>
   ```

2. **Используй secrets** вместо `.env`:
   ```yaml
   secrets:
     postgres_password:
       file: ./secrets/postgres_password.txt
   ```

3. **Настрой мониторинг:**
   - Health checks уже настроены
   - Добавь Prometheus + Grafana

4. **Настрой backups:**
   ```bash
   # Backup PostgreSQL
   docker exec parsing-postgres pg_dump -U parser parsing > backup.sql
   
   # Restore
   docker exec -i parsing-postgres psql -U parser parsing < backup.sql
   ```

5. **Используй reverse proxy** (nginx, traefik):
   ```nginx
   location /api {
     proxy_pass http://localhost:3000;
   }
   ```

---

## 📝 Полезные алиасы

Добавь в `~/.bashrc` или `~/.zshrc`:

```bash
# Docker aliases
alias dc='docker-compose'
alias dcu='docker-compose up -d'
alias dcd='docker-compose down'
alias dcl='docker-compose logs -f'
alias dcp='docker-compose ps'
alias dcr='docker-compose restart'

# Parsing project
alias parsing-start='docker-compose up -d'
alias parsing-logs='docker-compose logs -f'
alias parsing-stop='docker-compose down'
```

---

## 🔄 Обновление проекта

```bash
# 1. Остановить контейнеры
docker-compose down

# 2. Обновить код (git pull или скопировать)
git pull

# 3. Пересобрать образы
docker-compose build

# 4. Запустить
docker-compose up -d

# 5. Применить миграции (если есть новые)
docker-compose exec app npx prisma migrate deploy

# 6. Проверить логи
docker-compose logs -f
```

---

## 💾 Backup & Restore

### Backup базы данных

```bash
# Создать backup
docker exec parsing-postgres pg_dump -U parser parsing > backup_$(date +%Y%m%d).sql

# Или через docker-compose
docker-compose exec postgres pg_dump -U parser parsing > backup.sql
```

### Restore базы данных

```bash
# Восстановить из backup
docker exec -i parsing-postgres psql -U parser parsing < backup.sql

# Или через docker-compose
docker-compose exec -T postgres psql -U parser parsing < backup.sql
```

### Backup Redis

```bash
# Redis автоматически сохраняет данные в /data
# Скопировать Redis data
docker cp parsing-redis:/data ./redis_backup

# Восстановить
docker cp ./redis_backup parsing-redis:/data
docker-compose restart redis
```

---

## 📚 Дополнительные ресурсы

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [PostgreSQL Docker Hub](https://hub.docker.com/_/postgres)
- [Redis Docker Hub](https://hub.docker.com/_/redis)
- [Node.js Docker Best Practices](https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md)

---

## ✅ Чеклист для production

- [ ] Изменены все пароли в `.env`
- [ ] Настроен HTTPS (reverse proxy)
- [ ] Включены health checks
- [ ] Настроен мониторинг (Prometheus/Grafana)
- [ ] Настроены регулярные backups
- [ ] Настроен log rotation
- [ ] Ограничены ресурсы контейнеров
- [ ] Настроен restart policy (unless-stopped)
- [ ] Volumes для персистентности данных
- [ ] Документация для команды

---

📅 **Последнее обновление:** 25 января 2026  
📦 **Docker Compose версия:** 3.8  
🐳 **Статус:** Production Ready
