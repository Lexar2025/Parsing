# ⚠️ ОБЯЗАТЕЛЬНЫЕ ИЗМЕНЕНИЯ ПОСЛЕ РЕОРГАНИЗАЦИИ

После запуска `reorganize.bat` нужно обновить импорты в коде!

## 1. Обновить импорты config -> settings

### В файле `src/parse.ts`:
```typescript
// БЫЛО:
import { getParserConfig, getAvailableParsers } from './config/parsers.js';

// СТАЛО:
import { getParserConfig, getAvailableParsers } from './settings/parsers.js';
```

### В файле `src/parsers/rabotaMd.ts`:
Если есть импорты config - заменить на settings

### В файле `src/parsers/nineNineNineMd.ts`:
Если есть импорты config - заменить на settings

## 2. Обновить пути к тестам

### В файле `package.json`:
```json
// БЫЛО:
"test": "vitest run unit --config __tests__/vitest.config.ts",

// СТАЛО:
"test": "vitest run unit --config tests/vitest.config.ts",
```

## 3. Удалить неиспользуемые файлы

### В корне:
- `src/main.ts` - если не используется
- `src/test.ts` - уже перемещен
- `src/test999.ts` - уже перемещен
- `src/testPuppeteer.ts` - уже перемещен

### В docs:
- Старые HTML файлы если не нужны
- Дублирующиеся README

## 4. Обновить .gitignore

Добавить:
```
# Результаты парсинга
data/*.json
!data/.gitkeep

# Кэш
cache/
!cache/.gitkeep

# Временные файлы
*.png
*.jpg
```

## 5. Создать .gitkeep файлы

Чтобы Git отслеживал пустые папки:
```bash
echo. > data\.gitkeep
echo. > cache\.gitkeep
echo. > tests\.gitkeep
```

## 6. Обновить README.md

Добавить раздел "Структура проекта" с новой архитектурой.

## Автоматический скрипт для обновления импортов

После реорганизации запусти:

```powershell
# Поиск и замена в файлах
Get-ChildItem -Path src -Recurse -Filter *.ts | ForEach-Object {
    (Get-Content $_.FullName) -replace "from './config/", "from './settings/" | Set-Content $_.FullName
    (Get-Content $_.FullName) -replace 'from "./config/', 'from "./settings/' | Set-Content $_.FullName
}

# Пересборка
npm run build
```

## Проверка после изменений

1. Убедись что нет ошибок импортов
2. Запусти сборку: `npm run build`
3. Проверь что парсер работает: `npm run parse makler.md Программисты`

## Если что-то сломалось

Откати изменения через Git:
```bash
git checkout .
git clean -fd
```

И попробуй реорганизацию заново.
