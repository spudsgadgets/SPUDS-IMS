@echo off
setlocal
set PORT=%1
if "%PORT%"=="" set PORT=3200
cd /d "%~dp0"
if exist node.exe (
  start "SPUDS MMS" node.exe server.js %PORT%
) else (
  if exist bin\node.exe (
    start "SPUDS MMS" bin\node.exe server.js %PORT%
  ) else (
    where node >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
      start "SPUDS MMS" node server.js %PORT%
    ) else (
      echo Node.js not found. Falling back to PowerShell server.
      start "SPUDS MMS" powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\Serve-Static.ps1" -Root "%~dp0" -Port %PORT% -Lan
    )
  )
)
endlocal
