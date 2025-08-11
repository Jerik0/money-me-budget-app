@echo off
echo Starting Money Me App...
echo.

echo Step 1: Stopping any existing processes and containers...
echo Stopping any local processes on ports 3000 and 4200...
netstat -ano | findstr ":3000\|:4200" >nul 2>&1
if %errorlevel% equ 0 (
    echo Found processes using ports 3000 or 4200, stopping them...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000\|:4200"') do (
        taskkill /F /PID %%a >nul 2>&1
    )
    timeout /t 3 /nobreak >nul
)

echo Stopping any existing Docker containers...
docker-compose down >nul 2>&1
echo Cleanup complete.
echo.

echo Step 2: Starting PostgreSQL database and backend via Docker...
docker-compose up -d
if %errorlevel% neq 0 (
    echo Failed to start Docker services
    pause
    exit /b 1
)
echo Docker services started successfully
echo.

echo Step 3: Waiting for database to be healthy...
echo Waiting for PostgreSQL to be ready...
:wait_loop
docker ps --format "table {{.Names}}\t{{.Status}}" | findstr "money-me-postgres" | findstr "healthy" >nul 2>&1
if %errorlevel% neq 0 (
    echo Still waiting for database to be healthy...
    timeout /t 2 /nobreak >nul
    goto wait_loop
)
echo Database is healthy and ready!
echo.

echo Step 4: Waiting for backend to be ready...
echo Waiting for backend API to respond...
:backend_wait
curl -s http://localhost:3000/api/health >nul 2>&1
if %errorlevel% neq 0 (
    echo Still waiting for backend to be ready...
    timeout /t 2 /nobreak >nul
    goto backend_wait
)
echo Backend API is ready!
echo.

echo Step 5: Starting Angular frontend...
echo Starting frontend development server...
start /B ng serve
echo Frontend startup initiated.
echo.

echo Step 6: Waiting for frontend to be ready...
echo Waiting for frontend to be accessible...
:frontend_wait
curl -s http://localhost:4200 >nul 2>&1
if %errorlevel% neq 0 (
    echo Still waiting for frontend to be ready...
    timeout /t 2 /nobreak >nul
    goto frontend_wait
)
echo Frontend is ready!
echo.

echo.
echo ========================================
echo 🎉 Money Me App is now fully running!
echo ========================================
echo.
echo Services Status:
echo ✅ Database: localhost:5432 (PostgreSQL)
echo ✅ Backend:  http://localhost:3000 (Express API)
echo ✅ Frontend: http://localhost:4200 (Angular)
echo.
echo You can now:
echo - View the app at: http://localhost:4200
echo - Test the API at: http://localhost:3000/api/health
echo.
echo Press any key to close this window...
pause >nul
