@echo off
setlocal
set PORT=%1
if "%PORT%"=="" set PORT=3200
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\Make-Portable.ps1" -Port %PORT% -OutDir portable -ZipName "SPUDS-MMS-Deploy.zip"
if exist "%~dp0SPUDS-MMS-Deploy.zip" (
  echo Portable server package created: SPUDS-MMS-Deploy.zip
) else (
  echo Build failed
  exit /b 1
)
endlocal
