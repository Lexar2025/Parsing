@echo off
echo Удаление лишних файлов...

del /q CHEATSHEET.md 2>nul
del /q INDEX.md 2>nul
del /q MAKLER_CHANGELOG.md 2>nul
del /q MAKLER_CHECKLIST.md 2>nul
del /q MAKLER_EXAMPLES.md 2>nul
del /q MAKLER_FIX.md 2>nul
del /q MAKLER_INSTRUCTIONS.md 2>nul
del /q MAKLER_README.md 2>nul
del /q MAKLER_START_HERE.md 2>nul
del /q NEXT_STEPS.md 2>nul
del /q QUICKSTART.md 2>nul
del /q SUMMARY.md 2>nul
del /q test-makler-headers.js 2>nul
del /q test-makler-puppeteer.js 2>nul

echo Готово!
del cleanup.bat
