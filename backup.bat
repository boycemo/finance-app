@echo off

REM ============================================================
REM  Backup finance.db to Backups/finance-YYYYMMDD-HHmmss.db
REM  Optional arg: target dir. e.g. backup.bat D:\my-backup
REM ============================================================

cd /d "%~dp0"

set "SRC=%~dp0server\finance.db"
set "WAL=%~dp0server\finance.db-wal"

if not exist "%SRC%" (
    echo [ERROR] data file not found: %SRC%
    echo Please run start.bat first to initialize the database.
    pause
    exit /b 1
)

if "%~1"=="" (
    set "DST_DIR=%~dp0Backups"
) else (
    set "DST_DIR=%~1"
)
if not exist "%DST_DIR%" mkdir "%DST_DIR%"

for /f "tokens=2 delims==" %%a in ('wmic os get localdatetime /value 2^>nul') do set "DT=%%a"
set "STAMP=%DT:~0,8%-%DT:~8,6%"
set "DST=%DST_DIR%\finance-%STAMP%.db"

copy /Y "%SRC%" "%DST%" >nul
if errorlevel 1 (
    echo [ERROR] backup failed.
    pause
    exit /b 1
)

if exist "%WAL%" copy /Y "%WAL%" "%DST%.db-wal" >nul 2>&1

echo ============================================
echo   Backup complete.
echo   File: %DST%
echo ============================================

pause
