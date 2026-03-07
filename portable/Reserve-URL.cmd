@echo off
setlocal
set PORT=3200
echo Reserving URL ACL for http://+:%PORT%/
netsh http add urlacl url=http://+:%PORT%/ user=Everyone
if %ERRORLEVEL% NEQ 0 (
  echo If this failed, right-click and Run as administrator.
)
endlocal
