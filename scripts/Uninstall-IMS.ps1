param(
  [string]$InstallDir = "$env:LOCALAPPDATA\SPUDS-MMS",
  [int]$Port = 3200
)
$ErrorActionPreference = "Stop"
$desktop = [Environment]::GetFolderPath("Desktop")
$startMenu = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs"
$lnkDesktop = Join-Path $desktop "IMS.lnk"
$lnkStart = Join-Path $startMenu "IMS.lnk"
if (Test-Path $lnkDesktop) { Remove-Item $lnkDesktop -Force }
if (Test-Path $lnkStart) { Remove-Item $lnkStart -Force }
try { Get-NetFirewallRule -DisplayName "IMS-$Port" -ErrorAction SilentlyContinue | Remove-NetFirewallRule } catch {}
if (Test-Path $InstallDir) { Remove-Item $InstallDir -Recurse -Force }
Write-Host "Uninstalled from:" $InstallDir
