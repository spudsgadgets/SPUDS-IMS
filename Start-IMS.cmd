@echo off
setlocal
set SCRIPT_DIR=%~dp0
set DESKTOP=%USERPROFILE%\Desktop
set LOG_PATH=%DESKTOP%\IMS-Diagnose.log
if not exist "%DESKTOP%\SPUDS IMS Start.lnk" (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%scripts\create-shortcuts.ps1"
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%scripts\start-ims-elevated.ps1" -DbPort 3307 -ApiPort 3200
powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%scripts\diagnose-access.ps1" -ApiPort 3200 -Fix -Log "%LOG_PATH%"
endlocal
exit /b 0
