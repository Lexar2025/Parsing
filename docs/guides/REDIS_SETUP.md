# 🔴 Redis Setup & Troubleshooting

## 📖 Содержание

- [Зачем нужен Redis](#зачем-нужен-redis)
- [Проблема с версией 5.x](#проблема-с-версией-5x)
- [Установка Redis 6.0+](#установка-redis-60)
- [Проверка установки](#проверка-установки)
- [Troubleshooting](#troubleshooting)

---

## 🤔 Зачем нужен Redis?

**Redis используется для:**

1. **Очереди задач (BullMQ)**
   - Worker берет задачи из Redis
   - Хранит состояние задач
   - Обрабатывает приоритеты

2. **Кэширование (опционально)**
   - Результаты парсинга
   - Часто запрашиваемые данные

3. **Rate limiting**
   - Ограничение запросов к API
   - Ограничение парсинга

---

## ⚠️ Проблема с версией 5.x

### Почему BullMQ требует Redis 6.0+?

**BullMQ использует команды, которые появились только в Redis 6.0:**
- `GETEX` - получить значение и установить TTL
- `COPY` - копировать ключи
- Улучшенные streams

**Если у тебя Redis 5.x, то Worker выдаст ошибку:**
```
Error: ERR unknown command 'GETEX'
```

или

```
Warning: Redis version 5.0.14.1 is not supported. Please upgrade to Redis 6.0 or higher.
```

---

## 📥 Установка Redis 6.0+

### Вариант 1: Docker (самый простой) ✅

**Преимущества:**
- Не нужно ничего устанавливать в систему
- Легко удалить и переустановить
- Всегда актуальная версия

**Шаг 1: Установи Docker**
- Скачай Docker Desktop: https://www.docker.com/products/docker-desktop

**Шаг 2: Запусти Redis**
```bash
# Запуск Redis 7 (последняя версия)
docker run -d --name redis -p 6379:6379 redis:7-alpine

# Проверка что запущен
docker ps
```

**Шаг 3: Проверь версию**
```bash
docker exec redis redis-cli INFO server | grep redis_version
```

Должно показать: `redis_version:7.x.x`

**Управление контейнером:**
```bash
# Остановить
docker stop redis

# Запустить снова
docker start redis

# Удалить
docker rm -f redis
```

---

### Вариант 2: Для Windows (через WSL2)

**Если у тебя Windows 10/11:**

**Шаг 1: Включи WSL2**
```powershell
# В PowerShell от администратора
wsl --install
```

**Шаг 2: Установи Ubuntu из Microsoft Store**

**Шаг 3: Установи Redis в WSL**
```bash
# В Ubuntu терминале
sudo apt update
sudo apt install redis-server

# Проверь версию
redis-server --version
```

**Шаг 4: Запусти Redis**
```bash
sudo service redis-server start

# Проверь что работает
redis-cli ping
# Должно вернуть: PONG
```

**Шаг 5: Настрой автозапуск**
```bash
sudo systemctl enable redis-server
```

---

### Вариант 3: Native для Windows (НЕ РЕКОМЕНДУЕТСЯ)

> ⚠️ **Внимание:** Официального Redis для Windows нет! Есть только неофициальные порты, которые могут быть устаревшими.

Если все же хочешь попробовать:

**Memurai (платная альтернатива, есть free версия):**
- Скачай: https://www.memurai.com/
- Полностью совместим с Redis 6.0+
- Free версия: до 4GB RAM

**Redis на Windows от tporadowski (устаревший):**
- Скачай: https://github.com/tporadowski/redis/releases
- ⚠️ Может быть не полностью совместим

---

## ✅ Проверка установки

### 1. Проверь что Redis запущен

```bash
# Через redis-cli
redis-cli ping
# Ответ: PONG

# Или через Docker
docker ps | grep redis
```

### 2. Проверь версию

```bash
redis-cli INFO server | grep redis_version
```

**Должно быть: 6.0.0 или выше!**

### 3. Проверь подключение из Node.js

Создай тестовый файл `test-redis.mjs`:

```javascript
import { createClient } from 'redis';

const client = createClient({
  url: 'redis://localhost:6379'
});

client.on('error', (err) => console.error('Redis Error:', err));

await client.connect();

console.log('✅ Connected to Redis');

const version = await client.info('server');
const match = version.match(/redis_version:(\d+\.\d+\.\d+)/);
console.log(`📊 Redis version: ${match ? match[1] : 'Unknown'}`);

await client.set('test', 'Hello Redis!');
const value = await client.get('test');
console.log(`✅ Test value: ${value}`);

await client.disconnect();
console.log('✅ Disconnected');
```

Запусти:
```bash
npm install redis
node test-redis.mjs
```

Должно вывести:
```
✅ Connected to Redis
📊 Redis version: 7.2.4
✅ Test value: Hello Redis!
✅ Disconnected
```

### 4. Запусти Worker

```bash
npm run dev:worker
```

Теперь не должно быть ошибок о версии!

---

## 🐛 Troubleshooting

### Ошибка: "ERR unknown command 'GETEX'"

**Причина:** Redis версии < 6.0

**Решение:**
1. Обнови Redis до версии 6.0+
2. Используй Docker с `redis:7-alpine`

---

### Ошибка: "ECONNREFUSED 127.0.0.1:6379"

**Причина:** Redis не запущен

**Решение:**

**Если Docker:**
```bash
docker start redis
# Или создай новый
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

**Если WSL:**
```bash
sudo service redis-server start
```

**Если Windows native:**
```bash
redis-server --service-start
```

---

### Worker запускается, но задачи не выполняются

**Проверь логи Worker:**
```bash
npm run dev:worker
```

**Проверь очередь в Redis:**
```bash
redis-cli
> KEYS *
> LLEN bull:parse:wait
```

**Очисти очередь (если нужно):**
```bash
redis-cli
> FLUSHALL
```

Затем перезапусти Worker.

---

### Redis занимает много памяти

**Настрой лимит памяти:**

Создай файл `redis.conf`:
```conf
maxmemory 256mb
maxmemory-policy allkeys-lru
```

**Для Docker:**
```bash
docker run -d --name redis \
  -p 6379:6379 \
  -v $(pwd)/redis.conf:/usr/local/etc/redis/redis.conf \
  redis:7-alpine redis-server /usr/local/etc/redis/redis.conf
```

---

## 📊 Мониторинг Redis

### Через redis-cli

```bash
# Статистика
redis-cli INFO

# Мониторинг команд в реальном времени
redis-cli MONITOR

# Список всех ключей
redis-cli KEYS *

# Размер БД
redis-cli DBSIZE
```

### Через GUI (опционально)

**RedisInsight (официальный):**
- Скачай: https://redis.com/redis-enterprise/redis-insight/
- Визуальный интерфейс для Redis
- Просмотр очередей BullMQ

**Another Redis Desktop Manager (бесплатный):**
- Скачай: https://github.com/qishibo/AnotherRedisDesktopManager
- Простой и быстрый

---

## 🎯 Рекомендации

### Для разработки
✅ **Docker** - самый простой вариант

```bash
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

### Для production
✅ **Managed Redis** - Redis Cloud, AWS ElastiCache, Azure Cache
- Автоматические обновления
- Резервное копирование
- Масштабирование

---

## 📝 Конфигурация в .env

```env
# Redis settings
REDIS_HOST=localhost        # Или IP сервера
REDIS_PORT=6379            # Порт по умолчанию
REDIS_PASSWORD=            # Если установлен пароль
```

Если используешь Docker на другом хосте:
```env
REDIS_HOST=192.168.1.100  # IP Docker хоста
```

---

## 🔗 Полезные ссылки

- [Redis Documentation](https://redis.io/documentation)
- [BullMQ Documentation](https://docs.bullmq.io/)
- [Docker Hub - Redis](https://hub.docker.com/_/redis)
- [Redis Commands](https://redis.io/commands)

---

📖 **Вернуться к:** [Главная документация](../README.md) | [Документация Worker](./WORKER.md)
