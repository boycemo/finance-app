$files = @(
  "D:\Minimax Code\finance-app\start.bat",
  "D:\Minimax Code\finance-app\install.bat",
  "D:\Minimax Code\finance-app\stop.bat",
  "D:\Minimax Code\finance-app\backup.bat"
)
foreach ($f in $files) {
  if (Test-Path $f) {
    $content = [System.IO.File]::ReadAllText($f, [System.Text.Encoding]::UTF8)
    $utf8Bom = New-Object System.Text.UTF8Encoding $true
    [System.IO.File]::WriteAllText($f, $content, $utf8Bom)
    Write-Output "BOM added: $f"
  }
}
