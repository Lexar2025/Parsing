# 📝 Примеры использования интеграции hh.ru

## Быстрый старт

### 1. Локальный поиск (по умолчанию)

```bash
# Поиск программистов на локальных сайтах
npm run parse "программист" "программист"

# Поиск грузчиков
npm run parse "грузчик" "грузчик"

# Поиск без указания категории (все вакансии)
npm run parse
```

**Что произойдет**:
- Автоматически определится стратегия `local`
- Будут спарсены сайты: rabota.md, 999.md, makler.md
- Результат сохранится в файл `vacancies_local_<timestamp>.json`

---

### 2. Международный поиск

```bash
# Поиск программистов в России
npm run parse "программист за рубежом" "программист"

# Поиск работы в Москве
npm run parse "работа в Москве программист"

# Поиск с явным указанием стратегии
npm run parse "программист" "программист" "international"
```

**Что произойдет**:
- Автоматически определится стратегия `international`
- Будет спарсен только hh.ru
- Результат сохранится в файл `vacancies_international_<timestamp>.json`

---

### 3. Гибридный поиск

```bash
# Поиск на всех доступных площадках
npm run parse "программист" "программист" "hybrid"

# Поиск с ключевыми словами (автоопределение)
npm run parse "программист работа в России и Молдове"
```

**Что произойдет**:
- Будут спарсены все источники: rabota.md, 999.md, makler.md, hh.ru
- Результат сохранится в файл `vacancies_hybrid_<timestamp>.json`

---

## Расширенные примеры

### 4. Поиск с фильтрами

```bash
# Поиск с указанием зарплаты (только для hh.ru)
npm run parse "программист" "программист" "international" -- --salary 100000

# Поиск с указанием опыта
npm run parse "senior программист" "программист" "international" -- --experience moreThan6

# Поиск удаленной работы
npm run parse "удаленная работа программист" "программист" "international"
```

---

### 5. Пакетный парсинг

```bash
# Парсинг разных категорий последовательно
npm run parse "программист" "программист" "local"
npm run parse "дизайнер" "дизайнер" "local"
npm run parse "менеджер" "менеджер" "local"

# Затем международный поиск
npm run parse "программист" "программист" "international"
```

---

### 6. Автоматизированный парсинг

Создайте скрипт `batch-parse.sh` (Linux/Mac) или `batch-parse.bat` (Windows):

```bash
#!/bin/bash
# batch-parse.sh

echo "🚀 Запуск пакетного парсинга..."

# Локальные категории
CATEGORIES=("программист" "дизайнер" "менеджер" "грузчик" "офис")

for CATEGORY in "${CATEGORIES[@]}"; do
  echo "📋 Парсинг категории: $CATEGORY"
  npm run parse "$CATEGORY" "$CATEGORY" "local"
  sleep 5  # Пауза между парсингами
done

# Международный поиск для программистов
echo "🌍 Парсинг международных вакансий..."
npm run parse "программист за рубежом" "программист" "international"

echo "✅ Пакетный парсинг завершен!"
```

---

### 7. Интеграция с БД

```typescript
// Пример: Сохранение результатов в базу данных
import { PrismaClient } from '@prisma/client';
import { VacancyManager } from './utils/vacancyManager';

async function saveToDatabase(vacancies: any[]) {
  const prisma = new PrismaClient();
  const manager = new VacancyManager();
  
  try {
    // Фильтруем только новые вакансии
    const newVacancies = vacancies.filter(v => v.isActive);
    
    // Сохраняем в БД
    for (const vacancy of newVacancies) {
      await prisma.vacancy.upsert({
        where: { url: vacancy.url },
        update: {
          title: vacancy.title,
          company: vacancy.company,
          salary: vacancy.salary,
          lastSeenAt: new Date(),
          isActive: true,
        },
        create: {
          ...vacancy,
          firstSeenAt: new Date(),
          lastSeenAt: new Date(),
        },
      });
    }
    
    console.log(`✅ Сохранено ${newVacancies.length} вакансий в БД`);
  } catch (error) {
    console.error('❌ Ошибка сохранения в БД:', error);
  } finally {
    await prisma.$disconnect();
  }
}
```

---

### 8. Фильтрация результатов

```typescript
// Пример: Фильтрация вакансий по критериям
import { Vacancy } from './types/vacancy';

function filterVacancies(vacancies: Vacancy[], criteria: {
  minSalary?: number;
  maxSalary?: number;
  remoteOnly?: boolean;
  experience?: string;
}): Vacancy[] {
  return vacancies.filter(vacancy => {
    // Фильтр по минимальной зарплате
    if (criteria.minSalary && vacancy.salaryFrom) {
      if (vacancy.salaryFrom < criteria.minSalary) {
        return false;
      }
    }
    
    // Фильтр по максимальной зарплате
    if (criteria.maxSalary && vacancy.salaryTo) {
      if (vacancy.salaryTo > criteria.maxSalary) {
        return false;
      }
    }
    
    // Фильтр только удаленная работа
    if (criteria.remoteOnly && !vacancy.remote) {
      return false;
    }
    
    // Фильтр по опыту
    if (criteria.experience && vacancy.experience !== criteria.experience) {
      return false;
    }
    
    return true;
  });
}

// Использование
const filtered = filterVacancies(allVacancies, {
  minSalary: 100000,
  remoteOnly: true,
  experience: 'between_1_and_3',
});
```

