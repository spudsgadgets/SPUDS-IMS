param(
  [int]$Port = 3200,
  [string]$OutDir = "portable"
)
$ErrorActionPreference = "Stop"
$rootPath = (Get-Location).Path
$absOut = Join-Path $rootPath $OutDir
$www = Join-Path $absOut "www"
New-Item -ItemType Directory -Force -Path $www | Out-Null
$excludeDirs = @(".git",".trae","node_modules","dist","portable",".vscode")
$excludeFiles = @("package.json","install.ps1")
Get-ChildItem -Recurse -File | Where-Object {
  $dir = $_.DirectoryName
  -not ($excludeDirs | ForEach-Object { $dir -like "*\$_*" }) -and
  -not ($excludeFiles -contains $_.Name)
} | ForEach-Object {
  $rel = $_.FullName.Substring($rootPath.Length).TrimStart('\','/')
  $destPath = Join-Path $www $rel
  $destDir = Split-Path -Parent $destPath
  if (-not (Test-Path $destDir)) { New-Item -ItemType Directory -Force -Path $destDir | Out-Null }
  Copy-Item $_.FullName $destPath -Force
}
Copy-Item -Force (Join-Path $rootPath "scripts\Serve-Static.ps1") (Join-Path $absOut "Serve-Static.ps1")
Copy-Item -Force (Join-Path $rootPath "server.js") (Join-Path $absOut "server.js")
try {
  $binDir = Join-Path $absOut "bin"
  New-Item -ItemType Directory -Force -Path $binDir | Out-Null
  $nodeCandidates = @(
    (Join-Path $env:ProgramFiles "nodejs\node.exe"),
    (Join-Path $env:LOCALAPPDATA "Programs\nodejs\node.exe")
  )
  foreach ($cand in $nodeCandidates) {
    if (Test-Path $cand) {
      Copy-Item -Force $cand (Join-Path $binDir "node.exe")
      break
    }
  }
} catch {}
$startCmd = @"
@echo off
setlocal
set PORT=$Port
set ROOT=%~dp0www
cd /d "%~dp0"
set "NODE="
if exist "%~dp0node.exe" set "NODE=%~dp0node.exe"
if not defined NODE if exist "%~dp0bin\node.exe" set "NODE=%~dp0bin\node.exe"
if not defined NODE for /f "usebackq delims=" %%F in (`where node 2^>nul`) do if not defined NODE set "NODE=%%F"
if defined NODE (
  start "SPUDS MMS" "%NODE%" "%~dp0server.js" %PORT%
) else (
  start "SPUDS MMS" powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Serve-Static.ps1" -Root "%~dp0www" -Port %PORT% -Lan
)
endlocal
"@
Set-Content -Path (Join-Path $absOut "Start-IMS.cmd") -Encoding Ascii -Value $startCmd

$stopCmd = @"
@echo off
setlocal
for /f "tokens=2 delims=," %%P in ('tasklist /FI "IMAGENAME eq node.exe" /V /FO CSV ^| findstr /I /C:"server.js"') do (
  taskkill /PID %%P /T /F >nul 2>&1
)
for /f "tokens=2 delims=," %%P in ('tasklist /FI "IMAGENAME eq powershell.exe" /V /FO CSV ^| findstr /I /C:"Serve-Static.ps1"') do (
  taskkill /PID %%P /T /F >nul 2>&1
)
echo Stopped servers (if running).
endlocal
"@
Set-Content -Path (Join-Path $absOut "Stop-IMS.cmd") -Encoding Ascii -Value $stopCmd

$restartCmd = @"
@echo off
setlocal
set PORT=$Port
call "%~dp0Stop-IMS.cmd"
call "%~dp0Start-IMS.cmd" %PORT%
endlocal
"@
Set-Content -Path (Join-Path $absOut "Restart-IMS.cmd") -Encoding Ascii -Value $restartCmd
$fwCmd = @"
@echo off
setlocal
set PORT=$Port
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process PowerShell -ArgumentList '-NoProfile -ExecutionPolicy Bypass -Command \"New-NetFirewallRule -DisplayName ''IMS-%PORT%'' -Direction Inbound -Action Allow -Protocol TCP -LocalPort %PORT% -Profile Private\"' -Verb RunAs"
echo If prompted by UAC, approve to add firewall rule for port %PORT% (Private).
endlocal
"@
Set-Content -Path (Join-Path $absOut "Open-Firewall.cmd") -Encoding Ascii -Value $fwCmd
$zipPath = Join-Path $rootPath "SPUDS-MMS-Deploy.zip"
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
Compress-Archive -Path (Join-Path $absOut "*") -DestinationPath $zipPath -Force
Write-Host "Portable package created:" $zipPath
