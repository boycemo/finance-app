@echo off

REM ============================================================
REM  Personal Finance - one-click start (frontend + backend)
REM  Run install.bat first time to install dependencies.
REM ============================================================

cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] node not found. Please install Node.js 18+ from https://nodejs.org/
    pause
    exit /b 1
)

if not exist "node_modules\concurrently" (
    echo [INFO] First run, installing frontend deps...
    call npm install
    if errorlevel 1 (
        echo [ERROR] Frontend install failed.
        pause
        exit /b 1
    )
)

if not exist "server\node_modules\better-sqlite3" (
    echo [INFO] First run, installing backend deps...
    call npm --prefix server install
    if errorlevel 1 (
        echo [ERROR] Backend install failed.
        pause
        exit /b 1
    )
)

echo.
echo ============================================
echo   Frontend: http://127.0.0.1:5173
echo   Backend:  http://127.0.0.1:3001
echo   Data:     %CD%\server\finance.db
echo   Stop:     close this window, or run stop.bat
echo ============================================
echo.

call npm run dev:all

pause
