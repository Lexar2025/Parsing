# 🚀 БЫСТРАЯ ИНСТРУКЦИЯ

## 1. Подготовка (один раз)

```bash
# Миграция БД
npm run db:migrate
npm run db:generate

# Обновить словарики
npm run dict:update

# (Опционально) Запустить Redis для Worker
docker run -d -p 6379:6379 redis
```

## 2. Запуск

```bash
# API сервер
npm run dev:api

# Worker (в другом терминале, если есть Redis)
npm run dev:worker
```

## 3. Тесты

```bash
# Поиск в одном источнике
curl "http://localhost:3000/api/vacancies?keywords=developer&source=999.md"

# Семантический поиск
curl "http://localhost:3000/api/vacancies?keywords=разработчик&useSemanticSearch=true"

# Словарики
curl "http://localhost:3000/api/dictionaries"
```

## 📋 Новые возможности

1. **Один источник:** `?source=999.md`
2. **Семантический поиск:** `?useSemanticSearch=true`
3. **Синонимы:** генерируются автоматически
4. **Worker:** фоновое обновление (если Redis запущен)

## ✅ Готово!

Смотри `FINAL_VERSION.md` для подробностей.
