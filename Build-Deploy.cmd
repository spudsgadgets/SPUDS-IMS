@echo off
setlocal
set SRC=%~dp0
set DEP=%SRC%deploy
set OUT=%SRC%IMS-Deploy.zip
if exist "%DEP%" rmdir /s /q "%DEP%"
mkdir "%DEP%"
xcopy /E /I /Y "%SRC%js" "%DEP%js" >nul
copy /Y "%SRC%index.html" "%DEP%" >nul
copy /Y "%SRC%styles.css" "%DEP%" >nul
copy /Y "%SRC%app.js" "%DEP%" >nul
copy /Y "%SRC%server.js" "%DEP%" >nul
copy /Y "%SRC%Start-IMS.cmd" "%DEP%" >nul
copy /Y "%SRC%Allow-IMS-Port.cmd" "%DEP%" >nul
powershell -NoProfile -ExecutionPolicy Bypass -Command "Compress-Archive -Path '%DEP%\*' -DestinationPath '%OUT%' -Force"
echo %OUT%
endlocal
