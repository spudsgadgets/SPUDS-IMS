@echo off
setlocal
set SCRIPT_DIR=%~dp0
powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%scripts\setup-portable-node.ps1" -Version 20.11.1 -Arch x64
endlocal
exit /b 0
