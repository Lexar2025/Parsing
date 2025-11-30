@echo off
echo Очистка и пересборка проекта...
echo.

echo [1/3] Удаление папки build...
if exist build rmdir /s /q build
echo ✅ Папка build удалена
echo.

echo [2/3] Запуск сборки проекта...
call npm run build
echo.

echo [3/3] Проверка результатов...
if exist build\src\testPuppeteer.js (
    echo ✅ testPuppeteer.js скомпилирован
) else (
    echo ❌ testPuppeteer.js НЕ найден
)

if exist build\src\parsers\nineNineNineMd.js (
    echo ✅ nineNineNineMd.js скомпилирован
) else (
    echo ❌ nineNineNineMd.js НЕ найден
)

echo.
echo Готово! Теперь можете запустить:
echo   npm run test:puppeteer
echo   npm run start:999
pause