---

### 9. Экспорт в разные форматы

```typescript
// Пример: Экспорт вакансий в разные форматы
import { writeFileSync } from 'fs';
import { Vacancy } from './types/vacancy';

// Экспорт в JSON
function exportToJson(vacancies: Vacancy[], filename: string) {
  writeFileSync(filename, JSON.stringify(vacancies, null, 2));
  console.log(`✅ Экспортировано в ${filename}`);
}

// Экспорт в CSV
function exportToCsv(vacancies: Vacancy[], filename: string) {
  const headers = ['Title', 'Company', 'Salary', 'Location', 'URL'];
  const rows = vacancies.map(v => 
    `"${v.title}","${v.company || ''}","${v.salary || ''}","${v.location || ''}","${v.url}"`
  );
  
  const csv = [headers.join(','), ...rows].join('\n');
  writeFileSync(filename, csv);
  console.log(`✅ Экспортировано в ${filename}`);
}

// Экспорт в удобочитаемый текст
function exportToText(vacancies: Vacancy[], filename: string) {
  const text = vacancies.map((v, i) => 
    `${i + 1}. ${v.title}\n` +
    `   Компания: ${v.company || 'Не указана'}\n` +
    `   Зарплата: ${v.salary || 'Не указана'}\n` +
    `   Местоположение: ${v.location || 'Не указано'}\n` +
    `   Ссылка: ${v.url}\n`
  ).join('\n');
  
  writeFileSync(filename, text);
  console.log(`✅ Экспортировано в ${filename}`);
}
```

---

### 10. Мониторинг и логирование

```typescript
// Пример: Расширенное логирование
import { Logger } from './utils/logger';

async function parseWithMonitoring() {
  const logger = new Logger('Parser');
  
  logger.info('Запуск парсинга');
  
  try {
    // Парсинг...
    const result = await parser.parse(config);
    
    logger.success(`Найдено ${result.totalFound} вакансий`);
    logger.info(`Страниц обработано: ${result.page + 1}`);
    
    if (result.hasNextPage) {
      logger.warn('Есть еще страницы для обработки');
    }
    
  } catch (error) {
    logger.error('Ошибка парсинга', { error });
    throw error;
  }
}

// Статистика
function printStatistics(vacancies: any[]) {
  const stats = {
    total: vacancies.length,
    active: vacancies.filter(v => v.isActive).length,
    withSalary: vacancies.filter(v => v.salary).length,
    remote: vacancies.filter(v => v.remote).length,
    bySource: {} as Record<string, number>,
  };
  
  vacancies.forEach(v => {
    stats.bySource[v.source] = (stats.bySource[v.source] || 0) + 1;
  });
  
  console.log('Статистика:');
  console.log(`  Всего: ${stats.total}`);
  console.log(`  Активных: ${stats.active}`);
  console.log(`  С зарплатой: ${stats.withSalary}`);
  console.log(`  Удаленных: ${stats.remote}`);
  console.log('  По источникам:', stats.bySource);
}
```

---

## 🎯 Практические сценарии

### Сценарий 1: Ежедневный парсинг

```bash
#!/bin/bash
# daily-parse.sh

DATE=$(date +%Y-%m-%d)
LOG_FILE="logs/parse_$DATE.log"

echo "📅 Парсинг на $DATE" | tee -a $LOG_FILE

# Локальный поиск
echo "📍 Локальный поиск..." | tee -a $LOG_FILE
npm run parse "программист" "программист" "local" 2>&1 | tee -a $LOG_FILE

# Международный поиск (если будний день)
if [ $(date +%u) -le 5 ]; then
  echo "🌍 Международный поиск..." | tee -a $LOG_FILE
  npm run parse "программист за рубежом" "программист" "international" 2>&1 | tee -a $LOG_FILE
fi

echo "✅ Парсинг завершен!" | tee -a $LOG_FILE
```

### Сценарий 2: Парсинг по расписанию (cron)

```bash
# crontab -e
# Запуск каждый будний день в 9:00 утра
0 9 * * 1-5 /path/to/Parsing/daily-parse.sh
```

### Сценарий 3: Интеграция с телеграм-ботом

```typescript
import { Telegraf } from 'telegraf';

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.command('vacancies', async (ctx) => {
  const query = ctx.message.text.split(' ').slice(1).join(' ');
  
  if (!query) {
    return ctx.reply('Укажите поисковый запрос, например: /vacancies программист');
  }
  
  // Запуск парсинга
  const result = await parseVacancies(query);
  
  // Отправка результатов
  const message = result.vacancies.slice(0, 5).map((v, i) => 
    `${i + 1}. ${v.title}\n${v.company}\n${v.salary}\n${v.url}`
  ).join('\n\n');
  
  ctx.reply(message);
});

bot.startPolling();
```

---

## 📚 Дополнительные ресурсы

- [Полная документация](./README_INDEX.md)
- [Пошаговое руководство](./INTEGRATION_STEP_BY_STEP.md)
- [Чек-лист задач](./INTEGRATION_CHECKLIST.md)
- [Примеры кода в проекте](../src/)

---

**Последнее обновление**: 28 января 2026  
**Версия**: 1.0
