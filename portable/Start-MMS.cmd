@echo off
setlocal
set PORT=3200
set ROOT=%~dp0www
cd /d "%~dp0"
set "NODE="
if exist "%~dp0node.exe" set "NODE=%~dp0node.exe"
if not defined NODE if exist "%~dp0bin\node.exe" set "NODE=%~dp0bin\node.exe"
if not defined NODE for /f "usebackq delims=" %%F in (where node 2^>nul) do if not defined NODE set "NODE=%%F"
if defined NODE (
  start "SPUDS MMS" "%NODE%" "%~dp0server.js" %PORT%
) else (
  start "SPUDS MMS" powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Serve-Static.ps1" -Root "%~dp0www" -Port %PORT% -Lan
)
endlocal
