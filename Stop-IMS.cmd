@echo off
setlocal
set SCRIPT_DIR=%~dp0
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ErrorActionPreference='SilentlyContinue';" ^
  "$root=(Resolve-Path '%SCRIPT_DIR%').Path;" ^
  "Write-Host 'Stopping Node app...';" ^
  "$nodes = Get-CimInstance Win32_Process -Filter \"name='node.exe'\" | Where-Object { $_.CommandLine -match 'server.js' -and $_.CommandLine -match [regex]::Escape($root) };" ^
  "if($nodes){ $nodes | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }; Write-Host 'Stopped Node app.' } else { Write-Host 'No Node app process found.' };" ^
  "Write-Host 'Stopping MariaDB...'; & '%SCRIPT_DIR%scripts\\stop-db.ps1' -Port 3307; Write-Host 'Done.'"
endlocal
exit /b 0
