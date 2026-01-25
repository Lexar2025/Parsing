# PowerShell script for starting Docker project
# Updated for Docker Compose v2.x compatibility

Write-Host "========================================" -ForegroundColor Blue
Write-Host "   Docker Launch - Parsing Project     " -ForegroundColor Blue
Write-Host "========================================" -ForegroundColor Blue
Write-Host ""

# Check .env file
if (-not (Test-Path .env)) {
    Write-Host "Creating .env from .env.docker..." -ForegroundColor Yellow
    Copy-Item .env.docker .env
    Write-Host "Done! Check .env settings before continuing." -ForegroundColor Green
    Write-Host ""
}

# Check Docker
try {
    docker --version | Out-Null
} catch {
    Write-Host "ERROR: Docker not installed!" -ForegroundColor Red
    exit 1
}

try {
    docker compose version | Out-Null
} catch {
    Write-Host "ERROR: Docker Compose v2 not installed!" -ForegroundColor Red
    exit 1
}

# Stop old containers
Write-Host "Stopping old containers..." -ForegroundColor Yellow
docker compose down 2>$null

# Build images
Write-Host "Building Docker images..." -ForegroundColor Blue
docker compose build --no-cache

# Start containers
Write-Host "Starting containers..." -ForegroundColor Green
docker compose up -d

# Wait for services
Write-Host "Waiting for services to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 10  # Увеличенное время ожидания для инициализации БД

# Check status
Write-Host ""
Write-Host "Container Status:" -ForegroundColor Blue
docker compose ps

# Show logs
Write-Host ""
Write-Host "Startup Logs:" -ForegroundColor Blue
docker compose logs --tail=30

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "     Project Started Successfully!     " -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "API:          http://localhost:3000" -ForegroundColor Blue
Write-Host "Health check: http://localhost:3000/health" -ForegroundColor Blue
Write-Host "Adminer:      http://localhost:8082" -ForegroundColor Blue
Write-Host "Redis UI:     http://localhost:8081" -ForegroundColor Blue
Write-Host ""
Write-Host "Useful commands:" -ForegroundColor Yellow
Write-Host "  docker compose logs -f          - View logs" -ForegroundColor Green
Write-Host "  docker compose ps               - Container status" -ForegroundColor Green
Write-Host "  docker compose down             - Stop all" -ForegroundColor Green
Write-Host "  docker compose restart          - Restart" -ForegroundColor Green
Write-Host ""