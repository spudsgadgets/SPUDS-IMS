@echo off
setlocal
set NAME=IMS-DEV
echo Removing Scheduled Task "%NAME%"...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "try { Unregister-ScheduledTask -TaskName '%NAME%' -Confirm:$false } catch {}"
echo Done.
endlocal
