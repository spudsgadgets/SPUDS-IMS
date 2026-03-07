@echo off
setlocal
set PORT=%1
if "%PORT%"=="" set PORT=3200
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\Make-Installer.ps1" -Port %PORT% -OpenFirewall -Lan
if exist "%~dp0dist\SPUDS-MMS-Installer.exe" (
  echo Installer created: dist\SPUDS-MMS-Installer.exe
) else (
  echo Build failed
  exit /b 1
)
endlocal
