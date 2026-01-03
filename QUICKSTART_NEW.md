# 🚀 Быстрый запуск makler.md парсера

## Автоматический способ (рекомендуется)

Просто запустите:
```powershell
.\run.bat
```

Этот батник:
1. Удалит лишние файлы
2. Установит зависимости
3. Соберет проект
4. Запустит парсер

## Ручной способ

```powershell
# 1. Очистка
Remove-Item CHEATSHEET.md,INDEX.md,MAKLER_*.md,NEXT_STEPS.md,QUICKSTART.md,SUMMARY.md,test-*.js,cleanup.bat -Force -ErrorAction SilentlyContinue

# 2. Установка
npm install

# 3. Сборка
npm run build

# 4. Запуск
npm run parse makler.md Программисты
```

## Что изменилось

✅ Используется Puppeteer + Stealth вместо HTTP
✅ Обходит Cloudflare автоматически
✅ Имитирует человеческую активность
✅ Исправлен словарь профессий
✅ Правильный URL с `list=false`

## Настройки

Откройте `src/parse.ts` и найдите:

```typescript
case 'makler.md':
  return new MaklerMdParser({
    headless: false,      // false = видно браузер
    parseDetails: false,  // false = быстрее
    cacheEnabled: true,
  });
```

Измените `headless: true` для работы без UI.

## Результаты

Результаты сохраняются в `vacancies_makler_md.json`

## Проблемы?

1. `npm install` не работает → Проверьте Node.js версию: `node -v` (нужно >= 22.11)
2. Puppeteer ошибки → `npx puppeteer browsers install chrome`
3. Пустая страница → Увеличьте задержки в `src/config/parsers.ts`

Подробности в `README.md` и `CHANGES.md`
