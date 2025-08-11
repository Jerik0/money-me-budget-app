Write-Host "Stopping Money Me App..." -ForegroundColor Yellow
Write-Host ""

Write-Host "Step 1: Stopping Angular frontend..." -ForegroundColor Yellow
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
} else {
    Write-Host "No frontend processes found on port 4200" -ForegroundColor Gray
}
Write-Host ""

Write-Host "Step 2: Stopping Docker services..." -ForegroundColor Yellow
# Stop Docker containers
try {
    docker-compose down
    Write-Host "Docker services stopped successfully" -ForegroundColor Green
} catch {
    Write-Host "Error stopping Docker services: $_" -ForegroundColor Red
}
Write-Host ""

Write-Host "Step 3: Checking for any remaining processes..." -ForegroundColor Yellow
# Check if any processes are still using our ports
$ports = @(3000, 4200, 5432)
foreach ($port in $ports) {
    $processes = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Where-Object {$_.State -eq "Listen"}
    if ($processes) {
        Write-Host "⚠️  Port $port is still in use by:" -ForegroundColor Yellow
        foreach ($process in $processes) {
            try {
                $processInfo = Get-Process -Id $process.OwningProcess -ErrorAction SilentlyContinue
                Write-Host "   - PID $($process.OwningProcess): $($processInfo.ProcessName)" -ForegroundColor Gray
            } catch {
                Write-Host "   - PID $($process.OwningProcess): Unknown process" -ForegroundColor Gray
            }
        }
    } else {
        Write-Host "✅ Port $port is free" -ForegroundColor Green
    }
}
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🛑 Money Me App has been stopped!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "All services have been stopped:" -ForegroundColor White
Write-Host "🛑 Frontend: Angular development server" -ForegroundColor Red
Write-Host "🛑 Backend: Express API server" -ForegroundColor Red
Write-Host "🛑 Database: PostgreSQL container" -ForegroundColor Red
Write-Host ""
Write-Host "To start again, use: npm run start:all" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Enter to close this window..."
Read-Host


