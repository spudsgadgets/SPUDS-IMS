param(
  [int]$Port = 3200,
  [string]$OutDir = "portable",
  [string]$ZipName = "SPUDS-MMS-Deploy.zip"
)
$ErrorActionPreference = "Stop"
$rootPath = (Get-Location).Path
$absOut = Join-Path $rootPath $OutDir
if (Test-Path $absOut) { Remove-Item $absOut -Recurse -Force }
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
Set-Content -Path (Join-Path $absOut "Start-MMS.cmd") -Encoding Ascii -Value $startCmd

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
Set-Content -Path (Join-Path $absOut "Stop-MMS.cmd") -Encoding Ascii -Value $stopCmd

$restartCmd = @"
@echo off
setlocal
set PORT=$Port
call "%~dp0Stop-MMS.cmd"
call "%~dp0Start-MMS.cmd" %PORT%
endlocal
"@
Set-Content -Path (Join-Path $absOut "Restart-MMS.cmd") -Encoding Ascii -Value $restartCmd
$fwCmd = @"
@echo off
setlocal
set PORT=$Port
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process PowerShell -ArgumentList '-NoProfile -ExecutionPolicy Bypass -Command \"New-NetFirewallRule -DisplayName ''MMS-%PORT%'' -Direction Inbound -Action Allow -Protocol TCP -LocalPort %PORT% -Profile Private\"' -Verb RunAs"
echo If prompted by UAC, approve to add firewall rule for port %PORT% (Private, MMS).
endlocal
"@
Set-Content -Path (Join-Path $absOut "Open-Firewall.cmd") -Encoding Ascii -Value $fwCmd
# Reserve URL ACL for LAN binding (optional, may require admin)
$aclCmd = @"
@echo off
setlocal
set PORT=$Port
echo Reserving URL ACL for http://+:%PORT%/
netsh http add urlacl url=http://+:%PORT%/ user=Everyone
if %ERRORLEVEL% NEQ 0 (
  echo If this failed, right-click and Run as administrator.
)
endlocal
"@
Set-Content -Path (Join-Path $absOut "Reserve-URL.cmd") -Encoding Ascii -Value $aclCmd
# Friendly aliases
$aliasStart = "@echo off`r`ncall `"%~dp0Start-MMS.cmd`""
$aliasStop = "@echo off`r`ncall `"%~dp0Stop-MMS.cmd`""
$aliasRestart = "@echo off`r`ncall `"%~dp0Restart-MMS.cmd`""
Set-Content -Path (Join-Path $absOut "start-portable.cmd") -Encoding Ascii -Value $aliasStart
Set-Content -Path (Join-Path $absOut "stop-portable.cmd") -Encoding Ascii -Value $aliasStop
Set-Content -Path (Join-Path $absOut "restart-portable.cmd") -Encoding Ascii -Value $aliasRestart
$zipPath = Join-Path $rootPath $ZipName
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
Compress-Archive -Path (Join-Path $absOut "*") -DestinationPath $zipPath -Force
Write-Host "Portable package created:" $zipPath
