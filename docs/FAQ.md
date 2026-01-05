# ❓ FAQ - Часто задаваемые вопросы

## 📖 Содержание

- [Общие вопросы](#общие-вопросы)
- [Установка и настройка](#установка-и-настройка)
- [Работа с API](#работа-с-api)
- [Worker и Redis](#worker-и-redis)
- [Парсеры](#парсеры)
- [База данных](#база-данных)
- [Telegram бот](#telegram-бот)

---

## 🎯 Общие вопросы

### Как работает вся система?

```
1. Worker парсит вакансии каждые 6 часов
2. Адаптеры унифицируют данные
3. Данные сохраняются в PostgreSQL
4. API предоставляет доступ к вакансиям
5. Telegram бот общается с API
6. Пользователи получают результаты
```

📖 Подробнее: [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)

### Зачем нужны адаптеры?

Каждый сайт имеет свой формат данных:
- rabota.md: `"Зарплата: 500-1000 lei"`
- 999.md: `"Salary: €800"`

Адаптеры приводят всё к единому формату:
```javascript
{
  salaryMin: 500,
  salaryMax: 1000,
  salaryCurrency: "MDL"
}
```

Это позволяет единообразно работать со всеми источниками.

### Можно ли использовать без Telegram бота?

Да! API работает независимо. Ты можешь:
- Делать HTTP запросы напрямую
- Создать свой веб-интерфейс
- Интегрировать с другими сервисами
- Использовать Discord/Slack бота вместо Telegram

### Какие сайты поддерживаются?

Сейчас:
- ✅ rabota.md (полная поддержка)
- ✅ 999.md (парсер готов)
- ✅ makler.md (парсер готов)

Можно легко добавить новые сайты, создав парсер и адаптер.

📖 Как создать: [docs/PARSERS.md#создание-нового-парсера](./docs/PARSERS.md)

---

## ⚙️ Установка и настройка

### Какая версия Node.js нужна?

**Node.js >= 22.11** (используется в проекте 22.12.0)

Проверь версию:
```bash
node --version
```

### Какие базы данных поддерживаются?

Только **PostgreSQL** (через Prisma ORM).

Минимальная версия: PostgreSQL 13+

### Нужен ли Redis обязательно?

**Нет!** Redis нужен только для Worker (фоновые задачи).

Если не запускать Worker:
- API будет работать
- Парсинг можно запускать вручную
- Автоматические обновления не будут работать

### Какая версия Redis нужна?

**Redis >= 6.0** (BullMQ требует команды из Redis 6.0+)

Если у тебя Redis 5.x:
```bash
# Установи через Docker
docker run -d -p 6379:6379 redis:7-alpine
```

📖 Подробнее: [docs/REDIS_SETUP.md](./docs/REDIS_SETUP.md)

### Где хранятся данные?

- **Вакансии** → PostgreSQL (таблица `Vacancy`)
- **Пользователи** → PostgreSQL (таблица `User`)
- **Очередь задач** → Redis (временно)
- **Кэш парсеров** → Файловая система (`/cache`)

---

## 🌐 Работа с API

### Как найти вакансии с зарплатой от 1000$?

```bash
curl "http://localhost:3000/api/vacancies?salaryMin=1000"
```

### Как искать по ключевым словам?

```bash
# Одно слово
curl "http://localhost:3000/api/vacancies?keywords=nodejs"

# Несколько слов (через запятую)
curl "http://localhost:3000/api/vacancies?keywords=nodejs,javascript"
```

### Как фильтровать по типу работы?

```bash
# Удаленная работа
curl "http://localhost:3000/api/vacancies?schedule=remote"

# Офис
curl "http://localhost:3000/api/vacancies?schedule=office"

# Несколько типов
curl "http://localhost:3000/api/vacancies?schedule=remote,hybrid"
```

### Как сделать пагинацию?

```bash
# Первая страница (первые 10)
curl "http://localhost:3000/api/vacancies?limit=10&offset=0"

# Вторая страница (следующие 10)
curl "http://localhost:3000/api/vacancies?limit=10&offset=10"

# Третья страница
curl "http://localhost:3000/api/vacancies?limit=10&offset=20"
```

### API возвращает старые данные. Как обновить?

Worker автоматически обновляет данные каждые 6 часов.

Если нужно обновить сейчас:
```bash
# Запусти парсинг вручную
npm run test:system
```

Или настрой интервал в `.env`:
```env
PARSE_INTERVAL=3600000  # 1 час вместо 6
```

### Как защитить API в production?

```typescript
// Добавь в src/api/server.ts
import rateLimit from '@fastify/rate-limit';

await fastify.register(rateLimit, {
  max: 100,              // 100 запросов
  timeWindow: '1 minute' // за минуту
});

// Или используй API ключи
fastify.addHook('onRequest', async (request, reply) => {
  const apiKey = request.headers['x-api-key'];
  if (apiKey !== process.env.API_KEY) {
    reply.code(401).send({ error: 'Unauthorized' });
  }
});
```

📖 Подробнее: [docs/API.md](./docs/API.md)

---

## ⚙️ Worker и Redis

### Worker не видит задачи

**Проблема:** Worker запущен, но задачи не выполняются

**Причины:**
1. Имя очереди не совпадает
2. Redis не запущен
3. Ошибка в processor

**Решение:**
```bash
# Проверь Redis
redis-cli ping
# Должен вернуть: PONG

# Проверь очередь
redis-cli LLEN bull:parse:wait

# Очисти очередь (если нужно)
redis-cli FLUSHALL

# Перезапусти Worker
npm run dev:worker
```

### Как изменить интервал парсинга?

В `.env`:
```env
# Парсинг каждый час (вместо 6 часов)
PARSE_INTERVAL=3600000

# Парсинг каждые 30 минут
PARSE_INTERVAL=1800000
```

Перезапусти Worker после изменения.

### Как запустить парсинг вручную?

```bash
# Через тестовый скрипт
npm run test:system

# Или добавь задачу в очередь
node -e "
import { parseQueue } from './src/worker/worker.js';
await parseQueue.add('manual-parse', {
  source: 'rabota.md',
  searchQuery: 'it',
  maxPages: 5
});
"
```

### Worker использует много памяти

**Решение 1:** Уменьши concurrency в `.env`:
```env
WORKER_CONCURRENCY=1  # Вместо 3
```

**Решение 2:** Настрой Redis:
```conf
# redis.conf
maxmemory 256mb
maxmemory-policy allkeys-lru
```

### Как мониторить Worker?

```bash
# Логи в реальном времени
npm run dev:worker

# Или установи Bull Board
npm install @bull-board/api @bull-board/fastify
```

📖 Подробнее: [docs/WORKER.md](./docs/WORKER.md)

---

## 🔍 Парсеры

### Как добавить новый сайт?

1. Создай парсер: `src/parsers/mysite.ts`
2. Создай адаптер: `src/parsers/adapters/mysite.adapter.ts`
3. Зарегистрируй в `src/parsers/adapters/index.ts`

📖 Подробный гайд: [docs/PARSERS.md#создание-нового-парсера](./docs/PARSERS.md)

### Парсер не находит вакансии

**Причины:**
1. Сайт изменил структуру HTML
2. Неправильные селекторы
3. Сайт заблокировал запросы

**Отладка:**
```typescript
// Сохрани HTML для анализа
const response = await axios.get(url);
await fs.writeFile('debug.html', response.data);

// Проверь селекторы
const $ = cheerio.load(html);
console.log($('.vacancy-item').length); // Сколько найдено
```

### Сайт блокирует парсер (403 / 429)

**Решение:**
1. Увеличь задержки между запросами
2. Используй реалистичный User-Agent
3. Добавь cookies если нужно
4. Используй прокси (для production)

```typescript
// В парсере
await pause(3000); // 3 секунды между запросами

const parser = new RabotaMdParser({
  delay: 3000  // задержка
});
```

### Как отключить кэш парсера?

```typescript
const parser = new RabotaMdParser({
  cacheEnabled: false  // Отключить кэш
});
```

Или удали папку:
```bash
rm -rf cache/
```

---

## 🗄️ База данных

### Как посмотреть данные в БД?

```bash
# Prisma Studio (GUI)
npm run db:studio
```

Откроется: http://localhost:5555

### Как очистить БД?

```bash
# ВНИМАНИЕ: Удалит ВСЕ данные!
npx prisma migrate reset
```

Или вручную:
```sql
DELETE FROM "Vacancy";
DELETE FROM "ParseLog";
```

### Как изменить схему БД?

1. Отредактируй `prisma/schema.prisma`
2. Создай миграцию:
```bash
npm run db:migrate
```

📖 Подробнее: [docs/DATABASE.md#миграции](./docs/DATABASE.md)

### БД занимает много места

**Удали старые вакансии:**
```typescript
// Удалить вакансии старше 30 дней
const monthAgo = new Date();
monthAgo.setDate(monthAgo.getDate() - 30);

await prisma.vacancy.deleteMany({
  where: {
    publishedAt: { lt: monthAgo }
  }
});
```

Можно добавить это в Worker как периодическую задачу.

### Как сделать backup БД?

```bash
# PostgreSQL backup
pg_dump -U postgres vacancy > backup.sql

# Restore
psql -U postgres vacancy < backup.sql
```

---

## 🤖 Telegram бот

### Как создать бота?

1. Найди **@BotFather** в Telegram
2. Отправь `/newbot`
3. Следуй инструкциям
4. Сохрани токен

📖 Подробнее: [docs/BOT_INTEGRATION.md](./docs/BOT_INTEGRATION.md)

### Бот не отвечает

**Причины:**
1. Неправильный токен
2. Бот не запущен
3. API не работает

**Проверка:**
```bash
# Проверь что бот запущен
ps aux | grep bot

# Проверь логи
npm run dev:bot

# Проверь API
curl http://localhost:3000/health
```

### Как добавить новую команду?

```typescript
// В src/bot/index.ts
bot.onText(/\/mycommand/, async (msg) => {
  const chatId = msg.chat.id;
  await bot.sendMessage(chatId, 'Твой ответ');
});
```

### Бот спамит уведомлениями

**Решение:**

Настрой лимиты в `UserSettings`:
```typescript
await prisma.userSettings.update({
  where: { userId: user.id },
  data: {
    maxNotifications: 5, // Макс 5 уведомлений
    notificationsOn: true
  }
});
```

Или увеличь интервал проверки подписок:
```env
NOTIFY_INTERVAL=14400000  # 4 часа вместо 2
```

---

## 🎯 Production

### Как задеплоить на сервер?

**Вариант 1: PM2**
```bash
npm run build
pm2 start build/src/api/server.js --name api
pm2 start build/src/worker/worker.js --name worker
pm2 start build/src/bot/index.js --name bot
```

**Вариант 2: Docker**
```dockerfile
# Создай Dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
CMD ["node", "build/src/api/server.js"]
```

**Вариант 3: VPS (Digital Ocean, Hetzner, etc)**
- Установи Node.js, PostgreSQL, Redis
- Склонируй репозиторий
- Настрой .env
- Запусти через PM2

### Какой хостинг использовать?

**Для начала:**
- VPS: Digital Ocean, Hetzner (~$5-10/месяц)
- Database: Managed PostgreSQL
- Redis: Redis Cloud (free tier)

**Для production:**
- AWS / Google Cloud / Azure
- Managed services для всего
- Load balancer + несколько Workers

### Как настроить HTTPS?

```bash
# Nginx как reverse proxy
server {
    listen 443 ssl;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 💡 Другие вопросы

### Есть ли документация API?

Да! См. [docs/API.md](./docs/API.md)

Или добавь Swagger:
```bash
npm install @fastify/swagger @fastify/swagger-ui
```

### Можно ли масштабировать?

Да! Запусти несколько Workers на разных серверах:

```bash
# Сервер 1
REDIS_HOST=redis.example.com npm run start:worker

# Сервер 2
REDIS_HOST=redis.example.com npm run start:worker
```

BullMQ автоматически распределит нагрузку.

### Где искать помощь?

1. 📖 Документация в `/docs`
2. 🐛 Issues на GitHub
3. 💬 Telegram / Discord сообщество (если есть)

---

## 🎓 Дополнительные ресурсы

- [Prisma Docs](https://www.prisma.io/docs)
- [BullMQ Docs](https://docs.bullmq.io/)
- [Fastify Docs](https://www.fastify.io/)
- [Telegram Bot API](https://core.telegram.org/bots/api)

---

Не нашел ответ? Создай issue или посмотри [полную документацию](./README.md)!
