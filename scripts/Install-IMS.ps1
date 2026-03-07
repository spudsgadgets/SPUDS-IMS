param(
  [string]$InstallDir = "$env:LOCALAPPDATA\SPUDS-MMS",
  [int]$Port = 3200,
  [switch]$OpenFirewall,
  [switch]$Lan
)
$ErrorActionPreference = "Stop"
$rootPath = (Get-Location).Path
$absOut = $InstallDir
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
$lanFlag = if ($Lan.IsPresent) { "-Lan" } else { "" }
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
  start "SPUDS MMS" powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Serve-Static.ps1" -Root "%~dp0www" -Port %PORT% $lanFlag
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
call "%~dp0Stop-IMS.cmd"
call "%~dp0Start-IMS.cmd" %PORT%
endlocal
"@
Set-Content -Path (Join-Path $absOut "Restart-MMS.cmd") -Encoding Ascii -Value $restartCmd
$shell = New-Object -ComObject WScript.Shell
$desktop = [Environment]::GetFolderPath("Desktop")
$startMenu = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs"
$target = Join-Path $absOut "Start-MMS.cmd"
$lnk1 = $shell.CreateShortcut((Join-Path $desktop "MMS.lnk"))
$lnk1.TargetPath = $target
$lnk1.WorkingDirectory = $absOut
$lnk1.IconLocation = "$env:SystemRoot\System32\shell32.dll,44"
$lnk1.Save()
$lnk2 = $shell.CreateShortcut((Join-Path $startMenu "MMS.lnk"))
$lnk2.TargetPath = $target
$lnk2.WorkingDirectory = $absOut
$lnk2.IconLocation = "$env:SystemRoot\System32\shell32.dll,44"
$lnk2.Save()
if ($OpenFirewall) {
  $fwCmd = "New-NetFirewallRule -DisplayName 'MMS-$Port' -Direction Inbound -Action Allow -Protocol TCP -LocalPort $Port -Profile Private"
  try {
    Invoke-Expression $fwCmd
  } catch {
    try {
      Start-Process PowerShell -ArgumentList "-NoProfile -ExecutionPolicy Bypass -Command `"$fwCmd`"" -Verb RunAs | Out-Null
    } catch {}
  }
}
Write-Host "Installed to:" $absOut
Write-Host "Port:" $Port
