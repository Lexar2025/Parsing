@echo off
chcp 65001 >nul
echo ====================================
echo 🔧 Обновление импортов после реорганизации
echo ====================================
echo.

REM ============================================
REM Обновление импортов config -> settings
REM ============================================
echo 📝 Обновление импортов в src/parse.ts...

powershell -Command "(Get-Content 'src\parse.ts') -replace \"from './config/\", \"from './settings/\" | Set-Content 'src\parse.ts'"
powershell -Command "(Get-Content 'src\parse.ts') -replace 'from \"./config/', 'from \"./settings/' | Set-Content 'src\parse.ts'"

echo ✅ src/parse.ts обновлен
echo.

REM ============================================
REM Обновление всех файлов в src рекурсивно
REM ============================================
echo 📝 Обновление всех импортов в src/...

powershell -Command "Get-ChildItem -Path src -Recurse -Filter *.ts | ForEach-Object { (Get-Content $_.FullName) -replace \"from './config/\", \"from './settings/\" | Set-Content $_.FullName }"
powershell -Command "Get-ChildItem -Path src -Recurse -Filter *.ts | ForEach-Object { (Get-Content $_.FullName) -replace 'from \"./config/', 'from \"./settings/' | Set-Content $_.FullName }"

echo ✅ Все импорты обновлены
echo.

REM ============================================
REM Обновление package.json
REM ============================================
echo 📝 Обновление package.json...

powershell -Command "(Get-Content 'package.json') -replace '__tests__', 'tests' | Set-Content 'package.json'"

echo ✅ package.json обновлен
echo.

REM ============================================
REM Создание .gitkeep файлов
REM ============================================
echo 📝 Создание .gitkeep файлов...

echo. > data\.gitkeep
echo. > tests\.gitkeep

echo ✅ .gitkeep файлы созданы
echo.

REM ============================================
REM Пересборка проекта
REM ============================================
echo 🔨 Пересборка проекта...

call npm run build

if errorlevel 1 (
    echo.
    echo ❌ Ошибка сборки!
    echo Проверь импорты вручную.
    pause
    exit /b 1
)

echo ✅ Проект пересобран
echo.

REM ============================================
REM ИТОГИ
REM ============================================
echo ====================================
echo ✅ Обновление завершено!
echo ====================================
echo.
echo Что было сделано:
echo ✅ Обновлены импорты config -> settings
echo ✅ Обновлен package.json (__tests__ -> tests)
echo ✅ Созданы .gitkeep файлы
echo ✅ Проект пересобран
echo.
echo Теперь можно запускать:
echo   npm run parse makler.md Программисты
echo.

pause
