@echo off
setlocal
set NAME=IMS-DEV
set PORT=3200
if not "%~1"=="" set PORT=%~1
set SRV=%~dp0server.js
echo Installing Scheduled Task "%NAME%" on port %PORT%...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "try { Unregister-ScheduledTask -TaskName '%NAME%' -Confirm:$false -ErrorAction SilentlyContinue } catch {}; ^
   $act = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument '-NoProfile -ExecutionPolicy Bypass -Command node \"\"\"%SRV%\"\"\" %PORT%'; ^
   $trg = New-ScheduledTaskTrigger -AtLogOn; ^
   $prn = New-ScheduledTaskPrincipal -UserId ([System.Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Limited; ^
   Register-ScheduledTask -TaskName '%NAME%' -Action $act -Trigger $trg -Principal $prn -Description 'IMS dev server' -Force; ^
   Start-ScheduledTask -TaskName '%NAME%';"
echo Done.
endlocal
