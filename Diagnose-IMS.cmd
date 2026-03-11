@echo off
setlocal
set SCRIPT_DIR=%~dp0
set LOG_PATH=%USERPROFILE%\Desktop\IMS-Diagnose.log
powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%scripts\diagnose-access.ps1" -ApiPort 3200 -Fix -Start -Log "%LOG_PATH%"
endlocal
exit /b 0
