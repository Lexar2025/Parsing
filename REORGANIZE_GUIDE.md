# 🏗️ Реорганизация проекта - ИНСТРУКЦИЯ

## 📋 Что будет сделано

### ❌ Текущая структура (хаос):
```
Parsing/
├── CHANGES.md, DONE.md, START.md... (в корне!)
├── vacancies_*.json (в корне!)
├── puppeteer_test_screenshot.png (мусор)
├── src/
│   ├── test.ts, test999.ts (не на месте!)
│   ├── config/ (плохое название)
│   └── ...
├── __tests__/ (неправильное название)
└── docs/ (файлы разбросаны)
```

### ✅ Новая структура (порядок):
```
Parsing/
├── docs/                           # 📚 ВСЯ ДОКУМЕНТАЦИЯ
│   ├── guides/                     # Руководства (CHANGES, DONE, START...)
│   ├── architecture/               # Диаграммы и архитектура
│   └── README.md                   # Главная документация
│
├── src/                            # 💻 ИСХОДНЫЙ КОД
│   ├── parsers/                    # Парсеры (rabotaMd, 999Md, maklerMd)
│   ├── settings/                   # ⚙️ Настройки (бывший config)
│   ├── types/                      # TypeScript типы
│   ├── utils/                      # Утилиты
│   ├── parse.ts                    # Главный файл парсинга
│   └── manageVacancies.ts          # Управление вакансиями
│
├── tests/                          # 🧪 ВСЕ ТЕСТЫ
│   ├── test.ts
│   ├── test999.ts
│   ├── testPuppeteer.ts
│   └── vitest.config.ts
│
├── data/                           # 📊 РЕЗУЛЬТАТЫ ПАРСИНГА
│   ├── vacancies_rabota_md.json
│   ├── vacancies_999_md.json
│   └── vacancies_makler_md.json
│
├── cache/                          # 💾 Кэш деталей вакансий
│
├── scripts/                        # 📜 Скрипты (батники)
│   └── run.bat
│
├── build/                          # Скомпилированный код
├── node_modules/                   # Зависимости
│
└── [конфиги в корне]               # package.json, tsconfig.json и т.д.
    ├── package.json
    ├── tsconfig.json
    ├── .gitignore
    ├── .eslintrc.json
    └── README.md                   # Главный README (остается в корне)
```

## 🚀 Как запустить реорганизацию

### Шаг 1: Сделай бэкап (на всякий случай)
```powershell
# Создай копию проекта или коммит в Git
git add .
git commit -m "Backup before reorganization"
```

### Шаг 2: Запусти батник
```powershell
.\reorganize.bat
```

Батник автоматически:
- ✅ Создаст новые папки
- ✅ Переместит документацию в `docs/guides/`
- ✅ Переместит тесты в `tests/`
- ✅ Переместит результаты в `data/`
- ✅ Удалит временные файлы (скриншоты)
- ✅ Переименует `config` -> `settings`
- ✅ Переместит скрипты в `scripts/`

### Шаг 3: Обновить импорты
```powershell
# Автоматическая замена импортов
Get-ChildItem -Path src -Recurse -Filter *.ts | ForEach-Object {
    (Get-Content $_.FullName) -replace "from './config/", "from './settings/" | Set-Content $_.FullName
    (Get-Content $_.FullName) -replace 'from "./config/', 'from "./settings/' | Set-Content $_.FullName
}
```

Или вручную в файлах:
- `src/parse.ts`: `./config/parsers.js` → `./settings/parsers.js`

### Шаг 4: Обновить package.json
```powershell
# Открой package.json и замени:
"test": "vitest run unit --config __tests__/vitest.config.ts"
# На:
"test": "vitest run unit --config tests/vitest.config.ts"
```

### Шаг 5: Пересобрать
```powershell
npm run build
```

### Шаг 6: Проверить
```powershell
npm run parse makler.md Программисты
```

## 📝 Детали

### Что перемещается:

**Документация → `docs/guides/`:**
- CHANGES.md
- DONE.md
- QUICKSTART_NEW.md
- START.md

**Тесты → `tests/`:**
- src/test.ts
- src/test999.ts
- src/testPuppeteer.ts
- __tests__/* (всё содержимое)

**Результаты → `data/`:**
- vacancies_rabota_md.json
- vacancies_999_md.json
- vacancies_makler_md.json

**Удаляется:**
- puppeteer_test_screenshot.png
- docs/_C__Users_*.png

**Переименовывается:**
- src/config → src/settings

### Что НЕ трогается:

- README.md (остается в корне)
- package.json, tsconfig.json (остаются в корне)
- .gitignore, .eslintrc.json (остаются в корне)
- src/parsers/, src/types/, src/utils/ (остаются на месте)

## ⚠️ Важно!

После реорганизации:

1. **Обновить импорты** (см. AFTER_REORGANIZE.md)
2. **Пересобрать проект** (`npm run build`)
3. **Протестировать** парсеры
4. **Добавить .gitkeep** в пустые папки если нужно

## 🆘 Если что-то пошло не так

```powershell
# Откат через Git
git checkout .
git clean -fd
```

## 📚 Документация

- **AFTER_REORGANIZE.md** - что делать после батника
- **README.md** - обновить структуру проекта там
- **docs/guides/** - все руководства будут тут

---

**Готов?** Запускай `.\reorganize.bat` ! 🚀
