@echo off
chcp 65001 >nul
echo ====================================
echo 🧹 Реорганизация структуры проекта
echo ====================================
echo.

REM ============================================
REM 1. Создание новой структуры папок
REM ============================================
echo 📁 Создание папок...

mkdir docs\guides 2>nul
mkdir docs\architecture 2>nul
mkdir tests 2>nul
mkdir data 2>nul
mkdir scripts 2>nul

echo ✅ Папки созданы
echo.

REM ============================================
REM 2. Перемещение документации
REM ============================================
echo 📄 Перемещение документации...

REM Переместить MD файлы из корня в docs/guides
move /Y CHANGES.md docs\guides\ 2>nul
move /Y DONE.md docs\guides\ 2>nul
move /Y QUICKSTART_NEW.md docs\guides\ 2>nul
move /Y START.md docs\guides\ 2>nul

REM Главный README остается в корне, но копируем в docs
copy /Y README.md docs\ 2>nul

echo ✅ Документация перемещена
echo.

REM ============================================
REM 3. Перемещение тестов
REM ============================================
echo 🧪 Перемещение тестов...

REM Из src в tests
move /Y src\test.ts tests\ 2>nul
move /Y src\test999.ts tests\ 2>nul
move /Y src\testPuppeteer.ts tests\ 2>nul

REM Переместить __tests__ содержимое
if exist __tests__ (
    xcopy /E /I /Y __tests__\* tests\ 2>nul
    rmdir /S /Q __tests__ 2>nul
)

echo ✅ Тесты перемещены
echo.

REM ============================================
REM 4. Перемещение результатов парсинга
REM ============================================
echo 📊 Перемещение результатов...

move /Y vacancies_*.json data\ 2>nul

echo ✅ Результаты перемещены
echo.

REM ============================================
REM 5. Перемещение скриншотов и временных файлов
REM ============================================
echo 🖼️  Удаление временных файлов...

del /Q puppeteer_test_screenshot.png 2>nul
del /Q docs\_C__Users_*.png 2>nul

echo ✅ Временные файлы удалены
echo.

REM ============================================
REM 6. Переименование config -> settings
REM ============================================
echo ⚙️  Переименование config -> settings...

if exist src\config (
    move /Y src\config src\settings 2>nul
)

echo ✅ Config переименован
echo.

REM ============================================
REM 7. Создание батника (переместить себя в scripts)
REM ============================================
echo 📦 Перемещение скриптов...

if exist run.bat (
    move /Y run.bat scripts\ 2>nul
)

echo ✅ Скрипты перемещены
echo.

REM ============================================
REM ИТОГИ
REM ============================================
echo.
echo ====================================
echo ✅ Реорганизация завершена!
echo ====================================
echo.
echo 📂 Новая структура:
echo.
echo Parsing/
echo ├── docs/
echo │   ├── guides/           (CHANGES, DONE, START и т.д.)
echo │   ├── architecture/     (диаграммы)
echo │   └── README.md
echo ├── src/
echo │   ├── parsers/
echo │   ├── settings/         (бывший config)
echo │   ├── types/
echo │   ├── utils/
echo │   └── parse.ts
echo ├── tests/                (все тесты)
echo ├── data/                 (vacancies_*.json)
echo ├── cache/
echo ├── scripts/              (run.bat)
echo └── [конфиги в корне]
echo.
echo ⚠️  ВАЖНО: Нужно обновить импорты в коде!
echo     src/config -> src/settings
echo.

pause
