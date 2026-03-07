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
