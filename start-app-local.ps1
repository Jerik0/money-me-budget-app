# Money Me App Startup Script (Local PostgreSQL Version)
# This script starts the backend and frontend using local PostgreSQL

Write-Host "Starting Money Me App with Local PostgreSQL..." -ForegroundColor Green
Write-Host ""

Write-Host "Step 1: Checking PostgreSQL service..." -ForegroundColor Yellow
$pgService = Get-Service -Name "*postgres*" -ErrorAction SilentlyContinue
if (-not $pgService) {
    Write-Host "PostgreSQL service not found. Please install PostgreSQL first." -ForegroundColor Red
    exit 1
}

if ($pgService.Status -ne "Running") {
    Write-Host "Starting PostgreSQL service..." -ForegroundColor Yellow
    Start-Service $pgService
    Start-Sleep -Seconds 5
}
Write-Host "PostgreSQL service is running." -ForegroundColor Green

Write-Host "Step 2: Testing database connection..." -ForegroundColor Yellow
try {
    $env:PGPASSWORD = "password123"
    $testResult = psql -U postgres_admin -h localhost -d money_me_app -c "SELECT COUNT(*) FROM transactions;" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Database connection successful!" -ForegroundColor Green
    } else {
        Write-Host "Database connection failed. Please run setup-local-postgres.ps1 first." -ForegroundColor Red
        Write-Host "Press Enter to continue anyway..."
        Read-Host
    }
} catch {
    Write-Host "Database connection failed. Please run setup-local-postgres.ps1 first." -ForegroundColor Red
    Write-Host "Press Enter to continue anyway..."
    Read-Host
}

Write-Host "Step 3: Starting backend API..." -ForegroundColor Yellow
Write-Host "Starting backend in background..."

# Start backend in background
$backendJob = Start-Job -ScriptBlock { 
    Set-Location $using:PWD
    cd backend
    npm run dev
} -Name "BackendAPI"

Write-Host "Backend startup initiated." -ForegroundColor Green

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

Write-Host "Step 5: Starting Angular frontend..." -ForegroundColor Yellow
Write-Host "Starting frontend development server..."

# Start ng serve in background
$frontendJob = Start-Job -ScriptBlock { 
    Set-Location $using:PWD
    ng serve --port 4200
} -Name "AngularFrontend"

Write-Host "Frontend startup initiated." -ForegroundColor Green

Write-Host "Step 6: Waiting for frontend to be ready..." -ForegroundColor Yellow
Write-Host "Waiting for frontend to be accessible..."
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

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Money Me App is now fully running!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Services Status:" -ForegroundColor White
Write-Host "Database: localhost:5432 (Local PostgreSQL)" -ForegroundColor Green
Write-Host "Backend:  http://localhost:3000 (Express API)" -ForegroundColor Green
Write-Host "Frontend: http://localhost:4200 (Angular)" -ForegroundColor Green
Write-Host ""
Write-Host "You can now:" -ForegroundColor White
Write-Host "- View the app at: http://localhost:4200" -ForegroundColor Cyan
Write-Host "- Test the API at: http://localhost:3000/api/health" -ForegroundColor Cyan
Write-Host ""
Write-Host "To stop all services, run: stop-app-local.ps1" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press Enter to close this window..."
Read-Host
