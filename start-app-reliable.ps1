# Reliable Money Me App Startup Script
# This script handles Docker issues gracefully and provides clear feedback

Write-Host "Starting Money Me App (Reliable Mode)..." -ForegroundColor Green
Write-Host ""

# Step 1: Check if Docker is running
Write-Host "Checking Docker status..." -ForegroundColor Yellow
try {
    $dockerInfo = docker info 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Docker is running" -ForegroundColor Green
    } else {
        Write-Host "Docker is not running or not accessible" -ForegroundColor Red
        Write-Host "   Please start Docker Desktop and try again" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "Docker command failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Please ensure Docker Desktop is running" -ForegroundColor Red
    exit 1
}

# Step 2: Check if services are already running
Write-Host ""
Write-Host "Checking if services are already running..." -ForegroundColor Yellow
$existingContainers = docker ps --filter "name=money-me" --format "{{.Names}}" 2>$null
if ($existingContainers -match "money-me") {
    Write-Host "Services are already running:" -ForegroundColor Yellow
    docker ps --filter "name=money-me" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    Write-Host ""
    Write-Host "Would you like to restart the services? (y/n)" -ForegroundColor Cyan
    $restartChoice = Read-Host
    if ($restartChoice -eq "y" -or $restartChoice -eq "Y") {
        Write-Host "Restarting services..." -ForegroundColor Yellow
        docker-compose down
        Start-Sleep -Seconds 2
        docker-compose up -d
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Failed to restart services" -ForegroundColor Red
            exit 1
        }
        Write-Host "Services restarted successfully" -ForegroundColor Green
    } else {
        Write-Host "Using existing services" -ForegroundColor Green
    }
} else {
    Write-Host "Starting database and backend..." -ForegroundColor Yellow
    try {
        docker-compose up -d
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Database and backend started successfully" -ForegroundColor Green
        } else {
            Write-Host "Failed to start database and backend" -ForegroundColor Red
            exit 1
        }
    } catch {
        Write-Host "Docker Compose failed: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
}

# Step 3: Wait for services to be ready
Write-Host ""
Write-Host "Waiting for services to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Step 4: Verify services are running
Write-Host ""
Write-Host "Verifying services..." -ForegroundColor Yellow
$containers = docker ps --filter "name=money-me" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
if ($containers -match "money-me") {
    Write-Host "Services are running:" -ForegroundColor Green
    Write-Host $containers
} else {
    Write-Host "Services are not running properly" -ForegroundColor Red
    Write-Host "   Check with: docker ps" -ForegroundColor Yellow
}

# Step 5: Test backend API
Write-Host ""
Write-Host "Testing backend API..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Host "Backend API is responding" -ForegroundColor Green
    } else {
        Write-Host "Backend API returned status: $($response.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Backend API not ready yet (this is normal during startup)" -ForegroundColor Yellow
}

# Step 6: Instructions for frontend
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. Open a NEW terminal window/tab" -ForegroundColor White
Write-Host "2. Navigate to your project directory" -ForegroundColor White
Write-Host "3. Run: ng serve --port 4200" -ForegroundColor White
Write-Host "4. Open browser to: http://localhost:4200" -ForegroundColor White
Write-Host ""
Write-Host "Service Status:" -ForegroundColor Cyan
Write-Host "   Database: http://localhost:5432" -ForegroundColor White
Write-Host "   Backend:  http://localhost:3000" -ForegroundColor White
Write-Host "   Frontend: http://localhost:4200 (after running ng serve)" -ForegroundColor White
Write-Host ""
Write-Host "To stop services: docker-compose down" -ForegroundColor Yellow
Write-Host "To restart: docker-compose restart" -ForegroundColor Yellow
