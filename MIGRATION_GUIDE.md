# 🔄 Руководство по миграции базы данных

## Что изменилось?

Добавлено поле `searchQuery` в модель `ParseLog` для отслеживания парсинга по конкретным поисковым запросам.

## Как применить миграцию?

### 1. Создать миграцию
```bash
npm run db:migrate
```

Prisma автоматически создаст и применит миграцию.

### 2. Или применить вручную (если есть проблемы)
```bash
# Сгенерировать Prisma клиент
npm run db:generate

# Применить миграцию
npx prisma migrate deploy
```

### 3. Проверить результат
```bash
npm run db:studio
```

Откроется Prisma Studio, где можно увидеть обновленную структуру таблицы `ParseLog`.

## SQL миграция (если нужно применить вручную)

```sql
-- Добавить поле searchQuery в таблицу ParseLog
ALTER TABLE "ParseLog" ADD COLUMN "searchQuery" TEXT;

-- Обновить индекс
DROP INDEX IF EXISTS "ParseLog_source_createdAt_idx";
CREATE INDEX "ParseLog_source_searchQuery_createdAt_idx" ON "ParseLog"("source", "searchQuery", "createdAt");
```

## После миграции

1. Перезапустите API сервер:
```bash
npm run dev:api
```

2. Перезапустите Worker (если используется):
```bash
npm run dev:worker
```

## Проверка работы

Теперь VacancyManager будет:
- ✅ Отслеживать парсинг по конкретным поисковым запросам
- ✅ Не парсить повторно один и тот же запрос в течение 12 часов
- ✅ Логировать какой именно запрос был спарсен
