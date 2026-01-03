# Инструкция по запуску

## 1. Удалите лишние файлы

```powershell
cd C:\Users\User\Documents\Claude\Parsing
Remove-Item -Path "CHEATSHEET.md","INDEX.md","MAKLER_*.md","NEXT_STEPS.md","QUICKSTART.md","SUMMARY.md","test-makler-*.js","cleanup.bat" -Force -ErrorAction SilentlyContinue
```

## 2. Установите новые зависимости

```powershell
npm install
```

Это установит:
- `puppeteer-extra` - расширенная версия Puppeteer
- `puppeteer-extra-plugin-stealth` - обход Cloudflare

## 3. Соберите проект

```powershell
npm run build
```

## 4. Запустите парсер

```powershell
# С браузером (чтобы видеть что происходит)
npm run parse makler.md Программисты

# Без браузера (headless)
# Откройте src/parse.ts и измените:
# return new MaklerMdParser({ headless: true });
```

## Что изменилось

1. ✅ Парсер полностью переписан на Puppeteer + Stealth
2. ✅ Обходит Cloudflare защиту автоматически
3. ✅ Имитирует человеческую активность (движение мыши, клики)
4. ✅ Использует рабочий URL с `list=false`
5. ✅ Исправлен словарь профессий

## Если не работает

1. Запустите с `headless: false` чтобы видеть браузер
2. Увеличьте задержки в `src/config/parsers.ts`
3. Проверьте что установлен Chromium: `npx puppeteer browsers install chrome`

## Настройка headless режима

В файле `src/parse.ts` найдите:

```typescript
case 'makler.md':
  return new MaklerMdParser({ headless: false }); // false = видно браузер
```

Измените на:
```typescript
case 'makler.md':
  return new MaklerMdParser({ 
    headless: true,        // true = без UI
    parseDetails: false    // Отключить детали для скорости
  });
```
