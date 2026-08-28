# finance-app IIS deploy script
# 1) build frontend  2) copy to IIS  3) start Node backend  4) verify
$ErrorActionPreference = 'Stop'
$projectRoot = 'D:\Minimax Code\finance-app'
$iisRoot    = 'C:\inetpub\wwwroot'
$siteName   = 'finance-app'
$apiPort    = 3001

# Check admin (needed to write C:\inetpub\wwwroot)
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
  Write-Host "ERROR: This script needs Admin PowerShell to write to C:\inetpub\wwwroot" -ForegroundColor Red
  Write-Host "Run from elevated PowerShell:" -ForegroundColor Yellow
  Write-Host "  Start-Process powershell -Verb RunAs -ArgumentList '-NoProfile','-File','$PSCommandPath'" -ForegroundColor Yellow
  exit 1
}

Write-Host "=== finance-app IIS Deploy ===" -ForegroundColor Cyan

# 1) build frontend
Write-Host "`n[1/4] Building frontend..." -ForegroundColor Yellow
Set-Location $projectRoot
$env:Path = "C:\Program Files\nodejs;$env:Path"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$env:NO_COLOR = '1'
$env:FORCE_COLOR = '0'
$node = 'C:\Program Files\nodejs\node.exe'
# Run via Start-Process to fully detach output, ignore exit code (vite sometimes emits benign warnings)
$proc = Start-Process -FilePath $node -ArgumentList @('.\node_modules\vite\bin\vite.js','build') -WorkingDirectory $projectRoot -NoNewWindow -Wait -PassThru -RedirectStandardOutput "$env:TEMP\vite.out" -RedirectStandardError "$env:TEMP\vite.err"
if (-not (Test-Path 'dist\index.html')) {
  Write-Host "  vite output:" -ForegroundColor Red
  Get-Content "$env:TEMP\vite.err" -ErrorAction SilentlyContinue | Select-Object -Last 20
  throw "build failed: dist\index.html missing"
}
Write-Host "  OK dist/ generated" -ForegroundColor Green

# 2) copy dist to IIS site folder
$sitePath = Join-Path $iisRoot $siteName
Write-Host "`n[2/4] Copying to $sitePath..." -ForegroundColor Yellow
if (Test-Path $sitePath) { Remove-Item -Recurse -Force $sitePath }
New-Item -ItemType Directory -Path $sitePath -Force | Out-Null
Copy-Item -Recurse -Force "$projectRoot\dist\*" $sitePath
Write-Host "  OK copied" -ForegroundColor Green

# 3) write web.config (SPA + /api reverse proxy)
Write-Host "`n[3/4] Writing web.config..." -ForegroundColor Yellow
$webConfig = @'
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="ReverseProxyApi" stopProcessing="true">
          <match url="^api/(.*)$" />
          <action type="Rewrite" url="http://127.0.0.1:3001/api/{R:1}" />
        </rule>
        <rule name="SPA Fallback" stopProcessing="true">
          <match url="^(?!api/).*$" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
          </conditions>
          <action type="Rewrite" url="/index.html" />
        </rule>
      </rules>
    </rewrite>
  </system.webServer>
</configuration>
'@
Set-Content -Path (Join-Path $sitePath 'web.config') -Value $webConfig -Encoding UTF8
Write-Host "  OK web.config written" -ForegroundColor Green

# 4) start Node backend in background
Write-Host "`n[4/4] Starting Node backend..." -ForegroundColor Yellow
$nodeExe = 'C:\Program Files\nodejs\node.exe'
$serverEntry = Join-Path $projectRoot 'server\index.js'
$existingJob = Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  Where-Object { $_.CommandLine -like '*finance-app*server*' }
if ($existingJob) {
  Write-Host "  Killing old node process (PID $($existingJob.ProcessId))..." -ForegroundColor Yellow
  Stop-Process -Id $existingJob.ProcessId -Force
  Start-Sleep -Seconds 2
}
Start-Process -FilePath $nodeExe -ArgumentList "`"$serverEntry`"" -WorkingDirectory (Join-Path $projectRoot 'server') -WindowStyle Hidden
Start-Sleep -Seconds 3
$runningJob = Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  Where-Object { $_.CommandLine -like '*finance-app*server*' }
if ($runningJob) {
  Write-Host "  OK Node started (PID $($runningJob.ProcessId))" -ForegroundColor Green
} else {
  throw "Node failed to start"
}

# Verify API
try {
  $resp = Invoke-WebRequest -Uri "http://127.0.0.1:$apiPort/api/health" -UseBasicParsing -TimeoutSec 5
  Write-Host "`n  API OK (status $($resp.StatusCode))" -ForegroundColor Green
} catch {
  Write-Host "`n  WARN: API check failed, but Node is running" -ForegroundColor Yellow
}

Write-Host "`n=== Deploy Done ===" -ForegroundColor Cyan
Write-Host "Site path:  $sitePath" -ForegroundColor White
Write-Host "API:        http://127.0.0.1:$apiPort" -ForegroundColor White
Write-Host "`nNext steps (need Admin PowerShell):" -ForegroundColor Yellow
Write-Host "  1. Install URL Rewrite if not yet: https://www.iis.net/downloads/microsoft/url-rewrite" -ForegroundColor White
Write-Host "  2. Create IIS site: New-IISSite.ps1 (run as admin)" -ForegroundColor White
Write-Host "  3. Restart IIS: iisreset" -ForegroundColor White
