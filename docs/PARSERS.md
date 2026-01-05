# 🔍 Парсеры и Адаптеры

## 📖 Содержание

- [Обзор](#обзор)
- [Доступные парсеры](#доступные-парсеры)
- [Как работают адаптеры](#как-работают-адаптеры)
- [Использование](#использование)
- [Создание нового парсера](#создание-нового-парсера)
- [Best Practices](#best-practices)

---

## 🎯 Обзор

### Что делают парсеры?

Парсеры извлекают данные о вакансиях с веб-сайтов. Каждый сайт имеет свою структуру HTML и формат данных.

### Что делают адаптеры?

Адаптеры преобразуют данные из формата конкретного сайта в **единый унифицированный формат** для базы данных.

### Зачем нужна унификация?

```
❌ БЕЗ адаптеров:
rabota.md:  { "Зарплата": "500-1000 lei", "Предприятие": "..." }
999.md:     { "Salary": "€800", "Company Name": "..." }
makler.md:  { "salary_from": "1000", "employer": "..." }

✅ С адаптерами:
Все сайты → { 
  salaryMin: 500, 
  salaryMax: 1000, 
  salaryCurrency: "MDL",
  company: "..." 
}
```

---

## 🌐 Доступные парсеры

### 1. RabotaMdParser

**Сайт:** https://www.rabota.md  
**Файл:** `src/parsers/rabotaMd.ts`  
**Адаптер:** `src/parsers/adapters/rabota.adapter.ts`

**Особенности:**
- Парсит списки вакансий
- Опциональный парсинг детальных страниц
- Встроенное кэширование
- Rate limiting

**Пример использования:**
```typescript
import { RabotaMdParser } from './src/parsers/rabotaMd.js';

const parser = new RabotaMdParser({
  parseDetails: true,      // Парсить детальные страницы
  cacheEnabled: true,      // Включить кэш
  cacheTTLSeconds: 86400,  // TTL кэша 24 часа
  concurrency: 3           // Параллельных запросов
});

const result = await parser.parse({
  baseUrl: 'https://www.rabota.md',
  searchQuery: 'javascript',
  maxPages: 5
});

console.log(`Найдено: ${result.vacancies.length} вакансий`);
```

**Поля, которые парсит:**
- `title` - Название вакансии
- `company` - Компания
- `salary` - Зарплата (строка)
- `location` - Локация
- `description` - Краткое описание
- `fullDescription` - Полное описание (если parseDetails: true)
- `experience` - Требуемый опыт
- `education` - Образование
- `schedule` - График работы
- `workPlace` - Место работы (офис/удаленка)
- `url` - Ссылка на вакансию
- `publishedAt` - Дата публикации

---

### 2. NineNineNineMdParser

**Сайт:** https://999.md  
**Файл:** `src/parsers/nineNineNineMd.ts`  
**Адаптер:** `src/parsers/adapters/999.adapter.ts`

**Особенности:**
- Крупнейший сайт объявлений в Молдове
- Много дополнительных полей
- Поддержка сезонных вакансий
- Информация о типе работодателя

**Дополнительные поля:**
- `author` - Автор (Физ./Юр. лицо)
- `seasonal` - Сезонная работа
- `employmentType` - Тип занятости
- `companyType` - Тип компании
- `languages` - Языки
- `contactPerson` - Контактное лицо
- `region` - Регион

---

### 3. MaklerMdParser

**Сайт:** https://makler.md  
**Файл:** `src/parsers/maklerMd.ts`  
**Адаптер:** `src/parsers/adapters/makler.adapter.ts`

**Особенности:**
- Фокус на недвижимость, но есть вакансии
- Агентские и прямые вакансии
- Сферы деятельности

**Дополнительные поля:**
- `vacancyType` - Прямая/Агентство
- `industry` - Сфера деятельности
- `specialization` - Специализация

---

## 🔄 Как работают адаптеры

### Базовая структура адаптера

```typescript
// src/parsers/adapters/base.adapter.ts
export abstract class BaseVacancyAdapter {
  abstract sourceName: string;
  
  // Главный метод - преобразование вакансии
  abstract toPrisma(vacancy: ParsedVacancy): Prisma.VacancyCreateInput;
  
  // Вспомогательные методы
  protected extractSalaryMin(salary?: string): number | undefined;
  protected extractSalaryMax(salary?: string): number | undefined;
  protected extractCurrency(salary?: string): string | undefined;
  protected mapExperience(experience?: string): string | undefined;
  protected mapEmployment(schedule?: string): string | undefined;
  protected mapSchedule(workPlace?: string): string | undefined;
}
```

### Пример: RabotaMdAdapter

```typescript
// src/parsers/adapters/rabota.adapter.ts
export class RabotaMdAdapter extends BaseVacancyAdapter {
  sourceName = 'rabota.md';
  
  toPrisma(vacancy: ParsedVacancy): Prisma.VacancyCreateInput {
    return {
      // Унифицированные поля
      title: vacancy.title,
      company: vacancy.company || 'Не указана',
      description: vacancy.description || '',
      location: vacancy.location,
      
      // Зарплата - извлекаем числа из строки
      salaryMin: this.extractSalaryMin(vacancy.salary),
      salaryMax: this.extractSalaryMax(vacancy.salary),
      salaryCurrency: this.extractCurrency(vacancy.salary),
      
      // Маппинг опыта в стандартный формат
      experience: this.mapExperience(vacancy.experience),
      employment: this.mapEmployment(vacancy.schedule),
      schedule: this.mapSchedule(vacancy.workPlace),
      
      // Навыки
      skills: [],
      
      // Мета-данные
      source: this.sourceName,
      sourceId: vacancy.id,
      sourceUrl: vacancy.url,
      publishedAt: vacancy.publishedAt || new Date(),
      
      // Сырые данные сохраняем в rawData
      rawData: {
        education: vacancy.education,
        fullDescription: vacancy.fullDescription,
        firstSeenAt: vacancy.firstSeenAt,
        lastSeenAt: vacancy.lastSeenAt,
        isActive: vacancy.isActive,
      }
    };
  }
}
```

### Процесс преобразования зарплаты

```typescript
// Вход: "500-1000 lei" или "€800-1500" или "от 1000$"

protected extractSalaryMin(salary?: string): number | undefined {
  if (!salary) return undefined;
  const match = salary.match(/(\d+[\s,]*\d*)/);
  if (!match) return undefined;
  return parseInt(match[1].replace(/[\s,]/g, ''));
}

protected extractSalaryMax(salary?: string): number | undefined {
  if (!salary) return undefined;
  const matches = salary.match(/(\d+[\s,]*\d*)/g);
  if (!matches || matches.length < 2) return undefined;
  return parseInt(matches[matches.length - 1].replace(/[\s,]/g, ''));
}

protected extractCurrency(salary?: string): string | undefined {
  if (!salary) return undefined;
  if (salary.includes('MDL') || salary.includes('lei')) return 'MDL';
  if (salary.includes('USD') || salary.includes('$')) return 'USD';
  if (salary.includes('EUR') || salary.includes('€')) return 'EUR';
  return 'MDL'; // по умолчанию для молдавских сайтов
}

// Результат:
// salaryMin: 500
// salaryMax: 1000
// salaryCurrency: "MDL"
```

### Маппинг опыта работы

```typescript
protected mapExperience(experience?: string): string | undefined {
  if (!experience) return undefined;
  
  const exp = experience.toLowerCase();
  
  if (exp.includes('без опыта') || exp.includes('fără experiență')) {
    return 'no_experience';
  }
  if (exp.includes('1-3') || exp.includes('до 3')) {
    return 'between_1_and_3';
  }
  if (exp.includes('3-6') || exp.includes('3 до 6')) {
    return 'between_3_and_6';
  }
  if (exp.includes('более 6') || exp.includes('peste 6')) {
    return 'more_than_6';
  }
  
  return experience; // Возвращаем как есть если не распознали
}

// Пример:
// "Опыт работы: 3-6 лет" → "between_3_and_6"
```

---

## 💻 Использование

### Парсинг вручную

```typescript
import { RabotaMdParser } from './src/parsers/rabotaMd.js';
import { getAdapter } from './src/parsers/adapters/index.js';
import { vacancyService } from './src/api/services/vacancy.service.js';

// 1. Создать парсер
const parser = new RabotaMdParser({
  parseDetails: false,  // Без деталей для скорости
  cacheEnabled: true
});

// 2. Парсить вакансии
const result = await parser.parse({
  baseUrl: 'https://www.rabota.md',
  searchQuery: 'nodejs',
  maxPages: 3
});

console.log(`Найдено: ${result.vacancies.length}`);

// 3. Сохранить в БД через сервис (сервис использует адаптер внутри)
const { created, updated } = await vacancyService.saveVacancies(result.vacancies);

console.log(`Создано: ${created}, Обновлено: ${updated}`);
```

### Использование адаптера напрямую

```typescript
import { RabotaMdAdapter } from './src/parsers/adapters/rabota.adapter.js';
import { prisma } from './src/db/index.js';

const adapter = new RabotaMdAdapter();

// Преобразовать одну вакансию
const vacancy = { /* данные с rabota.md */ };
const unified = adapter.toPrisma(vacancy);

// Сохранить в БД
await prisma.vacancy.create({ data: unified });

// Или массово
const vacancies = [ /* массив вакансий */ ];
const unified = adapter.toPrismaMany(vacancies);

await prisma.vacancy.createMany({ data: unified });
```

### Получение адаптера из фабрики

```typescript
import { getAdapter } from './src/parsers/adapters/index.js';

// Получить адаптер по имени источника
const adapter = getAdapter('rabota.md');

const unified = adapter.toPrisma(vacancy);
```

---

## 🆕 Создание нового парсера

### Шаг 1: Создай файл парсера

```typescript
// src/parsers/mySite.ts
import axios from 'axios';
import * as cheerio from 'cheerio';
import { Parser, ParserConfig, ParseResult, Vacancy } from '../types/vacancy.js';

export class MySiteParser implements Parser {
  async parse(config: ParserConfig): Promise<ParseResult> {
    const vacancies: Vacancy[] = [];
    
    // 1. Получи HTML
    const response = await axios.get(config.baseUrl);
    const $ = cheerio.load(response.data);
    
    // 2. Парси вакансии
    $('.vacancy-item').each((i, el) => {
      const title = $(el).find('.title').text().trim();
      const company = $(el).find('.company').text().trim();
      const salary = $(el).find('.salary').text().trim();
      
      vacancies.push({
        id: `mysite-${i}`,
        title,
        company,
        salary,
        url: $(el).find('a').attr('href') || '',
        source: 'mysite.com'
      });
    });
    
    return {
      vacancies,
      totalFound: vacancies.length,
      page: 1,
      hasNextPage: false
    };
  }
  
  async parseVacancyDetails(url: string): Promise<Partial<Vacancy>> {
    // Парсинг детальной страницы
    return {};
  }
}
```

### Шаг 2: Создай адаптер

```typescript
// src/parsers/adapters/mysite.adapter.ts
import { BaseVacancyAdapter } from './base.adapter.js';
import { Vacancy as ParsedVacancy } from '../../types/vacancy.js';
import { Prisma } from '@prisma/client';

export class MySiteAdapter extends BaseVacancyAdapter {
  sourceName = 'mysite.com';
  
  toPrisma(vacancy: ParsedVacancy): Prisma.VacancyCreateInput {
    return {
      title: vacancy.title,
      company: vacancy.company || 'Не указана',
      description: vacancy.description || '',
      location: vacancy.location,
      
      salaryMin: this.extractSalaryMin(vacancy.salary),
      salaryMax: this.extractSalaryMax(vacancy.salary),
      salaryCurrency: this.extractCurrency(vacancy.salary),
      
      experience: this.mapExperience(vacancy.experience),
      employment: this.mapEmployment(vacancy.schedule),
      schedule: this.mapSchedule(vacancy.workPlace),
      
      skills: [],
      
      source: this.sourceName,
      sourceId: vacancy.id,
      sourceUrl: vacancy.url,
      publishedAt: vacancy.publishedAt || new Date(),
      
      rawData: { /* дополнительные поля */ }
    };
  }
}
```

### Шаг 3: Зарегистрируй адаптер

```typescript
// src/parsers/adapters/index.ts
import { MySiteAdapter } from './mysite.adapter.js';

const adapters: Record<SourceName, VacancyAdapter> = {
  'rabota.md': new RabotaMdAdapter(),
  '999.md': new NineNineNineMdAdapter(),
  'makler.md': new MaklerMdAdapter(),
  'mysite.com': new MySiteAdapter(), // ← Добавь
};
```

### Шаг 4: Используй

```typescript
const parser = new MySiteParser();
const result = await parser.parse({ baseUrl: 'https://mysite.com' });
await vacancyService.saveVacancies(result.vacancies);
```

---

## 🎯 Best Practices

### 1. Уважай сайты

```typescript
// ✅ Хорошо: задержки между запросами
await pause(2000); // 2 секунды между запросами

// ✅ Хорошо: реалистичный User-Agent
headers: {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)...'
}

// ❌ Плохо: слишком много запросов
for (let i = 0; i < 1000; i++) {
  await fetch(url); // без задержек
}
```

### 2. Обрабатывай ошибки

```typescript
try {
  const response = await axios.get(url);
} catch (error) {
  if (error.response?.status === 429) {
    // Too Many Requests - увеличь задержку
    await pause(10000);
    return retry();
  }
  throw error;
}
```

### 3. Используй кэш

```typescript
const parser = new RabotaMdParser({
  cacheEnabled: true,
  cacheTTLSeconds: 86400 // 24 часа
});
```

### 4. Логируй процесс

```typescript
console.log(`Парсинг страницы ${page}...`);
console.log(`Найдено ${vacancies.length} вакансий`);
console.log(`Сохранено: ${created} новых, ${updated} обновлено`);
```

### 5. Валидируй данные

```typescript
// ✅ Проверяй обязательные поля
if (!vacancy.title || !vacancy.url) {
  console.warn('Пропущена вакансия без title или url');
  continue;
}

// ✅ Очищай данные
const cleanTitle = vacancy.title.trim().replace(/\s+/g, ' ');
```

---

## 🔍 Отладка парсеров

### Логирование HTML

```typescript
// Сохрани HTML для отладки
import * as fs from 'fs/promises';

const response = await axios.get(url);
await fs.writeFile('debug.html', response.data);
```

### Проверка селекторов

```typescript
const $ = cheerio.load(html);

// Проверь что селектор работает
console.log($('.vacancy-item').length); // Сколько элементов найдено

// Проверь содержимое
$('.vacancy-item').each((i, el) => {
  console.log(`Вакансия ${i}:`, $(el).text());
});
```

### Тестирование адаптера

```typescript
const testVacancy = {
  title: 'Test Job',
  salary: '500-1000 lei',
  experience: '1-3 года'
};

const adapter = new RabotaMdAdapter();
const result = adapter.toPrisma(testVacancy);

console.log('salaryMin:', result.salaryMin); // 500
console.log('salaryMax:', result.salaryMax); // 1000
console.log('experience:', result.experience); // 'between_1_and_3'
```

---

📖 **Читай далее:**
- [Документация по API](./API.md)
- [Документация по Worker](./WORKER.md)
- [Архитектура системы](./ARCHITECTURE.md)
