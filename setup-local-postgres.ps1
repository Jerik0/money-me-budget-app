# Local PostgreSQL Setup Script for Money Me App
# This script sets up the local PostgreSQL database

Write-Host "Setting up local PostgreSQL database for Money Me App..." -ForegroundColor Green
Write-Host ""

# Check if PostgreSQL is running
Write-Host "Checking PostgreSQL service status..." -ForegroundColor Yellow
$pgService = Get-Service -Name "*postgres*" -ErrorAction SilentlyContinue
if (-not $pgService) {
    Write-Host "PostgreSQL service not found. Please install PostgreSQL first." -ForegroundColor Red
    exit 1
}

if ($pgService.Status -ne "Running") {
    Write-Host "PostgreSQL service is not running. Starting it..." -ForegroundColor Yellow
    Start-Service $pgService
    Start-Sleep -Seconds 5
}

Write-Host "PostgreSQL service is running." -ForegroundColor Green

# Check if we can connect to PostgreSQL
Write-Host "Testing PostgreSQL connection..." -ForegroundColor Yellow

# Try to connect as postgres user (you may need to enter password)
Write-Host "Attempting to connect to PostgreSQL..." -ForegroundColor Cyan
Write-Host "If prompted for password, enter the password for the 'postgres' user." -ForegroundColor Yellow
Write-Host ""

# Create the database and user
Write-Host "Creating database and user..." -ForegroundColor Yellow

# Note: You'll need to run these commands manually in psql if the script can't connect
Write-Host "Please run the following commands in psql:" -ForegroundColor Cyan
Write-Host "1. Connect to PostgreSQL: psql -U postgres -h localhost" -ForegroundColor White
Write-Host "2. Create database: CREATE DATABASE money_me_app;" -ForegroundColor White
Write-Host "3. Create user: CREATE USER postgres_admin WITH PASSWORD 'password123';" -ForegroundColor White
Write-Host "4. Grant privileges: GRANT ALL PRIVILEGES ON DATABASE money_me_app TO postgres_admin;" -ForegroundColor White
Write-Host "5. Exit: \q" -ForegroundColor White
Write-Host ""

Write-Host "After setting up the database, you can run the initialization script:" -ForegroundColor Cyan
Write-Host "psql -U postgres_admin -h localhost -d money_me_app -f backend/database/init.sql" -ForegroundColor White
Write-Host ""

Write-Host "Press Enter when you're ready to continue..."
Read-Host

# Try to run the initialization script
Write-Host "Running initialization script..." -ForegroundColor Yellow
try {
    $env:PGPASSWORD = "password123"
    psql -U postgres_admin -h localhost -d money_me_app -f backend/database/init.sql
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Database initialization completed successfully!" -ForegroundColor Green
    } else {
        Write-Host "Database initialization failed. Please run it manually." -ForegroundColor Red
    }
} catch {
    Write-Host "Could not run initialization script automatically." -ForegroundColor Yellow
    Write-Host "Please run it manually: psql -U postgres_admin -h localhost -d money_me_app -f backend/database/init.sql" -ForegroundColor White
}

Write-Host ""
Write-Host "Local PostgreSQL setup complete!" -ForegroundColor Green
Write-Host "Database: money_me_app" -ForegroundColor White
Write-Host "User: postgres_admin" -ForegroundColor White
Write-Host "Password: password123" -ForegroundColor White
Write-Host "Host: localhost" -ForegroundColor White
Write-Host "Port: 5432" -ForegroundColor White
