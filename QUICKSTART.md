# 🚀 Быстрый старт

## 1. Установи зависимости

```bash
npm install fastify @fastify/cors bullmq ioredis dotenv tsx
```

## 2. Установи Redis

### Вариант A: Docker (рекомендуется)
```bash
docker run -d --name redis -p 6379:6379 redis:alpine
```

### Вариант B: Windows
Скачай и установи: https://github.com/tporadowski/redis/releases

## 3. Проверь что БД работает

```bash
npm run db:studio
```

Должно открыться окно браузера с Prisma Studio.

## 4. Протестируй систему

```bash
node test-system.mjs
```

Должно пройти:
- ✅ Подключение к БД
- ✅ Парсинг вакансий
- ✅ Сохранение в БД
- ✅ Поиск через сервис
- ✅ Статистика

## 5. Запусти API сервер

```bash
npm run dev:api
```

Открой в браузере:
- http://localhost:3000/health - проверка статуса
- http://localhost:3000/api/vacancies - список вакансий
- http://localhost:3000/api/vacancies/stats - статистика

## 6. Запусти Worker (в отдельном терминале)

```bash
npm run dev:worker
```

Worker автоматически начнет парсить вакансии!

## 🎯 Что дальше?

1. ✅ База данных настроена
2. ✅ API работает
3. ✅ Worker парсит вакансии
4. 🔲 Создай Telegram бота
5. 🔲 Подключи бота к API
6. 🔲 Добавь подписки

## 📝 Полезные команды

```bash
# Посмотреть вакансии в БД
npm run db:studio

# Перезапустить миграции (если нужно)
npm run db:migrate

# Тест всей системы
node test-system.mjs

# Логи Worker'а
npm run dev:worker
```

## 🐛 Проблемы?

**Redis не подключается:**
```bash
# Проверь что Redis запущен
docker ps | grep redis

# Или перезапусти
docker restart redis
```

**API не запускается:**
- Проверь что порт 3000 свободен
- Проверь DATABASE_URL в .env

**Worker не парсит:**
- Проверь что Redis запущен
- Посмотри логи на ошибки
