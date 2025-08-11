@echo off
echo Starting Money Me App...
echo.

echo Step 1: Stopping any existing processes...
echo Checking for Node processes...
netstat -ano | findstr ":3000\|:4200" >nul 2>&1
if %errorlevel% equ 0 (
    echo Found processes using ports 3000 or 4200, attempting to stop them...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000\|:4200"') do (
        taskkill /F /PID %%a >nul 2>&1
    )
    timeout /t 3 /nobreak >nul
) else (
    echo No conflicting processes found.
)
echo Process cleanup complete.
echo.

echo Step 2: Starting PostgreSQL database...
docker-compose up -d
if %errorlevel% neq 0 (
    echo Failed to start PostgreSQL
    pause
    exit /b 1
)
echo PostgreSQL started successfully
echo.

echo Step 3: Waiting for database to be ready...
timeout /t 8 /nobreak >nul
echo Database should be ready now.
echo.

echo Step 4: Starting backend server...
cd backend
start /B npm run dev
cd ..
echo Backend startup initiated.
echo.

echo Step 5: Waiting for backend to start...
timeout /t 10 /nobreak >nul
echo Backend should be ready now.
echo.

echo Step 6: Starting frontend...
start /B npm run start
echo Frontend startup initiated.
echo.

echo.
echo Money Me App startup complete!
echo.
echo Services are starting up:
echo - Database: localhost:5432
echo - Backend: http://localhost:3000  
echo - Frontend: http://localhost:4200
echo.
echo Please wait a few moments for all services to be ready.
echo You can close this window once the services are running.
echo.
echo Press any key to close this window...
pause >nul
