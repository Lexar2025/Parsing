# 🔧 ИНСТРУКЦИЯ ПО ИСПРАВЛЕНИЮ

## ❌ Проблемы которые были:

1. **Парсеры 999.md и makler.md не подключены в Worker** 
   - В `src/worker/jobs/parseJob.ts` были только TODO комментарии
   - Из-за этого фоновый парсинг падал с ошибкой "Parser not implemented"

2. **Синонимы не видны в БД**
   - Нужно обновить словарики вручную

---

## ✅ ЧТО ИСПРАВЛЕНО:

### 1. Добавлены парсеры в Worker

**Файл:** `src/worker/jobs/parseJob.ts`

**Добавлено:**
- Импорт `NineNineNineMdParser` и `MaklerMdParser`
- Case блоки для обработки источников 999.md и makler.md
- Правильная настройка парсеров (headless: true, concurrency: 3)

---

## 🚀 ЧТО НУЖНО СДЕЛАТЬ СЕЙЧАС:

### Шаг 1: Пересобрать проект
```bash
npm run build
```

### Шаг 2: Обновить словарики (чтобы увидеть синонимы)
```bash
# Вариант 1: Через скрипт
npm run dict:update

# Вариант 2: Через API (после запуска сервера)
curl -X POST http://localhost:3000/api/dictionaries/update
```

Это запарсит справочники профессий со всех 3 сайтов и автоматически сгенерирует синонимы.

### Шаг 3: Запустить Worker
```bash
npm run dev:worker
```

**Должно быть:**
```
✅ Redis подключен успешно!
🔧 Worker запущен
```

### Шаг 4: Запустить API (в другом терминале)
```bash
npm run dev:api
```

**Должно быть:**
```
✅ Redis Queue подключена (фоновое обновление доступно)
🚀 API Server running on http://localhost:3000
```

---

## 🧪 ТЕСТИРОВАНИЕ:

### Тест 1: Проверить что словарики обновились и синонимы появились

```bash
curl "http://localhost:3000/api/dictionaries?source=rabota.md" | jq
```

**Ожидаемый результат:**
```json
{
  "success": true,
  "data": {
    "source": "rabota.md",
    "professions": [
      {
        "profession": "Программист",
        "synonyms": ["разработчик", "developer", "кодер"]  ⬅️ ВОТ ЭТО!
      },
      {
        "profession": "Водитель",
        "synonyms": ["driver", "шофер"]
      }
    ]
  }
}
```

### Тест 2: Проверить фоновый парсинг для 999.md

```bash
# Сделать запрос с устаревшими данными
curl "http://localhost:3000/api/vacancies?keywords=Программист&source=999.md"
```

**В логах API должно быть:**
```
📊 Найдено в БД: 16 вакансий
📊 История парсинга для "Программист":
   999.md: ❌ устарел (никогда)
⏰ Запускаю фоновое обновление для: 999.md
   📋 Задача фонового парсинга добавлена: 999.md  ⬅️ РАБОТАЕТ!
```

**В логах Worker должно быть:**
```
Starting parse for 999.md
Found 50 vacancies
✅ Парсинг завершен: {
  success: true,
  source: '999.md',
  found: 50,
  created: 10,
  updated: 40
}
```

### Тест 3: Семантический поиск

```bash
curl "http://localhost:3000/api/dictionaries/search?query=разработчик"
```

**Ожидается:**
```json
{
  "success": true,
  "data": {
    "searchQuery": "разработчик",
    "mappings": [
      {
        "source": "rabota.md",
        "profession": "Программист",
        "similarity": 0.9  ⬅️ Нашло через синонимы!
      },
      {
        "source": "999.md",
        "profession": "Разработчик",
        "similarity": 1.0
      }
    ]
  }
}
```

### Тест 4: Поиск вакансий с семантическим поиском

```bash
curl "http://localhost:3000/api/vacancies?keywords=разработчик&useSemanticSearch=true"
```

**Должно:**
1. Найти совпадения в словариках
2. Вернуть кешированные данные
3. Запустить фоновое обновление с точными названиями

**В логах:**
```
🧠 Семантический поиск для "разработчик"
📋 Найдено совпадений в словариках: 3
📊 Найдено в БД: 150 вакансий
⏰ Запускаю фоновое обновление с точными названиями:
   rabota.md: "Программист"
   999.md: "Разработчик"
   makler.md: "IT специалист"
   📋 Задача добавлена: rabota.md "Программист"
   📋 Задача добавлена: 999.md "Разработчик"
   📋 Задача добавлена: makler.md "IT специалист"
```

---

## 📊 ПРОВЕРКА ЧЕРЕЗ PRISMA STUDIO:

```bash
npm run db:studio
```

Откройте таблицу **ProfessionDictionary** и проверьте:
- Поле `synonyms` должно быть **заполнено** массивом синонимов
- Для "Программист" должны быть: `["разработчик", "developer", "кодер"]`
- Для "Водитель" должны быть: `["driver", "шофер"]`

---

## 💡 КАК ЭТО РАБОТАЕТ:

### 1. Генерация синонимов (автоматическая)

**Файл:** `src/api/services/profession-dictionary.service.ts`

```typescript
private generateSynonyms(profession: string): string[] {
  const synonymMap: Record<string, string[]> = {
    'программист': ['разработчик', 'developer', 'кодер'],
    'разработчик': ['программист', 'developer'],
    'водитель': ['driver', 'шофер'],
    // ...
  };

  // Ищем совпадения в названии профессии
  for (const [key, syns] of Object.entries(synonymMap)) {
    if (profLower.includes(key)) {
      synonyms.push(...syns);
    }
  }
}
```

### 2. Сохранение с синонимами

При вызове `npm run dict:update` или `POST /api/dictionaries/update`:

```typescript
// Для каждой профессии
const synonyms = this.generateSynonyms(prof.profession);

await prisma.professionDictionary.upsert({
  create: {
    profession: "Программист",
    synonyms: ["разработчик", "developer", "кодер"]  ⬅️ Сохраняется
  }
});
```

### 3. Использование в семантическом поиске

```typescript
// Пользователь ищет "разработчик"
const mappings = await findProfessionMappings("разработчик");

// Для каждой профессии проверяем:
if (prof.synonyms.includes("разработчик")) {
  // НАШЛИ! "Программист" имеет синоним "разработчик"
  return { profession: "Программист", similarity: 0.9 }
}
```

---

## 🎯 ИТОГО:

### ✅ Что было исправлено:
1. Добавлены парсеры для 999.md и makler.md в Worker
2. Фоновый парсинг теперь работает для всех источников

### ⚠️ Что нужно сделать вручную:
1. `npm run build` - пересобрать
2. `npm run dict:update` - обновить словарики (чтобы увидеть синонимы)
3. Перезапустить Worker и API

### 🎉 После этого всё должно работать!
- Фоновый парсинг для 999.md и makler.md ✅
- Синонимы в словариках ✅
- Семантический поиск через синонимы ✅
