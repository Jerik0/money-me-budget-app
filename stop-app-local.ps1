# Money Me App Stop Script (Local PostgreSQL Version)
# This script stops the backend and frontend services

Write-Host "Stopping Money Me App services..." -ForegroundColor Yellow
Write-Host ""

Write-Host "Step 1: Stopping backend API..." -ForegroundColor Yellow
$backendJob = Get-Job -Name "BackendAPI" -ErrorAction SilentlyContinue
if ($backendJob) {
    Stop-Job $backendJob
    Remove-Job $backendJob
    Write-Host "Backend API stopped." -ForegroundColor Green
} else {
    Write-Host "Backend API job not found." -ForegroundColor Yellow
}

Write-Host "Step 2: Stopping Angular frontend..." -ForegroundColor Yellow
$frontendJob = Get-Job -Name "AngularFrontend" -ErrorAction SilentlyContinue
if ($frontendJob) {
    Stop-Job $frontendJob
    Remove-Job $frontendJob
    Write-Host "Angular frontend stopped." -ForegroundColor Green
} else {
    Write-Host "Angular frontend job not found." -ForegroundColor Yellow
}

Write-Host "Step 3: Stopping processes on ports 3000 and 4200..." -ForegroundColor Yellow
$ports = @(3000, 4200)
foreach ($port in $ports) {
    $processes = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Where-Object {$_.State -eq "Listen"}
    foreach ($process in $processes) {
        try {
            Stop-Process -Id $process.OwningProcess -Force -ErrorAction SilentlyContinue
            Write-Host "Stopped process on port $port" -ForegroundColor Green
        } catch {
            Write-Host "Could not stop process on port $port" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "Note: PostgreSQL service is still running as a Windows service." -ForegroundColor Cyan
Write-Host "To stop PostgreSQL completely, run: Stop-Service postgresql-x64-17" -ForegroundColor White
Write-Host ""
Write-Host "All Money Me App services have been stopped." -ForegroundColor Green
Write-Host "Press Enter to close this window..."
Read-Host
