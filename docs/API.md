# 🌐 API Documentation

## 📖 Содержание

- [Обзор](#обзор)
- [Запуск API](#запуск-api)
- [Эндпоинты](#эндпоинты)
- [Примеры использования](#примеры-использования)
- [Ошибки](#ошибки)
- [Интеграция с ботом](#интеграция-с-ботом)

---

## 🎯 Обзор

API сервер на **Fastify** предоставляет REST API для доступа к вакансиям.

**Базовый URL:** `http://localhost:3000`

**Возможности:**
- Поиск вакансий с фильтрами
- Получение конкретной вакансии
- Управление подписками (в разработке)
- Статистика

---

## 🚀 Запуск API

### Development режим

```bash
npm run dev:api
```

API запустится на `http://localhost:3000`

### Production режим

```bash
# Собрать проект
npm run build

# Запустить
npm run start:api
```

### Настройка порта

В `.env`:
```env
API_PORT=3000
API_HOST=0.0.0.0
```

---

## 📡 Эндпоинты

### 1. Health Check

**GET** `/health`

Проверка работоспособности API и подключения к БД.

**Ответ:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-05T12:30:00.000Z"
}
```

**Пример:**
```bash
curl http://localhost:3000/health
```

---

### 2. Получить список вакансий

**GET** `/api/vacancies`

Поиск вакансий с фильтрами.

**Query параметры:**

| Параметр | Тип | Описание | Пример |
|----------|-----|----------|--------|
| `keywords` | string | Ключевые слова через запятую | `nodejs,javascript` |
| `locations` | string | Локации через запятую | `chisinau,balti` |
| `salaryMin` | number | Минимальная зарплата | `1000` |
| `experience` | string | Опыт работы | `no_experience,between_1_and_3` |
| `schedule` | string | График работы | `remote,hybrid` |
| `sources` | string | Источники | `rabota.md,999.md` |
| `limit` | number | Количество результатов (по умолчанию: 50) | `20` |
| `offset` | number | Смещение для пагинации | `0` |

**Возможные значения `experience`:**
- `no_experience` - Без опыта
- `between_1_and_3` - 1-3 года
- `between_3_and_6` - 3-6 лет
- `more_than_6` - Более 6 лет

**Возможные значения `schedule`:**
- `remote` - Удаленная работа
- `office` - Офис
- `hybrid` - Гибрид
- `flexible` - Гибкий график

**Ответ:**
```json
{
  "success": true,
  "data": [
    {
      "id": "clx1234567890",
      "title": "Node.js Developer",
      "company": "Tech Corp",
      "description": "Ищем опытного разработчика...",
      "location": "Chișinău",
      "salaryMin": 1200,
      "salaryMax": 2000,
      "salaryCurrency": "USD",
      "experience": "between_3_and_6",
      "employment": "full",
      "schedule": "remote",
      "skills": ["Node.js", "PostgreSQL", "Docker"],
      "source": "rabota.md",
      "sourceId": "12345",
      "sourceUrl": "https://www.rabota.md/...",
      "publishedAt": "2024-01-05T10:30:00.000Z",
      "createdAt": "2024-01-05T11:00:00.000Z",
      "updatedAt": "2024-01-05T11:00:00.000Z"
    }
  ],
  "meta": {
    "total": 15,
    "limit": 50,
    "offset": 0
  }
}
```

**Примеры запросов:**

```bash
# Все вакансии
curl "http://localhost:3000/api/vacancies"

# Поиск Node.js в Кишиневе с зарплатой от 1000$
curl "http://localhost:3000/api/vacancies?keywords=nodejs&locations=chisinau&salaryMin=1000"

# Удаленная работа для джунов
curl "http://localhost:3000/api/vacancies?schedule=remote&experience=no_experience,between_1_and_3"

# С пагинацией
curl "http://localhost:3000/api/vacancies?limit=10&offset=20"

# Только с rabota.md
curl "http://localhost:3000/api/vacancies?sources=rabota.md"
```

---

### 3. Получить конкретную вакансию

**GET** `/api/vacancies/:id`

Получить детали одной вакансии по ID.

**Параметры URL:**
- `id` - ID вакансии из БД

**Ответ:**
```json
{
  "success": true,
  "data": {
    "id": "clx1234567890",
    "title": "Node.js Developer",
    "company": "Tech Corp",
    "description": "...",
    "rawData": {
      "fullDescription": "Полное описание...",
      "education": "Высшее",
      "firstSeenAt": "2024-01-05T10:00:00.000Z"
    }
  }
}
```

**Пример:**
```bash
curl "http://localhost:3000/api/vacancies/clx1234567890"
```

**Ошибка 404:**
```json
{
  "success": false,
  "error": "Vacancy not found"
}
```

---

### 4. Статистика

**GET** `/api/vacancies/stats`

Получить статистику по источникам.

**Ответ:**
```json
{
  "success": true,
  "data": [
    {
      "source": "rabota.md",
      "count": 1250
    },
    {
      "source": "999.md",
      "count": 890
    },
    {
      "source": "makler.md",
      "count": 340
    }
  ]
}
```

**Пример:**
```bash
curl "http://localhost:3000/api/vacancies/stats"
```

---

## 💻 Примеры использования

### JavaScript / Node.js

```javascript
// С fetch
const response = await fetch('http://localhost:3000/api/vacancies?keywords=nodejs&limit=5');
const data = await response.json();

console.log(`Найдено: ${data.meta.total} вакансий`);
data.data.forEach(vacancy => {
  console.log(`- ${vacancy.title} at ${vacancy.company}`);
});

// С axios
import axios from 'axios';

const { data } = await axios.get('http://localhost:3000/api/vacancies', {
  params: {
    keywords: 'nodejs',
    salaryMin: 1000,
    schedule: 'remote'
  }
});
```

### Python

```python
import requests

response = requests.get('http://localhost:3000/api/vacancies', params={
    'keywords': 'python',
    'locations': 'chisinau',
    'salaryMin': 1000
})

data = response.json()
print(f"Найдено: {data['meta']['total']} вакансий")

for vacancy in data['data']:
    print(f"- {vacancy['title']} at {vacancy['company']}")
```

### cURL с фильтрами

```bash
# Сложный запрос
curl -G "http://localhost:3000/api/vacancies" \
  --data-urlencode "keywords=javascript,react" \
  --data-urlencode "locations=chisinau" \
  --data-urlencode "salaryMin=800" \
  --data-urlencode "schedule=remote,hybrid" \
  --data-urlencode "experience=between_1_and_3,between_3_and_6" \
  --data-urlencode "limit=20"
```

---

## ⚠️ Ошибки

### Стандартный формат ошибки

```json
{
  "success": false,
  "error": "Error message",
  "message": "Detailed error description"
}
```

### Коды ошибок

| Код | Описание |
|-----|----------|
| 200 | OK - Успешный запрос |
| 404 | Not Found - Ресурс не найден |
| 500 | Internal Server Error - Ошибка сервера |

### Примеры ошибок

**404 - Вакансия не найдена:**
```json
{
  "success": false,
  "error": "Vacancy not found"
}
```

**500 - Ошибка БД:**
```json
{
  "success": false,
  "error": "Failed to fetch vacancies",
  "message": "Database connection error"
}
```

---

## 🤖 Интеграция с ботом

### Telegram Bot пример

```typescript
import TelegramBot from 'node-telegram-bot-api';
import axios from 'axios';

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
const API_URL = 'http://localhost:3000';

bot.onText(/\/search (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const query = match[1]; // "nodejs remote"
  
  try {
    // Поиск вакансий через API
    const { data } = await axios.get(`${API_URL}/api/vacancies`, {
      params: {
        keywords: query,
        limit: 10
      }
    });
    
    if (data.data.length === 0) {
      bot.sendMessage(chatId, '❌ Вакансии не найдены');
      return;
    }
    
    // Форматируем результаты
    let message = `🔍 Найдено ${data.meta.total} вакансий:\n\n`;
    
    data.data.forEach((vacancy, i) => {
      message += `${i + 1}. ${vacancy.title}\n`;
      message += `   💼 ${vacancy.company}\n`;
      message += `   📍 ${vacancy.location || 'Не указана'}\n`;
      if (vacancy.salaryMin) {
        message += `   💰 $${vacancy.salaryMin}-${vacancy.salaryMax}\n`;
      }
      message += `   🔗 ${vacancy.sourceUrl}\n\n`;
    });
    
    bot.sendMessage(chatId, message);
    
  } catch (error) {
    bot.sendMessage(chatId, '❌ Ошибка при поиске вакансий');
    console.error(error);
  }
});
```

### Логика работы с API из бота

```typescript
async function searchVacancies(filters: {
  keywords?: string[];
  location?: string;
  salaryMin?: number;
  remote?: boolean;
}) {
  // 1. Формируем параметры
  const params = {
    keywords: filters.keywords?.join(','),
    locations: filters.location,
    salaryMin: filters.salaryMin,
    schedule: filters.remote ? 'remote' : undefined
  };
  
  // 2. Делаем запрос к API
  const { data } = await axios.get(`${API_URL}/api/vacancies`, { params });
  
  // 3. Проверяем нужен ли парсинг
  if (data.meta.updating) {
    // API запустил парсинг в фоне
    return {
      vacancies: data.data,
      updating: true,
      message: '⏳ Данные обновляются, показываю что есть сейчас...'
    };
  }
  
  return {
    vacancies: data.data,
    updating: false
  };
}
```

---

## 🔒 Безопасность (для production)

### Rate Limiting

```typescript
// В будущем можно добавить rate limiting
import rateLimit from '@fastify/rate-limit';

await fastify.register(rateLimit, {
  max: 100,              // 100 запросов
  timeWindow: '1 minute' // за минуту
});
```

### CORS

```typescript
// Уже настроен в server.ts
await fastify.register(cors, {
  origin: 'https://yourdomain.com', // В production укажи домен
  methods: ['GET', 'POST']
});
```

### API Key (опционально)

```typescript
// Middleware для проверки API ключа
fastify.addHook('onRequest', async (request, reply) => {
  const apiKey = request.headers['x-api-key'];
  
  if (!apiKey || apiKey !== process.env.API_KEY) {
    reply.code(401).send({ error: 'Unauthorized' });
  }
});
```

---

## 📊 Мониторинг

### Логи

API логирует все запросы в консоль (в development режиме).

```bash
npm run dev:api

# Вывод:
{"level":30,"time":1704456789,"msg":"GET /api/vacancies"}
{"level":30,"time":1704456790,"msg":"Response: 200"}
```

### Health Check

Настрой мониторинг через `/health`:

```bash
# Uptime Robot, Pingdom и т.д.
GET http://localhost:3000/health
```

---

## 🎯 Roadmap API

- [ ] Эндпоинты для подписок:
  - `POST /api/subscriptions` - Создать подписку
  - `GET /api/subscriptions/:userId` - Подписки пользователя
  - `DELETE /api/subscriptions/:id` - Удалить подписку
- [ ] Фильтр по дате публикации
- [ ] Сортировка результатов
- [ ] Поиск по компаниям
- [ ] Экспорт вакансий (CSV, JSON)
- [ ] GraphQL эндпоинт
- [ ] WebSocket для real-time обновлений

---

📖 **Читай далее:**
- [Документация по Worker](./WORKER.md)
- [Интеграция с ботом](./BOT_INTEGRATION.md)
- [Архитектура системы](./ARCHITECTURE.md)
