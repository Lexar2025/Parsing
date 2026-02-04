# Многоэтапная сборка для оптимизации размера образа

# Этап 1: Сборка
FROM node:22-alpine AS builder

# Установка зависимостей для Puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    nodejs \
    yarn

# Переменные окружения для Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Рабочая директория
WORKDIR /app

# Копируем package файлы
COPY package*.json ./
COPY tsconfig*.json ./

# Устанавливаем ВСЕ зависимости (включая dev) для сборки TypeScript
RUN npm ci && \
    npm cache clean --force

# Копируем исходный код
COPY . .

# Генерируем Prisma Client
RUN npx prisma generate

# Компилируем TypeScript
RUN npm run build

# Удаляем devDependencies после сборки
RUN npm prune --production && \
    npm cache clean --force

# Этап 2: Production образ
FROM node:22-alpine

# Установка зависимостей для Puppeteer и PostgreSQL клиента
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    postgresql-client

# Переменные окружения для Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    NODE_ENV=production

# Создаём пользователя для безопасности
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Копируем зависимости и собранный код из builder
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/build ./build
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./
COPY --from=builder --chown=nodejs:nodejs /app/prisma ./prisma

# Копируем скрипты
COPY --chown=nodejs:nodejs scripts ./scripts

# Создаем пустой .env файл (переменные передаются через docker-compose.yml)
RUN echo "# Environment variables are provided by docker-compose.yml" > .env && \
    chown nodejs:nodejs .env

# Даём права на выполнение скриптов
RUN chmod +x scripts/*.sh 2>/dev/null || true

# Создаём директории для кэша и данных
RUN mkdir -p /app/cache /app/data && \
    chown -R nodejs:nodejs /app/cache /app/data

# Переключаемся на непривилегированного пользователя
USER nodejs

# Порты
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Команда по умолчанию
CMD ["node", "build/src/api/server.js"]
