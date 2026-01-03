@echo off
chcp 65001 >nul
echo ====================================
echo 🧹 Очистка и запуск makler.md парсера
echo ====================================
echo.

echo 1️⃣ Удаление лишних файлов...
del /q CHEATSHEET.md 2>nul
del /q INDEX.md 2>nul
del /q MAKLER_*.md 2>nul
del /q NEXT_STEPS.md 2>nul
del /q QUICKSTART.md 2>nul
del /q SUMMARY.md 2>nul
del /q test-makler-*.js 2>nul
del /q cleanup.bat 2>nul
echo ✅ Лишние файлы удалены
echo.

echo 2️⃣ Установка зависимостей...
call npm install
if errorlevel 1 (
    echo ❌ Ошибка установки
    pause
    exit /b 1
)
echo ✅ Зависимости установлены
echo.

echo 3️⃣ Сборка проекта...
call npm run build
if errorlevel 1 (
    echo ❌ Ошибка сборки
    pause
    exit /b 1
)
echo ✅ Проект собран
echo.

echo 4️⃣ Запуск парсера makler.md...
echo.
call npm run parse makler.md Программисты

echo.
echo ====================================
echo ✅ Готово!
echo ====================================
pause
