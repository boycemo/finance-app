$ErrorActionPreference = 'Stop'
$src = "C:\Program Files\nodejs\node_modules\npm\node_modules\minipass"
$root = "C:\Program Files\nodejs\node_modules"
$bad = Get-ChildItem $root -Recurse -Directory -Filter "minipass" -ErrorAction SilentlyContinue |
  Where-Object { Test-Path (Join-Path $_.FullName "package.json") }
$fixed = 0
foreach ($d in $bad) {
  try {
    $pkg = Get-Content (Join-Path $d.FullName "package.json") -Raw | ConvertFrom-Json
    if ($pkg.version -like "2.*") {
      Write-Output "FIX: $($d.FullName) ($($pkg.version))"
      mavis-trash $d.FullName 2>&1 | Out-Null
      New-Item -ItemType Directory -Path $d.FullName -Force | Out-Null
      Copy-Item -Path "$src\*" -Destination $d.FullName -Recurse -Force
      $fixed++
    }
  } catch {
    Write-Output "SKIP: $($d.FullName) ($_)"
  }
}
Write-Output "Total fixed: $fixed"
