@echo off
setlocal
set PORT=3200
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process PowerShell -ArgumentList '-NoProfile -ExecutionPolicy Bypass -Command \"New-NetFirewallRule -DisplayName ''IMS-%PORT%'' -Direction Inbound -Action Allow -Protocol TCP -LocalPort %PORT% -Profile Private\"' -Verb RunAs"
echo If prompted by UAC, approve to add firewall rule for port %PORT% (Private).
endlocal
