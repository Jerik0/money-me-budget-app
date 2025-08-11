# Money Me App Startup Script
# This script starts the database, backend, and frontend in the correct order

Write-Host "Starting Money Me App..." -ForegroundColor Green
Write-Host ""

Write-Host "Step 1: Stopping any existing processes and containers..." -ForegroundColor Yellow
Write-Host "Stopping any local processes on ports 3000 and 4200..."

# Stop processes on ports 3000 and 4200
$ports = @(3000, 4200)
foreach ($port in $ports) {
    $processes = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Where-Object {$_.State -eq "Listen"}
    foreach ($process in $processes) {
        try {
            Stop-Process -Id $process.OwningProcess -Force -ErrorAction SilentlyContinue
            Write-Host "Stopped process on port $port" -ForegroundColor Yellow
        } catch {
            Write-Host "Could not stop process on port $port" -ForegroundColor Red
        }
    }
}

Write-Host "Stopping any existing Docker containers..."
docker-compose down 2>$null
Write-Host "Cleanup complete." -ForegroundColor Green
Write-Host ""

Write-Host "Step 2: Starting PostgreSQL database and backend via Docker..." -ForegroundColor Yellow
docker-compose up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to start Docker services" -ForegroundColor Red
    Read-Host "Press Enter to continue"
    exit 1
}
Write-Host "Docker services started successfully" -ForegroundColor Green
Write-Host ""

Write-Host "Step 3: Waiting for database to be healthy..." -ForegroundColor Yellow
Write-Host "Waiting for PostgreSQL to be ready..."
do {
    Start-Sleep -Seconds 2
    $dbStatus = docker ps --format "table {{.Names}}\t{{.Status}}" 2>$null | Select-String "money-me-postgres" | Select-String "healthy"
} while (-not $dbStatus)
Write-Host "Database is healthy and ready!" -ForegroundColor Green
Write-Host ""

Write-Host "Step 4: Waiting for backend to be ready..." -ForegroundColor Yellow
Write-Host "Waiting for backend API to respond..."
do {
    Start-Sleep -Seconds 2
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue
        $backendReady = $response.StatusCode -eq 200
    } catch {
        $backendReady = $false
    }
} while (-not $backendReady)
Write-Host "Backend API is ready!" -ForegroundColor Green
Write-Host ""

Write-Host "Step 5: Starting Angular frontend..." -ForegroundColor Yellow
Write-Host "Starting frontend development server..."
Start-Process -FilePath "ng" -ArgumentList "serve" -WindowStyle Minimized
Write-Host "Frontend startup initiated." -ForegroundColor Green
Write-Host ""

Write-Host "Step 6: Waiting for frontend to be ready..." -ForegroundColor Yellow
Write-Host "Waiting for frontend to be accessible..."
do {
    Start-Sleep -Seconds 2
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:4200" -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue
        $frontendReady = $response.StatusCode -eq 200
    } catch {
        $frontendReady = $false
    }
} while (-not $frontendReady)
Write-Host "Frontend is ready!" -ForegroundColor Green
Write-Host ""

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🎉 Money Me App is now fully running!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Services Status:" -ForegroundColor White
Write-Host "✅ Database: localhost:5432 (PostgreSQL)" -ForegroundColor Green
Write-Host "✅ Backend:  http://localhost:3000 (Express API)" -ForegroundColor Green
Write-Host "✅ Frontend: http://localhost:4200 (Angular)" -ForegroundColor Green
Write-Host ""
Write-Host "You can now:" -ForegroundColor White
Write-Host "- View the app at: http://localhost:4200" -ForegroundColor Cyan
Write-Host "- Test the API at: http://localhost:3000/api/health" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Enter to close this window..."
Read-Host
