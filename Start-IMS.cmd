@echo off
setlocal
set SCRIPT_DIR=%~dp0
set DESKTOP=%USERPROFILE%\Desktop
if not exist "%DESKTOP%\SPUDS IMS Start.lnk" (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%scripts\create-shortcuts.ps1"
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%scripts\start-all.ps1" -Port 3307
endlocal
exit /b 0
