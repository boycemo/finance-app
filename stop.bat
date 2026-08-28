@echo off

REM ============================================================
REM  Stop finance-app processes (frontend 5173 / backend 3001)
REM ============================================================

echo [finance-app] Stopping processes...

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ports = 5173,3001; $killed = 0;" ^
  "foreach ($p in $ports) {" ^
  "  $conns = Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue;" ^
  "  foreach ($c in $conns) {" ^
  "    try { Stop-Process -Id $c.OwningProcess -Force -ErrorAction Stop; Write-Host ('  stopped PID=' + $c.OwningProcess + ' port=' + $p); $killed++ }" ^
  "    catch { Write-Host ('  skip PID=' + $c.OwningProcess + ' (no permission)') }" ^
  "  }" ^
  "}" ^
  "if ($killed -gt 0) { Write-Host '[finance-app] done.' } else { Write-Host '[finance-app] no running process found.' }"

echo.
pause
