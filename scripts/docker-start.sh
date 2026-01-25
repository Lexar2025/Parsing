#!/bin/bash

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   🚀 Запуск Parsing проекта в Docker  ║${NC}"
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo ""

# Проверка наличия .env файла
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  Файл .env не найден. Создаём из .env.docker...${NC}"
    cp .env.docker .env
    echo -e "${GREEN}✅ Файл .env создан. Проверьте настройки перед запуском!${NC}"
    echo ""
fi

# Проверка Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker не установлен!${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose не установлен!${NC}"
    exit 1
fi

# Останавливаем старые контейнеры если есть
echo -e "${YELLOW}🛑 Останавливаем старые контейнеры...${NC}"
docker-compose down 2>/dev/null || true

# Собираем образы
echo -e "${BLUE}🔨 Сборка Docker образов...${NC}"
docker-compose build --no-cache

# Запускаем контейнеры
echo -e "${GREEN}🚀 Запуск контейнеров...${NC}"
docker-compose up -d

# Ждём готовности сервисов
echo -e "${YELLOW}⏳ Ожидание готовности сервисов...${NC}"
sleep 5

# Проверяем статус
echo ""
echo -e "${BLUE}📊 Статус контейнеров:${NC}"
docker-compose ps

# Выводим логи
echo ""
echo -e "${BLUE}📝 Логи запуска:${NC}"
docker-compose logs --tail=20

echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     ✅ Проект успешно запущен!        ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}🌐 API доступен:${NC}        http://localhost:3000"
echo -e "${BLUE}📊 Health check:${NC}       http://localhost:3000/health"
echo -e "${BLUE}🗄️  Adminer (dev):${NC}     http://localhost:8080"
echo -e "${BLUE}📮 Redis UI (dev):${NC}     http://localhost:8081"
echo ""
echo -e "${YELLOW}Полезные команды:${NC}"
echo -e "  ${GREEN}docker-compose logs -f${NC}          - Смотреть логи"
echo -e "  ${GREEN}docker-compose ps${NC}               - Статус контейнеров"
echo -e "  ${GREEN}docker-compose down${NC}             - Остановить всё"
echo -e "  ${GREEN}docker-compose restart${NC}          - Перезапустить"
echo ""
