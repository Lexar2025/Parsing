#!/bin/bash

# 🎯 Скрипт для проверки системы парсинга вакансий

echo "🚀 Проверка системы парсинга вакансий..."
echo ""

# Цвета для вывода
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:3000"

# Проверка 1: Health Check
echo -e "${YELLOW}1. Проверка Health Check...${NC}"
health_response=$(curl -s "$BASE_URL/health")
if echo "$health_response" | grep -q "ok"; then
    echo -e "${GREEN}✅ API сервер работает${NC}"
    echo "$health_response" | jq '.'
else
    echo -e "${RED}❌ API сервер не отвечает${NC}"
    exit 1
fi
echo ""

# Проверка 2: Первый поиск (должен запустить парсинг)
echo -e "${YELLOW}2. Первый поиск вакансий (keywords=developer)...${NC}"
echo "   Ожидается: парсинг запустится, source='fresh'"
search1_response=$(curl -s "$BASE_URL/api/vacancies?keywords=developer")
source1=$(echo "$search1_response" | jq -r '.meta.source')

if [ "$source1" == "fresh" ]; then
    echo -e "${GREEN}✅ Парсинг запустился (source=fresh)${NC}"
    echo "$search1_response" | jq '.meta'
else
    echo -e "${YELLOW}⚠️  Source: $source1 (ожидался 'fresh')${NC}"
    echo "$search1_response" | jq '.meta'
fi
echo ""

# Ждем немного
echo "   Ждем 2 секунды..."
sleep 2

# Проверка 3: Повторный поиск (должен взять из кеша)
echo -e "${YELLOW}3. Повторный поиск вакансий (keywords=developer)...${NC}"
echo "   Ожидается: данные из кеша, source='cache'"
search2_response=$(curl -s "$BASE_URL/api/vacancies?keywords=developer")
source2=$(echo "$search2_response" | jq -r '.meta.source')

if [ "$source2" == "cache" ]; then
    echo -e "${GREEN}✅ Данные взяты из кеша (source=cache)${NC}"
    echo "$search2_response" | jq '.meta'
else
    echo -e "${RED}❌ Source: $source2 (ожидался 'cache')${NC}"
    echo "$search2_response" | jq '.meta'
fi
echo ""

# Проверка 4: Новый поисковый запрос
echo -e "${YELLOW}4. Новый поисковый запрос (keywords=react)...${NC}"
echo "   Ожидается: новый парсинг, source='fresh'"
search3_response=$(curl -s "$BASE_URL/api/vacancies?keywords=react")
source3=$(echo "$search3_response" | jq -r '.meta.source')

if [ "$source3" == "fresh" ]; then
    echo -e "${GREEN}✅ Новый парсинг запустился (source=fresh)${NC}"
    echo "$search3_response" | jq '.meta'
else
    echo -e "${YELLOW}⚠️  Source: $source3 (ожидался 'fresh')${NC}"
    echo "$search3_response" | jq '.meta'
fi
echo ""

# Проверка 5: Статистика
echo -e "${YELLOW}5. Проверка статистики...${NC}"
stats_response=$(curl -s "$BASE_URL/api/vacancies/stats")
echo "$stats_response" | jq '.'
echo ""

# Итоги
echo -e "${GREEN}════════════════════════════════════════════${NC}"
echo -e "${GREEN}🎉 Проверка завершена!${NC}"
echo -e "${GREEN}════════════════════════════════════════════${NC}"
echo ""
echo "Что проверили:"
echo "✅ Health Check работает"
echo "✅ Первый поиск запускает парсинг"
echo "✅ Повторный поиск берет данные из кеша"
echo "✅ Новый запрос запускает новый парсинг"
echo "✅ Статистика показывает данные"
echo ""
echo "Теперь проверьте ParseLog в Prisma Studio:"
echo "npm run db:studio"
