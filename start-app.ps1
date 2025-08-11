# Money Me App Startup Script
# This script starts the database, backend, and frontend in the correct order

Write-Host "Starting Money Me App..." -ForegroundColor Green

# Function to check if a port is in use
function Test-Port {
    param([int]$Port)
    try {
        $connection = Test-NetConnection -ComputerName localhost -Port $Port -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
        return $connection.TcpTestSucceeded
    }
    catch {
        return $false
    }
}

# Function to wait for a port to be available
function Wait-ForPort {
    param([int]$Port, [string]$ServiceName, [int]$TimeoutSeconds = 60)
    Write-Host "Waiting for $ServiceName on port $Port..." -ForegroundColor Yellow
    $startTime = Get-Date
    $timeout = $startTime.AddSeconds($TimeoutSeconds)
    
    while ((Get-Date) -lt $timeout) {
        if (Test-Port -Port $Port) {
            Write-Host "$ServiceName is ready on port $Port" -ForegroundColor Green
            return $true
        }
        Start-Sleep 2
        Write-Host "Still waiting for $ServiceName..." -ForegroundColor Yellow
    }
    
    Write-Host "Timeout waiting for $ServiceName on port $Port" -ForegroundColor Red
    return $false
}

# Step 1: Start PostgreSQL database
Write-Host "Starting PostgreSQL database..." -ForegroundColor Cyan
try {
    docker-compose up -d
    if ($LASTEXITCODE -eq 0) {
        Write-Host "PostgreSQL started successfully" -ForegroundColor Green
    } else {
        Write-Host "Failed to start PostgreSQL" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "Error starting PostgreSQL: $_" -ForegroundColor Red
    exit 1
}

# Step 2: Wait for database to be ready
if (-not (Wait-ForPort -Port 5432 -ServiceName "PostgreSQL" -TimeoutSeconds 30)) {
    Write-Host "Database failed to start within timeout" -ForegroundColor Red
    exit 1
}

# Step 3: Start backend server
Write-Host "Starting backend server..." -ForegroundColor Cyan
try {
    Start-Process -FilePath "npm" -ArgumentList "run", "backend" -WorkingDirectory "backend" -WindowStyle Minimized
    Write-Host "Backend startup initiated" -ForegroundColor Green
} catch {
    Write-Host "Error starting backend: $_" -ForegroundColor Red
    exit 1
}

# Step 4: Wait for backend to be ready
if (-not (Wait-ForPort -Port 3000 -ServiceName "Backend" -TimeoutSeconds 30)) {
    Write-Host "Backend failed to start within timeout" -ForegroundColor Red
    exit 1
}

# Step 5: Start frontend
Write-Host "Starting frontend..." -ForegroundColor Cyan
try {
    Start-Process -FilePath "npm" -ArgumentList "run", "start" -WindowStyle Minimized
    Write-Host "Frontend startup initiated" -ForegroundColor Green
} catch {
    Write-Host "Error starting frontend: $_" -ForegroundColor Red
    exit 1
}

# Step 6: Wait for frontend to be ready
if (-not (Wait-ForPort -Port 4200 -ServiceName "Frontend" -TimeoutSeconds 30)) {
    Write-Host "Frontend failed to start within timeout" -ForegroundColor Red
    exit 1
}

# Final status
Write-Host ""
Write-Host "Money Me App is now running!" -ForegroundColor Green
Write-Host "Frontend: http://localhost:4200" -ForegroundColor Cyan
Write-Host "Backend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Database: localhost:5432" -ForegroundColor Cyan
Write-Host ""
Write-Host "All services are now running. You can close this window."
Start-Sleep 5
