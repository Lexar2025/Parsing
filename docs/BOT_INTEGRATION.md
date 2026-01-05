# 🤖 Bot Integration Guide

## 📖 Содержание

- [Создание бота](#создание-бота)
- [Установка зависимостей](#установка-зависимостей)
- [Базовая структура бота](#базовая-структура-бота)
- [Интеграция с API](#интеграция-с-api)
- [Команды бота](#команды-бота)
- [Подписки и уведомления](#подписки-и-уведомления)
- [Деплой бота](#деплой-бота)

---

## 🎯 Создание бота

### Шаг 1: Создай бота через BotFather

1. Открой Telegram и найди **@BotFather**
2. Отправь команду `/newbot`
3. Введи название бота (например: "Vacancy Hunter")
4. Введи username бота (должен заканчиваться на `bot`, например: `vacancy_hunter_bot`)

**BotFather выдаст токен:**
```
1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
```

⚠️ **Сохрани токен! Он нужен для работы бота!**

### Шаг 2: Настрой бота

Отправь BotFather:

```
/setdescription - Описание бота
🔍 Я помогу найти работу в Молдове! Парсю вакансии с rabota.md, 999.md и makler.md

/setabouttext - О боте
Vacancy Hunter Bot - поиск вакансий в Молдове

/setcommands - Команды бота
start - Начать работу
search - Найти вакансии
subscribe - Подписаться на вакансии
mysubscriptions - Мои подписки
settings - Настройки
help - Помощь
```

---

## 📦 Установка зависимостей

```bash
npm install node-telegram-bot-api axios dotenv
npm install -D @types/node-telegram-bot-api
```

**В .env добавь:**
```env
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
API_URL=http://localhost:3000
```

---

## 🏗️ Базовая структура бота

Создай файл `src/bot/index.ts`:

```typescript
import TelegramBot from 'node-telegram-bot-api';
import axios from 'axios';
import { prisma } from '../db/index.js';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const API_URL = process.env.API_URL || 'http://localhost:3000';

// Создаем экземпляр бота
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

console.log('🤖 Bot started!');

// Команда /start
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const user = msg.from;

  if (!user) return;

  // Создаем/обновляем пользователя в БД
  await prisma.user.upsert({
    where: { telegramId: BigInt(user.id) },
    create: {
      telegramId: BigInt(user.id),
      username: user.username,
      firstName: user.first_name,
      lastName: user.last_name,
      settings: {
        create: {
          language: user.language_code || 'ru'
        }
      }
    },
    update: {
      username: user.username,
      firstName: user.first_name,
      lastName: user.last_name
    }
  });

  const welcomeMessage = `
👋 Привет, ${user.first_name}!

Я помогу тебе найти работу в Молдове!

🔍 Парсю вакансии с:
• rabota.md
• 999.md
• makler.md

📌 Доступные команды:
/search - Найти вакансии
/subscribe - Подписаться на обновления
/mysubscriptions - Мои подписки
/settings - Настройки
/help - Помощь

Попробуй: /search nodejs
  `;

  bot.sendMessage(chatId, welcomeMessage);
});

// Команда /help
bot.onText(/\/help/, (msg) => {
  const helpMessage = `
📖 Как использовать бота:

1️⃣ Поиск вакансий:
   /search <запрос>
   Например: /search nodejs remote

2️⃣ Подписка на вакансии:
   /subscribe
   Получай уведомления о новых вакансиях

3️⃣ Мои подписки:
   /mysubscriptions
   Посмотреть и управлять подписками

4️⃣ Настройки:
   /settings
   Язык, уведомления и т.д.

💡 Совет: Используй ключевые слова для точного поиска
  `;

  bot.sendMessage(msg.chat.id, helpMessage);
});

// Graceful shutdown
process.on('SIGINT', () => {
  bot.stopPolling();
  prisma.$disconnect();
  process.exit(0);
});
```

---

## 🔌 Интеграция с API

### Поиск вакансий

```typescript
// Команда /search
bot.onText(/\/search (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const query = match![1].trim();

  try {
    // Показываем индикатор загрузки
    await bot.sendChatAction(chatId, 'typing');

    // Запрос к API
    const { data } = await axios.get(`${API_URL}/api/vacancies`, {
      params: {
        keywords: query,
        limit: 10
      }
    });

    if (data.data.length === 0) {
      await bot.sendMessage(chatId, '❌ Вакансии не найдены. Попробуй другой запрос.');
      return;
    }

    // Форматируем результаты
    let message = `🔍 Найдено ${data.meta.total} вакансий по запросу "${query}"\n\n`;

    data.data.forEach((vacancy: any, i: number) => {
      message += `${i + 1}️⃣ ${vacancy.title}\n`;
      message += `   💼 ${vacancy.company}\n`;
      message += `   📍 ${vacancy.location || 'Локация не указана'}\n`;
      
      if (vacancy.salaryMin && vacancy.salaryMax) {
        message += `   💰 ${vacancy.salaryMin}-${vacancy.salaryMax} ${vacancy.salaryCurrency}\n`;
      }
      
      if (vacancy.schedule) {
        const scheduleEmoji = {
          remote: '🏠',
          office: '🏢',
          hybrid: '🔄',
          flexible: '⏰'
        }[vacancy.schedule] || '📋';
        message += `   ${scheduleEmoji} ${vacancy.schedule}\n`;
      }
      
      message += `   🔗 ${vacancy.sourceUrl}\n\n`;
    });

    if (data.meta.updating) {
      message += '⏳ Данные обновляются, может появиться больше вакансий через несколько минут...';
    }

    await bot.sendMessage(chatId, message, {
      disable_web_page_preview: true
    });

  } catch (error) {
    console.error('Search error:', error);
    await bot.sendMessage(chatId, '❌ Ошибка при поиске вакансий. Попробуй позже.');
  }
});
```

### Расширенный поиск с фильтрами

```typescript
// Команда /search_advanced
bot.onText(/\/search_advanced/, async (msg) => {
  const chatId = msg.chat.id;

  // Inline клавиатура для выбора фильтров
  const keyboard = {
    inline_keyboard: [
      [
        { text: '💼 Тип работы', callback_data: 'filter:schedule' },
        { text: '💰 Зарплата', callback_data: 'filter:salary' }
      ],
      [
        { text: '📍 Локация', callback_data: 'filter:location' },
        { text: '📊 Опыт', callback_data: 'filter:experience' }
      ],
      [
        { text: '🔍 Поиск', callback_data: 'search:apply' }
      ]
    ]
  };

  await bot.sendMessage(
    chatId,
    '🔧 Настрой фильтры для поиска:',
    { reply_markup: keyboard }
  );
});

// Обработка callback'ов от кнопок
bot.on('callback_query', async (query) => {
  const chatId = query.message!.chat.id;
  const data = query.data!;

  if (data === 'filter:schedule') {
    const keyboard = {
      inline_keyboard: [
        [{ text: '🏠 Удаленная', callback_data: 'schedule:remote' }],
        [{ text: '🏢 Офис', callback_data: 'schedule:office' }],
        [{ text: '🔄 Гибрид', callback_data: 'schedule:hybrid' }],
        [{ text: '⬅️ Назад', callback_data: 'back' }]
      ]
    };

    await bot.editMessageText('Выбери тип работы:', {
      chat_id: chatId,
      message_id: query.message!.message_id,
      reply_markup: keyboard
    });
  }

  // И так далее для других фильтров...
});
```

---

## 📋 Команды бота

### /start - Приветствие и регистрация

```typescript
bot.onText(/\/start/, async (msg) => {
  // Код выше
});
```

### /search - Поиск вакансий

```typescript
bot.onText(/\/search (.+)/, async (msg, match) => {
  // Код выше
});
```

### /subscribe - Создать подписку

```typescript
bot.onText(/\/subscribe/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from!.id;

  // Получаем пользователя из БД
  const user = await prisma.user.findUnique({
    where: { telegramId: BigInt(userId) }
  });

  if (!user) {
    await bot.sendMessage(chatId, 'Сначала напиши /start');
    return;
  }

  const message = `
📬 Создание подписки

Отправь мне фильтры в формате:
keywords: nodejs, javascript
location: chisinau
salary: 1000

Или используй /subscribe_wizard для пошагового создания
  `;

  await bot.sendMessage(chatId, message);
  
  // Ждем ответа от пользователя
  // Можно использовать state management (например, через Redis)
});
```

### /mysubscriptions - Список подписок

```typescript
bot.onText(/\/mysubscriptions/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from!.id;

  // Получаем подписки пользователя
  const subscriptions = await prisma.subscription.findMany({
    where: {
      user: {
        telegramId: BigInt(userId)
      }
    }
  });

  if (subscriptions.length === 0) {
    await bot.sendMessage(
      chatId,
      'У тебя пока нет подписок. Создай через /subscribe'
    );
    return;
  }

  let message = '📬 Твои подписки:\n\n';

  subscriptions.forEach((sub, i) => {
    const filters = sub.filters as any;
    const status = sub.isActive ? '✅' : '❌';
    
    message += `${i + 1}. ${status} Подписка\n`;
    message += `   🔍 Ключевые слова: ${filters.keywords?.join(', ') || 'Любые'}\n`;
    message += `   📍 Локация: ${filters.locations?.join(', ') || 'Любая'}\n`;
    message += `   💰 Зарплата от: ${filters.salaryMin || 'Не указано'}\n`;
    message += `   📊 Источники: ${sub.sources.join(', ')}\n`;
    message += `   /unsub_${sub.id}\n\n`;
  });

  await bot.sendMessage(chatId, message);
});
```

### /settings - Настройки

```typescript
bot.onText(/\/settings/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from!.id;

  const user = await prisma.user.findUnique({
    where: { telegramId: BigInt(userId) },
    include: { settings: true }
  });

  if (!user || !user.settings) {
    await bot.sendMessage(chatId, 'Ошибка загрузки настроек');
    return;
  }

  const keyboard = {
    inline_keyboard: [
      [
        { 
          text: `🔔 Уведомления: ${user.settings.notificationsOn ? 'Вкл' : 'Выкл'}`,
          callback_data: 'toggle:notifications'
        }
      ],
      [
        {
          text: `🌐 Язык: ${user.settings.language}`,
          callback_data: 'change:language'
        }
      ],
      [
        {
          text: `📊 Макс. уведомлений: ${user.settings.maxNotifications}`,
          callback_data: 'change:maxNotifications'
        }
      ]
    ]
  };

  await bot.sendMessage(chatId, '⚙️ Настройки:', {
    reply_markup: keyboard
  });
});
```

---

## 🔔 Подписки и уведомления

### Worker задача для проверки подписок

Создай `src/worker/jobs/notifyJob.ts`:

```typescript
import { Job } from 'bullmq';
import { prisma } from '../../db/index.js';
import { vacancyService } from '../../api/services/vacancy.service.js';
import TelegramBot from 'node-telegram-bot-api';

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN!, { polling: false });

export async function notifyJobProcessor(job: Job) {
  job.log('Checking subscriptions...');

  // Получить все активные подписки
  const subscriptions = await prisma.subscription.findMany({
    where: { isActive: true },
    include: { 
      user: { 
        include: { settings: true } 
      } 
    }
  });

  job.log(`Found ${subscriptions.length} active subscriptions`);

  for (const sub of subscriptions) {
    // Пропускаем если уведомления выключены
    if (!sub.user.settings?.notificationsOn) {
      continue;
    }

    // Ищем новые вакансии с момента последнего уведомления
    const since = sub.lastNotified || sub.createdAt;

    const newVacancies = await vacancyService.findByFilters({
      ...(sub.filters as any),
      sources: sub.sources,
      publishedAfter: since,
      limit: sub.user.settings.maxNotifications
    });

    if (newVacancies.length === 0) {
      continue;
    }

    // Форматируем сообщение
    let message = `🔔 Найдено ${newVacancies.length} новых вакансий!\n\n`;

    newVacancies.forEach((v, i) => {
      message += `${i + 1}. ${v.title}\n`;
      message += `   💼 ${v.company}\n`;
      message += `   📍 ${v.location || 'Не указана'}\n`;
      if (v.salaryMin) {
        message += `   💰 ${v.salaryMin}-${v.salaryMax} ${v.salaryCurrency}\n`;
      }
      message += `   🔗 ${v.sourceUrl}\n\n`;
    });

    // Отправляем уведомление
    try {
      await bot.sendMessage(sub.user.telegramId.toString(), message, {
        disable_web_page_preview: true
      });

      // Обновляем время последнего уведомления
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { lastNotified: new Date() }
      });

      job.log(`Notified user ${sub.user.telegramId} about ${newVacancies.length} vacancies`);
    } catch (error) {
      job.log(`Failed to notify user ${sub.user.telegramId}: ${error}`);
    }
  }

  return { success: true, notified: subscriptions.length };
}
```

### Добавь задачу в Worker

В `src/worker/worker.ts`:

```typescript
import { notifyJobProcessor } from './jobs/notifyJob.js';

// Создай очередь для уведомлений
export const notifyQueue = new Queue('notify', { connection });

// Worker для уведомлений
const notifyWorker = new Worker('notify', notifyJobProcessor, {
  connection,
  concurrency: 1
});

// Добавь периодическую задачу
await notifyQueue.add(
  'check-subscriptions',
  {},
  {
    repeat: {
      every: config.worker.notifyInterval // 2 часа
    },
    jobId: 'periodic-notify'
  }
);
```

---

## 🚀 Запуск бота

### Development

```bash
# В отдельном терминале
npm run dev:bot

# Или создай скрипт в package.json
"dev:bot": "tsx src/bot/index.ts"
```

### Production

```bash
npm run build
node build/src/bot/index.js
```

### Используй PM2 для автоперезапуска

```bash
npm install -g pm2

pm2 start build/src/bot/index.js --name vacancy-bot
pm2 logs vacancy-bot
pm2 restart vacancy-bot
pm2 stop vacancy-bot
```

---

## 🎯 Best Practices

### 1. Обрабатывай ошибки

```typescript
bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});

bot.on('error', (error) => {
  console.error('Bot error:', error);
});
```

### 2. Ограничивай частоту запросов

```typescript
const userLastRequest = new Map();

bot.on('message', (msg) => {
  const userId = msg.from!.id;
  const now = Date.now();
  const last = userLastRequest.get(userId) || 0;

  if (now - last < 1000) { // 1 секунда между запросами
    bot.sendMessage(msg.chat.id, '⏱️ Подожди секунду...');
    return;
  }

  userLastRequest.set(userId, now);
  // Обработка сообщения...
});
```

### 3. Используй inline клавиатуры

```typescript
const keyboard = {
  inline_keyboard: [
    [
      { text: 'Да', callback_data: 'confirm:yes' },
      { text: 'Нет', callback_data: 'confirm:no' }
    ]
  ]
};

bot.sendMessage(chatId, 'Подтверди действие:', {
  reply_markup: keyboard
});
```

### 4. Логируй все действия

```typescript
bot.on('message', (msg) => {
  console.log(`[${new Date().toISOString()}] User ${msg.from!.id}: ${msg.text}`);
});
```

---

## 📊 Мониторинг бота

### Статистика использования

```typescript
// Добавь в БД таблицу BotStats
model BotStats {
  id        String   @id @default(cuid())
  command   String
  userId    String
  createdAt DateTime @default(now())
}

// Логируй команды
bot.onText(/\/(.+)/, async (msg, match) => {
  await prisma.botStats.create({
    data: {
      command: match![1],
      userId: msg.from!.id.toString()
    }
  });
});

// Получай статистику
const stats = await prisma.botStats.groupBy({
  by: ['command'],
  _count: { id: true },
  orderBy: { _count: { id: 'desc' } }
});
```

---

## 🎉 Готово!

Теперь у тебя есть полнофункциональный Telegram бот интегрированный с системой парсинга вакансий!

**Что дальше:**
- Добавь больше команд
- Улучши форматирование сообщений
- Добавь аналитику
- Создай админ-панель

---

📖 **Читай далее:**
- [Документация по API](./API.md)
- [Документация по Worker](./WORKER.md)
- [Telegram Bot API](https://core.telegram.org/bots/api)
