param(
  [int]$Port = 3200,
  [string]$InstallDir = "$env:LOCALAPPDATA\SPUDS-MMS",
  [switch]$Lan,
  [switch]$OpenFirewall,
  [string]$OutDir = "dist"
)
$ErrorActionPreference = "Stop"
$root = (Get-Location).Path
$dist = Join-Path $root $OutDir
if (-not (Test-Path $dist)) { New-Item -ItemType Directory -Force -Path $dist | Out-Null }
$work = Join-Path $dist "installer-work"
if (Test-Path $work) { Remove-Item $work -Recurse -Force }
New-Item -ItemType Directory -Force -Path $work | Out-Null

# Build portable payload for installer
$payloadRel = Join-Path "dist" "installer-work\payload"
powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $root "scripts\Make-Portable.ps1") -Port $Port -OutDir $payloadRel
$payload = Join-Path $work "payload"
Copy-Item -Force (Join-Path $root "scripts\Uninstall-IMS.ps1") (Join-Path $work "Uninstall-IMS.ps1")

# Setup and Uninstall bootstrap CMDs
$lanFlag = if ($Lan.IsPresent) { "-Lan" } else { "" }
$fwFlag = if ($OpenFirewall.IsPresent) { "-OpenFirewall" } else { "" }
$setupCmd = @"
@echo off
setlocal
set PORT=$Port
set INSTALL_DIR=$InstallDir
set SCRIPT_DIR=%~dp0
set PAYLOAD=%SCRIPT_DIR%payload
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"
robocopy "%PAYLOAD%" "%INSTALL_DIR%" /E /XO >nul
if %ERRORLEVEL% GEQ 8 (
  echo File copy failed.
  exit /b 1
)
call "%INSTALL_DIR%\Open-Firewall.cmd"
REM Create shortcuts
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$sh=New-Object -ComObject WScript.Shell; ^
   $desktop=[Environment]::GetFolderPath('Desktop'); ^
   $startMenu=Join-Path $env:APPDATA 'Microsoft\\Windows\\Start Menu\\Programs'; ^
   $target=Join-Path '$InstallDir' 'Start-MMS.cmd'; ^
   $lnk1=$sh.CreateShortcut((Join-Path $desktop 'MMS.lnk')); $lnk1.TargetPath=$target; $lnk1.WorkingDirectory='$InstallDir'; $lnk1.IconLocation=""$env:SystemRoot\\System32\\shell32.dll,44""; $lnk1.Save(); ^
   $lnk2=$sh.CreateShortcut((Join-Path $startMenu 'MMS.lnk')); $lnk2.TargetPath=$target; $lnk2.WorkingDirectory='$InstallDir'; $lnk2.IconLocation=""$env:SystemRoot\\System32\\shell32.dll,44""; $lnk2.Save();"
echo Installed SPUDS-MMS to %INSTALL_DIR% on port %PORT%.
echo Shortcuts created as 'MMS' on Desktop and Start Menu.
endlocal
"@
Set-Content -Path (Join-Path $work "Setup.cmd") -Encoding Ascii -Value $setupCmd

$uninstallCmd = @"
@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Uninstall-IMS.ps1" -InstallDir "$InstallDir" -Port $Port
echo Uninstalled SPUDS-MMS from $InstallDir
endlocal
"@
Set-Content -Path (Join-Path $work "Uninstall.cmd") -Encoding Ascii -Value $uninstallCmd

# IExpress SED file
$sed = @"
[Version]
Class=IEXPRESS
SEDVersion=3

[Options]
PackagePurpose=InstallApp
ShowInstallProgramWindow=1
HideExtractAnimation=1
UseLongFileName=1
InsideCompressed=0
RebootMode=I
TargetName=$dist\SPUDS-MMS-Installer.exe
FriendlyName=SPUDS-MMS Installer
AppLaunched=Setup.cmd
PostInstallCmd=<None>
AdminQuietInstCmd=Setup.cmd
UserQuietInstCmd=Setup.cmd
SourceFiles=SourceFiles

[Strings]
InstallPrompt=
FinishMessage=Installation complete.
CabinetFile=SPUDS-MMS.cab
CabinetNameTemplate=SPUDS-MMS.cab
AppLaunched=Setup.cmd
FriendlyName=SPUDS-MMS Installer
TargetName=$dist\SPUDS-MMS-Installer.exe

[SourceFiles]
SourceFiles0=$work

[SourceFiles0]
%SourceFiles0%= 

[FileList]
Setup.cmd=
Uninstall.cmd=
Install-IMS.ps1=
Uninstall-IMS.ps1=
payload\*=
"@
$sedPath = Join-Path $work "build.sed"
Set-Content -Path $sedPath -Encoding Ascii -Value $sed

# Run IEXPRESS
$iexpress = Join-Path $env:SystemRoot "System32\iexpress.exe"
if (-not (Test-Path $iexpress)) { throw "iexpress.exe not found" }
& $iexpress /N $sedPath | Out-Null
$expected = Join-Path $dist "SPUDS-MMS-Installer.exe"
$fallback = Join-Path $dist "SPUDS-MMS.exe"
if ((Test-Path $fallback) -and -not (Test-Path $expected)) {
  Move-Item -Force $fallback $expected
}
Write-Host "Installer created:" $expected
