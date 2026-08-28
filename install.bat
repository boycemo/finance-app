@echo off

REM ============================================================
REM  Install all dependencies (frontend + backend)
REM ============================================================

cd /d "%~dp0"

echo [1/2] Installing frontend deps...
call npm install
if errorlevel 1 (
    echo [ERROR] Frontend install failed.
    pause
    exit /b 1
)

echo.
echo [2/2] Installing backend deps...
call npm --prefix server install
if errorlevel 1 (
    echo [ERROR] Backend install failed.
    pause
    exit /b 1
)

echo.
echo ============================================
echo   All dependencies installed.
echo   Run start.bat to launch the app.
echo ============================================

pause
