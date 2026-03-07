@echo off
setlocal
set PORT=3200
call "%~dp0Stop-IMS.cmd"
call "%~dp0Start-IMS.cmd" %PORT%
endlocal
