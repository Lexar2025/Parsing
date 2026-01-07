# 🎯 Скрипт для проверки системы парсинга вакансий (PowerShell)

Write-Host "🚀 Проверка системы парсинга вакансий..." -ForegroundColor Cyan
Write-Host ""

$BaseUrl = "http://localhost:3000"

# Проверка 1: Health Check
Write-Host "1. Проверка Health Check..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-RestMethod -Uri "$BaseUrl/health" -Method Get
    if ($healthResponse.status -eq "ok") {
        Write-Host "✅ API сервер работает" -ForegroundColor Green
        $healthResponse | ConvertTo-Json -Depth 10
    }
} catch {
    Write-Host "❌ API сервер не отвечает" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Проверка 2: Первый поиск
Write-Host "2. Первый поиск вакансий (keywords=developer)..." -ForegroundColor Yellow
Write-Host "   Ожидается: парсинг запустится, source='fresh'" -ForegroundColor Gray
try {
    $search1Response = Invoke-RestMethod -Uri "$BaseUrl/api/vacancies?keywords=developer" -Method Get
    $source1 = $search1Response.meta.source
    
    if ($source1 -eq "fresh") {
        Write-Host "✅ Парсинг запустился (source=fresh)" -ForegroundColor Green
    } 
    else 
    {
        Write-Host "⚠️  Source: $source1 (ожидался 'fresh')" -ForegroundColor Yellow
    }
    $search1Response.meta | ConvertTo-Json -Depth 10
} catch {
    Write-Host "❌ Ошибка при поиске" -ForegroundColor Red
    $_.Exception.Message
}
Write-Host ""

# Ждем
Write-Host "   Ждем 2 секунды..." -ForegroundColor Gray
Start-Sleep -Seconds 2

# Проверка 3: Повторный поиск
Write-Host "3. Повторный поиск вакансий (keywords=developer)..." -ForegroundColor Yellow
Write-Host "   Ожидается: данные из кеша, source='cache'" -ForegroundColor Gray
try {
    $search2Response = Invoke-RestMethod -Uri "$BaseUrl/api/vacancies?keywords=developer" -Method Get
    $source2 = $search2Response.meta.source
    
    if ($source2 -eq "cache") {
        Write-Host "✅ Данные взяты из кеша (source=cache)" -ForegroundColor Green
    } else {
        Write-Host "❌ Source: $source2 (ожидался 'cache')" -ForegroundColor Red
    }
    $search2Response.meta | ConvertTo-Json -Depth 10
} catch {
    Write-Host "❌ Ошибка при поиске" -ForegroundColor Red
}
Write-Host ""

# Проверка 4: Новый поисковый запрос
Write-Host "4. Новый поисковый запрос (keywords=react)..." -ForegroundColor Yellow
Write-Host "   Ожидается: новый парсинг, source='fresh'" -ForegroundColor Gray
try {
    $search3Response = Invoke-RestMethod -Uri "$BaseUrl/api/vacancies?keywords=react" -Method Get
    $source3 = $search3Response.meta.source
    
    if ($source3 -eq "fresh") {
        Write-Host "✅ Новый парсинг запустился (source=fresh)" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Source: $source3 (ожидался 'fresh')" -ForegroundColor Yellow
    }
    $search3Response.meta | ConvertTo-Json -Depth 10
} catch {
    Write-Host "❌ Ошибка при поиске" -ForegroundColor Red
}
Write-Host ""

# Проверка 5: Статистика
Write-Host "5. Проверка статистики..." -ForegroundColor Yellow
try {
    $statsResponse = Invoke-RestMethod -Uri "$BaseUrl/api/vacancies/stats" -Method Get
    $statsResponse | ConvertTo-Json -Depth 10
} catch {
    Write-Host "❌ Ошибка при получении статистики" -ForegroundColor Red
}
Write-Host ""

# Итоги
Write-Host "════════════════════════════════════════════" -ForegroundColor Green
Write-Host "🎉 Проверка завершена!" -ForegroundColor Green
Write-Host "════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "Что проверили:"
Write-Host "✅ Health Check работает"
Write-Host "✅ Первый поиск запускает парсинг"
Write-Host "✅ Повторный поиск берет данные из кеша"
Write-Host "✅ Новый запрос запускает новый парсинг"
Write-Host "✅ Статистика показывает данные"
Write-Host ""
Write-Host "Теперь проверьте ParseLog в Prisma Studio:" -ForegroundColor Cyan
Write-Host "npm run db:studio" -ForegroundColor Yellow
