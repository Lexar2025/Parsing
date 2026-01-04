# ⚡ БЫСТРЫЙ СТАРТ - Реорганизация проекта

## 🎯 За 3 команды

### Вариант 1: Автоматически (рекомендуется)
```powershell
# 1. Бэкап
git add .
git commit -m "Before reorganization"

# 2. Запустить реорганизацию
.\reorganize-all.bat

# Готово! ✅
```

### Вариант 2: Поэтапно
```powershell
# 1. Бэкап
git add . && git commit -m "Backup"

# 2. Реорганизация файлов
.\reorganize.bat

# 3. Обновление импортов
.\update-imports.bat

# 4. Проверка
npm run parse makler.md Программисты
```

### Вариант 3: Вручную
```powershell
# Смотри REORGANIZE_GUIDE.md
```

---

## 📋 Что будет сделано

```
БЫЛО (хаос):                       СТАЛО (порядок):

Parsing/                           Parsing/
├── CHANGES.md (корень!)    →     ├── docs/guides/CHANGES.md
├── vacancies_*.json (!)    →     ├── data/vacancies_*.json
├── src/test.ts (!)         →     ├── tests/test.ts
├── src/config/             →     ├── src/settings/
└── __tests__/              →     └── tests/
```

---

## 🔧 Файлы для реорганизации

Я создал 4 файла:

1. **reorganize-all.bat** - ⚡ ГЛАВНЫЙ (запускает всё)
2. **reorganize.bat** - перемещение файлов
3. **update-imports.bat** - обновление импортов
4. **REORGANIZE_GUIDE.md** - подробная инструкция

---

## 🚀 Запуск

```powershell
# Просто запусти:
.\reorganize-all.bat

# И нажми Y когда спросит подтверждение
```

Батник:
- ✅ Создаст структуру папок
- ✅ Переместит все файлы
- ✅ Обновит импорты
- ✅ Пересоберет проект
- ✅ Запустит тест

---

## ⚠️ Важно

### ПЕРЕД запуском:
```powershell
git add .
git commit -m "Backup before reorganization"
```

### ПОСЛЕ запуска:
1. Проверь что парсер работает
2. Обнови README.md с новой структурой
3. Закоммить изменения

---

## 🆘 Если что-то сломалось

```powershell
# Откат изменений
git checkout .
git clean -fd

# Или восстанови из бэкапа
```

---

## 📚 Подробности

См. **REORGANIZE_GUIDE.md** для детальной инструкции.

---

## ✅ Готово?

```powershell
.\reorganize-all.bat
```

🚀 Вперёд!
