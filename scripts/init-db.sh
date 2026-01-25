#!/bin/bash
set -e

# Скрипт инициализации PostgreSQL базы данных

echo "🚀 Инициализация базы данных для Parsing проекта..."

# Создаём базу если не существует
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Создаём расширения если нужны
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS "pg_trgm";
    
    -- Информация о базе
    SELECT 'Database initialized successfully!' as message;
    SELECT version();
EOSQL

echo "✅ База данных инициализирована успешно!"
