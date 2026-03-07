@echo off
setlocal
set PORT=%1
if "%PORT%"=="" set PORT=3200
call "%~dp0stop-server.cmd"
call "%~dp0start-server.cmd" %PORT%
endlocal
