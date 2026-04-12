@echo off
setlocal
set SCRIPT_DIR=%~dp0

:: Check for Administrator privileges
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo.
    echo Requesting Administrator privileges...
    powershell.exe -Command "Start-Process -FilePath '%0' -Verb RunAs"
    exit /b
)

set UNINSTALL_TEMP=%TEMP%\spuds-ims-uninstall-%RANDOM%
echo SPUDS IMS Uninstaller
echo =====================
echo.
echo This will uninstall SPUDS IMS from your system.
echo.

:: Check for uninstaller script
if not exist "%SCRIPT_DIR%uninstall-spuds-ims.ps1" (
    echo [ERROR] Uninstaller script not found in %SCRIPT_DIR%
    pause
    exit /b 1
)

:: Copy to temp to avoid locking the installation directory
mkdir "%UNINSTALL_TEMP%"
copy /y "%SCRIPT_DIR%uninstall-spuds-ims.ps1" "%UNINSTALL_TEMP%\" > nul

:: Determine the installation directory
:: If we are in a 'scripts' folder, the install dir is one level up.
:: Otherwise, we assume we are already in the install dir.
set "INSTALL_DIR=%SCRIPT_DIR%"
if /i "%SCRIPT_DIR:~-8%"=="scripts\" (
    set "INSTALL_DIR=%SCRIPT_DIR%.."
)

:: Run uninstaller with PowerShell bypass from temp
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "& '%UNINSTALL_TEMP%\uninstall-spuds-ims.ps1' -InstallDir '%INSTALL_DIR%'"

set ERR=%ERRORLEVEL%

:: Cleanup temp uninstaller
rmdir /s /q "%UNINSTALL_TEMP%" 2>nul

if %ERR% NEQ 0 (
    echo.
    echo [WARNING] Uninstallation encountered an issue. 
    echo Please check the log in %%TEMP%%\spuds-ims-uninstall.log
    pause
) else (
    echo.
    echo Uninstallation complete. This window will now close.
    timeout /t 5
)
