# Money Me App Restart Script
# This script stops all services and then starts them fresh

Write-Host "Restarting Money Me App..." -ForegroundColor Cyan
Write-Host ""

Write-Host "Step 1: Stopping all services..." -ForegroundColor Yellow
Write-Host "Stopping Angular frontend..."
# Stop Angular processes on port 4200
$frontendProcesses = Get-NetTCPConnection -LocalPort 4200 -ErrorAction SilentlyContinue | Where-Object {$_.State -eq "Listen"}
if ($frontendProcesses) {
    foreach ($process in $frontendProcesses) {
        try {
            $processInfo = Get-Process -Id $process.OwningProcess -ErrorAction SilentlyContinue
            if ($processInfo -and $processInfo.ProcessName -eq "node") {
                Stop-Process -Id $process.OwningProcess -Force -ErrorAction SilentlyContinue
                Write-Host "Stopped Angular frontend process" -ForegroundColor Green
            }
        } catch {
            Write-Host "Could not stop frontend process" -ForegroundColor Red
        }
    }
}

Write-Host "Stopping Docker services..."
# Stop Docker containers
try {
    docker-compose down 2>$null
    Write-Host "Docker services stopped successfully" -ForegroundColor Green
} catch {
    Write-Host "Error stopping Docker services: $_" -ForegroundColor Red
}
Write-Host ""

Write-Host "Step 2: Starting all services..." -ForegroundColor Yellow
Write-Host "Starting PostgreSQL database and backend via Docker..."
docker-compose up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to start Docker services" -ForegroundColor Red
    Read-Host "Press Enter to continue"
    exit 1
}
Write-Host "Docker services started successfully" -ForegroundColor Green
Write-Host ""

Write-Host "Waiting for database to be healthy..."
do {
    Start-Sleep -Seconds 2
    $dbStatus = docker ps --format "table {{.Names}}\t{{.Status}}" 2>$null | Select-String "money-me-postgres" | Select-String "healthy"
} while (-not $dbStatus)
Write-Host "Database is healthy and ready!" -ForegroundColor Green
Write-Host ""

Write-Host "Waiting for backend to be ready..."
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

Write-Host "Starting Angular frontend..."
Write-Host "Note: Starting ng serve in background..." -ForegroundColor Cyan

# Start ng serve in background using Start-Job for better control
$frontendJob = Start-Job -ScriptBlock { 
    Set-Location $using:PWD
    ng serve
} -Name "AngularFrontend"

Write-Host "Frontend startup initiated." -ForegroundColor Green
Write-Host ""

Write-Host "Waiting for frontend to be ready..."
Write-Host "Note: Angular compilation can take 10-30 seconds on first run..." -ForegroundColor Cyan

# Give Angular more time to start up initially
Start-Sleep -Seconds 15

$attempts = 0
$maxAttempts = 30  # 30 attempts * 2 seconds = 60 seconds max wait
do {
    $attempts++
    Start-Sleep -Seconds 2
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:4200" -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue
        $frontendReady = $response.StatusCode -eq 200
        if ($frontendReady) {
            Write-Host "Frontend is ready!" -ForegroundColor Green
        } else {
            Write-Host "Attempt $attempts of $maxAttempts - Frontend responding but not ready yet..." -ForegroundColor Yellow
        }
    } catch {
        $frontendReady = $false
        if ($attempts -lt $maxAttempts) {
            Write-Host "Attempt $attempts of $maxAttempts - Waiting for frontend to start..." -ForegroundColor Yellow
        }
    }
    
    if ($attempts -ge $maxAttempts) {
        Write-Host "Warning: Frontend startup timeout after $maxAttempts attempts" -ForegroundColor Yellow
        Write-Host "Frontend may still be starting up in the background..." -ForegroundColor Cyan
        $frontendReady = $true  # Continue anyway
        break
    }
} while (-not $frontendReady)

Write-Host ""

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Money Me App has been restarted!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Services Status:" -ForegroundColor White
Write-Host "Database: localhost:5432 (PostgreSQL)" -ForegroundColor Green
Write-Host "Backend:  http://localhost:3000 (Express API)" -ForegroundColor Green
Write-Host "Frontend: http://localhost:4200 (Angular)" -ForegroundColor Green
Write-Host ""
Write-Host "You can now:" -ForegroundColor White
Write-Host "- View the app at: http://localhost:4200" -ForegroundColor Cyan
Write-Host "- Test the API at: http://localhost:3000/api/health" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Enter to close this window..."
Read-Host
