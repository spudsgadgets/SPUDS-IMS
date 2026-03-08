@echo off
setlocal
set PORT=3200
if not "%~1"=="" set PORT=%~1
echo Adding firewall rule for IMS dev port %PORT% (Inbound TCP)...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "try { ^
     if (-not (Get-NetFirewallRule -DisplayName ('IMS-DEV-'+%PORT%) -ErrorAction SilentlyContinue)) { ^
       New-NetFirewallRule -DisplayName ('IMS-DEV-'+%PORT%) -Direction Inbound -Action Allow -Protocol TCP -LocalPort %PORT% ^
     } ^
   } catch { ^
     Write-Host 'Failed to add firewall rule. Please run this script as administrator.' ^
   }"
echo Done.
endlocal
