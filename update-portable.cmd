@echo off
setlocal
set ZIP=%~1
set TARGET=%~2
set PORT=%~3
if "%ZIP%"=="" set ZIP=%~dp0SPUDS-MMS-Deploy.zip
if "%TARGET%"=="" set TARGET=%LOCALAPPDATA%\SPUDS-MMS
if "%PORT%"=="" set PORT=3200
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\Update-Portable.ps1" -ZipPath "%ZIP%" -TargetDir "%TARGET%" -Port %PORT% -OpenFirewall -ReserveUrl
endlocal
