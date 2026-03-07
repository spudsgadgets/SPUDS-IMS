@echo off
setlocal
set PORT=3200
call "%~dp0Stop-MMS.cmd"
call "%~dp0Start-MMS.cmd" %PORT%
endlocal
