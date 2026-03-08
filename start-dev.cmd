@echo off
setlocal
set PORT=3200
if not "%~1"=="" set PORT=%~1
node "%~dp0server.js" %PORT%
endlocal
