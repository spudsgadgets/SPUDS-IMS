@echo off
setlocal
set PORT=%1
if "%PORT%"=="" set PORT=3200
cd /d "%~dp0"
set "ROOTDIR=%~dp0www"
if not exist "%ROOTDIR%" set "ROOTDIR=%~dp0"
set "NODE="
if exist "%~dp0node.exe" set "NODE=%~dp0node.exe"
if not defined NODE if exist "%~dp0bin\node.exe" set "NODE=%~dp0bin\node.exe"
if not defined NODE for /f "usebackq delims=" %%F in (`where node 2^>nul`) do if not defined NODE set "NODE=%%F"
if defined NODE (
  set "ROOT=%ROOTDIR%"
  start "SPUDS MMS" "%NODE%" "%~dp0server.js" %PORT%
) else (
  echo Node.js not found. Falling back to PowerShell server.
  start "SPUDS MMS" powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\Serve-Static.ps1" -Root "%ROOTDIR%" -Port %PORT% -Lan
)
endlocal
