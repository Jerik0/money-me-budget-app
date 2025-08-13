# Start Money Me App with Local PostgreSQL
Write-Host "Starting Money Me App with Local PostgreSQL..." -ForegroundColor Green
Write-Host ""

# Step 1: Check if PostgreSQL service is running
Write-Host "Step 1: Checking PostgreSQL service..." -ForegroundColor Yellow
$postgresService = Get-Service -Name "postgresql-x64-17" -ErrorAction SilentlyContinue
if ($postgresService -and $postgresService.Status -eq "Running") {
    Write-Host "✅ PostgreSQL service is running" -ForegroundColor Green
} else {
    Write-Host "❌ PostgreSQL service is not running. Please start it manually:" -ForegroundColor Red
    Write-Host "   Open PowerShell as Administrator and run: Start-Service -Name 'postgresql-x64-17'" -ForegroundColor Yellow
    Write-Host "   Press Enter to continue once PostgreSQL is running..."
    Read-Host
}

# Step 2: Stop any existing processes on ports 3000 and 4200
Write-Host "Step 2: Stopping any existing processes..." -ForegroundColor Yellow
$processes3000 = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | ForEach-Object { Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue }
$processes4200 = Get-NetTCPConnection -LocalPort 4200 -ErrorAction SilentlyContinue | ForEach-Object { Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue }

if ($processes3000) {
    $processes3000 | Stop-Process -Force
    Write-Host "Stopped process on port 3000" -ForegroundColor Yellow
}
if ($processes4200) {
    $processes4200 | Stop-Process -Force
    Write-Host "Stopped process on port 4200" -ForegroundColor Yellow
}

# Step 3: Start the backend locally
Write-Host "Step 3: Starting backend locally..." -ForegroundColor Yellow
Set-Location backend
Write-Host "Installing dependencies..." -ForegroundColor Cyan
npm install
Write-Host "Starting backend server..." -ForegroundColor Cyan
Start-Process -FilePath "npm" -ArgumentList "run", "dev" -WindowStyle Normal
Set-Location ..

# Step 4: Wait a moment for backend to start
Write-Host "Step 4: Waiting for backend to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Step 5: Start the frontend
Write-Host "Step 5: Starting Angular frontend..." -ForegroundColor Yellow
Write-Host "Starting frontend development server..." -ForegroundColor Cyan
Start-Process -FilePath "npm" -ArgumentList "run", "start" -WindowStyle Normal

# Step 6: Wait for services to be ready
Write-Host "Step 6: Waiting for services to be ready..." -ForegroundColor Yellow
Write-Host "Waiting for backend API to respond..." -ForegroundColor Cyan

$backendReady = $false
$attempts = 0
$maxAttempts = 30

do {
    $attempts++
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -TimeoutSec 5 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            $backendReady = $true
            Write-Host "✅ Backend API is ready!" -ForegroundColor Green
        }
    } catch {
        if ($attempts -ge $maxAttempts) {
            Write-Host "❌ Backend failed to start after $maxAttempts attempts" -ForegroundColor Red
            break
        }
        Write-Host "Attempt $attempts of $maxAttempts: Backend not ready yet, waiting..." -ForegroundColor Yellow
        Start-Sleep -Seconds 2
    }
} while (-not $backendReady -and $attempts -lt $maxAttempts)

Write-Host "Waiting for frontend to be accessible..." -ForegroundColor Cyan
$frontendReady = $false
$attempts = 0

do {
    $attempts++
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:4200" -TimeoutSec 5 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            $frontendReady = $true
            Write-Host "✅ Frontend is ready!" -ForegroundColor Green
        }
    } catch {
        if ($attempts -ge $maxAttempts) {
            Write-Host "❌ Frontend failed to start after $maxAttempts attempts" -ForegroundColor Red
            break
        }
        Write-Host "Attempt $attempts of $maxAttempts: Frontend not ready yet, waiting..." -ForegroundColor Yellow
        Start-Sleep -Seconds 2
    }
} while (-not $frontendReady -and $attempts -lt $maxAttempts)

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Money Me App is now running locally!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Services Status:" -ForegroundColor White
Write-Host "Database: Local PostgreSQL (port 5432)" -ForegroundColor Cyan
Write-Host "Backend:  http://localhost:3000 (Express API)" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:4200 (Angular)" -ForegroundColor Cyan
Write-Host ""
Write-Host "You can now:" -ForegroundColor White
Write-Host "- View the app at: http://localhost:4200" -ForegroundColor Cyan
Write-Host "- Test the API at: http://localhost:3000/api/health" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Enter to close this window..." -ForegroundColor Yellow
Read-Host
