param(
  [string]$Version = "20.11.1",
  [string]$Arch = "x64"
)
$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Split-Path -Parent $here
$nodeDir = Join-Path $root "node"
if(-not (Test-Path $nodeDir)){ New-Item -ItemType Directory -Path $nodeDir | Out-Null }
$zipUrl = ("https://nodejs.org/dist/v{0}/node-v{0}-win-{1}.zip" -f $Version,$Arch)
$tmpZip = Join-Path ([System.IO.Path]::GetTempPath()) ("node-" + $Version + "-" + $Arch + "-" + [guid]::NewGuid().ToString() + ".zip")
Write-Host ("Downloading Node.js {0} ({1}) ..." -f $Version,$Arch)
Invoke-WebRequest -UseBasicParsing -Uri $zipUrl -OutFile $tmpZip -TimeoutSec 60
$tmpExtract = Join-Path ([System.IO.Path]::GetTempPath()) ("node-extract-" + [guid]::NewGuid().ToString())
New-Item -ItemType Directory -Path $tmpExtract | Out-Null
Expand-Archive -Path $tmpZip -DestinationPath $tmpExtract -Force
$ex = Get-ChildItem -Path $tmpExtract -Directory | Where-Object { $_.Name -like ("node-v{0}*" -f $Version) } | Select-Object -First 1
if(-not $ex){ Write-Error "Extracted Node folder not found."; exit 1 }
$exe = Join-Path $ex.FullName "node.exe"
if(-not (Test-Path $exe)){ Write-Error "node.exe not found in extracted folder."; exit 1 }
Copy-Item -Force $exe (Join-Path $nodeDir "node.exe")
Write-Host ("Placed node.exe at {0}" -f (Join-Path $nodeDir "node.exe"))
try{ Remove-Item -Force $tmpZip }catch{}
try{ Remove-Item -Recurse -Force $tmpExtract }catch{}
Write-Host "Portable Node setup complete."
