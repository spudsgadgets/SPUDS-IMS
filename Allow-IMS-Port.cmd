@echo off
setlocal
set PORT=3200
if not "%~1"=="" set PORT=%~1
netsh advfirewall firewall add rule name="IMS-%PORT%" dir=in action=allow protocol=TCP localport=%PORT% profile=any
echo Firewall rule added for port %PORT%
endlocal
