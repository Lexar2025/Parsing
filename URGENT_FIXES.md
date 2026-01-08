# 🔧 СРОЧНЫЕ ИСПРАВЛЕНИЯ

## Проблема 1: Prisma клиент не сгенерирован ❌

**Ошибка:** `searchQuery does not exist in type 'ParseLogWhereInput'`

**Решение:**
```bash
# 1. Сгенерировать Prisma клиент
npm run db:generate

# 2. Или напрямую
npx prisma generate
```

---

## Проблема 2: Повторный запрос парсится снова ❌

**Суть проблемы:** VacancyManager проверяет `vacancies.length === 0` (общее количество), но не учитывает что вакансии могут быть по ДРУГИМ поисковым запросам!

**Пример:**
1. Парсим "developer" → 100 вакансий в БД
2. Повторный запрос "developer" → вакансий НЕТ (по фильтрам), но в БД ЕСТЬ 100 вакансий по "programmer"
3. Система думает что БД пуста → парсит СНОВА

**Решение:** Нужно проверять не общее количество, а "был ли уже УСПЕШНЫЙ парсинг с ЭТИМ searchQuery".

---

## Проблема 3: Парсинг 999.md падает с ошибкой `__name is not defined` ✅ ИСПРАВЛЕНО

**Ошибка:** `ReferenceError: __name is not defined`

**Причина:** TypeScript добавляет декораторы к функциям внутри `page.evaluate()`, которые Puppeteer не может сериализовать.

**Решение:** ✅ Уже исправлено - функция `getFeatureValue` убрана, используется `Map` напрямую.

---

## Проблема 4: makler.md не парсится ❓

Нужно проверить логи - почему не запускается. Возможно:
- Парсер не реализован полностью
- Ошибка при инициализации
- Проблема с Cloudflare

---

## 🚀 ЧТО ДЕЛАТЬ СЕЙЧАС:

### Шаг 1: Сгенерировать Prisma клиент
```bash
npm run db:generate
```

### Шаг 2: Исправить логику VacancyManager

Нужно изменить проверку:

**БЫЛО:**
```typescript
if (vacancies.length === 0) {
  // Проверяем был ли уже парсинг с ЭТИМ запросом
  const recentParse = parseHistory.find(p => p.wasRecentlyParsed);
  
  if (recentParse) {
    needsParsing = false; // ← НЕПРАВИЛЬНО!
  }
}
```

**ДОЛЖНО БЫТЬ:**
```typescript
// Проверяем был ли хотя бы ОДИН недавний парсинг с ЭТИМ запросом
const hasRecentParse = parseHistory.some(p => p.wasRecentlyParsed);

if (!hasRecentParse) {
  // Ни один источник не парсился недавно с ЭТИМ запросом
  needsParsing = true;
  parseReason = 'Нет недавнего парсинга для этого запроса';
}
```

### Шаг 3: Пересобрать и запустить
```bash
npm run build
npm run dev:api
```

---

## 📝 Подробное объяснение логики

### Правильная логика работы:

```
1. Пользователь ищет "developer"
2. VacancyManager проверяет ParseLog:
   - rabota.md + "developer" → последний парсинг 1 час назад ✅
   - 999.md + "developer" → последний парсинг 1 час назад ✅
   - makler.md + "developer" → НЕТ записей ❌

3. Если ВСЕ источники парсились недавно:
   → НЕ парсим, берем из БД (cache)
   
4. Если ХОТЯ БЫ ОДИН источник НЕ парсился:
   → Парсим ТОЛЬКО те источники, которые не парсились (fresh)
```

### Текущая НЕПРАВИЛЬНАЯ логика:

```
1. Пользователь ищет "developer"
2. VacancyManager ищет вакансии в БД
3. Если НЕ НАШЕЛ вакансии (vacancies.length === 0):
   → Проверяет был ли парсинг
   → Если БЫЛ хотя бы в одном источнике → НЕ парсит
   → Возвращает ПУСТОЙ массив ❌ НЕПРАВИЛЬНО!
```

---

## 🔧 ИСПРАВЛЕНИЕ vacancyManager.ts

```typescript
/**
 * Главный метод поиска вакансий
 */
async search(filters: SearchFilters): Promise<SearchResult> {
  const sources = filters.sources || ['rabota.md', '999.md', 'makler.md'];
  const searchQuery = filters.keywords?.[0] || 'работа';

  console.log(`🔍 Поиск вакансий:`, { 
    keywords: filters.keywords, 
    sources 
  });

  // 1. Проверяем историю парсинга для ЭТОГО запроса
  const parseHistory = await this.checkParseHistory(sources, searchQuery);
  
  // 2. Определяем какие источники нужно парсить
  const sourcesToParse = parseHistory
    .filter(p => !p.wasRecentlyParsed)
    .map(p => p.source);

  // 3. Если есть источники для парсинга → парсим их
  if (sourcesToParse.length > 0) {
    console.log(`📭 Запускаю парсинг источников: ${sourcesToParse.join(', ')}`);
    console.log(`   Причина: нет недавнего парсинга для запроса "${searchQuery}"`);
    
    await this.parseNow(sourcesToParse, filters, searchQuery);
    
    // Получаем свежие данные
    const vacancies = await vacancyService.findByFilters({
      ...filters,
      sources
    });
    
    return {
      vacancies,
      meta: {
        total: vacancies.length,
        source: 'fresh',
        lastUpdate: new Date(),
        updating: false,
        parseReason: `Парсинг ${sourcesToParse.length} источников`
      }
    };
  }

  // 4. Все источники парсились недавно → берем из БД
  const vacancies = await vacancyService.findByFilters({
    ...filters,
    sources
  });

  const lastUpdate = parseHistory.reduce((latest, p) => {
    if (!p.lastParse) return latest;
    return !latest || p.lastParse > latest ? p.lastParse : latest;
  }, null as Date | null);

  return {
    vacancies,
    meta: {
      total: vacancies.length,
      source: 'cache',
      lastUpdate,
      updating: false
    }
  };
}
```

---

## ✅ После исправлений проверить:

1. ✅ `npm run db:generate` выполнен
2. ✅ TypeScript компилируется без ошибок
3. ✅ Первый запрос запускает парсинг
4. ✅ Повторный запрос берет данные из кеша
5. ✅ Парсер 999.md работает без ошибок
6. ✅ Парсер makler.md запускается

---

## 🎯 Ожидаемое поведение:

```bash
# Первый запрос
curl "http://localhost:3000/api/vacancies?keywords=developer"
→ Парсинг запущен (source=fresh)
→ Логи: "Запускаю парсинг источников: rabota.md, 999.md, makler.md"

# Повторный запрос (через 1 секунду)
curl "http://localhost:3000/api/vacancies?keywords=developer"
→ Данные из БД (source=cache)
→ Логи: "Все источники парсились недавно, беру из БД"

# Новый запрос
curl "http://localhost:3000/api/vacancies?keywords=python"
→ Парсинг запущен (source=fresh)
→ Логи: "Запускаю парсинг источников: rabota.md, 999.md, makler.md"
```
