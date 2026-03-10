@echo off
setlocal
set SCRIPT_DIR=%~dp0
powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%scripts\create-shortcuts.ps1"
endlocal
exit /b 0
