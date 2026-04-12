param(
  [string]$ZipName = "SPUDS-IMS-Deploy.zip",
  [string]$ReleasesDir = "releases",
  [switch]$Publish,
  [switch]$NoMariaDB,
  [switch]$CreateInstaller,
  [string]$InstallerName = "SPUDS-IMS-Installer.zip"
)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Split-Path -Parent $root
$bundle = Join-Path $root ("deploy-bundle-" + [guid]::NewGuid().ToString())
New-Item -ItemType Directory -Path $bundle | Out-Null
# derive metadata
function _Try($script){ try{ & ([scriptblock]::Create($script)) }catch{ $null } }
$pkgVer = (_Try "(Get-Content -Raw -LiteralPath (Join-Path '$root' 'package.json') | ConvertFrom-Json).version") ; if(-not $pkgVer){ $pkgVer = "0.0.0" }
$sha = (_Try "git rev-parse --short HEAD").Trim() ; if(-not $sha){ $sha = "nogit" }
$ts = Get-Date -Format "yyyyMMdd-HHmmss"
$releaseName = "SPUDS-IMS-Deploy-$($pkgVer).zip"
$releaseDirPath = Join-Path $root $ReleasesDir
if(-not (Test-Path $releaseDirPath)){ New-Item -ItemType Directory -Path $releaseDirPath | Out-Null }
# copy files into bundle
$exclude = @('node_modules','dist','.git','coverage',$ReleasesDir,'local-mariadb','backups','logs','.github','.tools','.vscode')
$excludeFiles = @('.gitignore',(Split-Path -Leaf $ZipName))
$items = Get-ChildItem -Force -LiteralPath $root
foreach($item in $items){
  if($exclude -contains $item.Name){ continue }
  if($item.Name -like "deploy-bundle*"){ continue }
  if((-not $item.PSIsContainer) -and ($excludeFiles -contains $item.Name)){ continue }
  if((-not $item.PSIsContainer) -and ($item.Extension -in @('.zip','.7z','.rar'))){ continue }
  $dest = Join-Path $bundle $item.Name
  if($item.PSIsContainer){
    Copy-Item -Recurse -Force -LiteralPath $item.FullName -Destination $dest
  }else{
    Copy-Item -Force -LiteralPath $item.FullName -Destination $dest
  }
}
$mariaDownloads = Join-Path $bundle "mariadb\downloads"
if(Test-Path $mariaDownloads){
  for($i=0;$i -lt 240;$i++){
    try{
      Remove-Item -Recurse -Force -LiteralPath $mariaDownloads -ErrorAction Stop
      break
    }catch{
      Start-Sleep -Milliseconds 250
    }
  }
  if(Test-Path $mariaDownloads){
    Remove-Item -Recurse -Force -LiteralPath $mariaDownloads
  }
}
$mariaInclude = Join-Path $bundle "mariadb\include"
if(Test-Path $mariaInclude){
  for($i=0;$i -lt 240;$i++){
    try{
      Remove-Item -Recurse -Force -LiteralPath $mariaInclude -ErrorAction Stop
      break
    }catch{
      Start-Sleep -Milliseconds 250
    }
  }
  if(Test-Path $mariaInclude){
    Remove-Item -Recurse -Force -LiteralPath $mariaInclude
  }
}
if($NoMariaDB){
  try{
    $mariaDir = Join-Path $bundle "mariadb"
    if(Test-Path $mariaDir){
      for($i=0;$i -lt 240;$i++){
        try{
          Remove-Item -Recurse -Force -LiteralPath $mariaDir -ErrorAction Stop
          break
        }catch{
          Start-Sleep -Milliseconds 250
        }
      }
      if(Test-Path $mariaDir){
        Remove-Item -Recurse -Force -LiteralPath $mariaDir -ErrorAction SilentlyContinue
      }
      Write-Host "Removed MariaDB folder from bundle (-NoMariaDB)."
    }
  }catch{
    Write-Warning ("Could not remove MariaDB folder: {0}" -f $_)
  }
}
function TryNpmInstall($dir){
  try{
    $nodeCmd = Get-Command -Name node -ErrorAction SilentlyContinue
    $nodeExe = $null
    if($nodeCmd -and $nodeCmd.Source){ $nodeExe = $nodeCmd.Source }
    if(-not $nodeExe){
      $defaultNode = "C:\Program Files\nodejs\node.exe"
      if(Test-Path $defaultNode){ $nodeExe = $defaultNode }
    }
    $npmCli = $null
    if($nodeExe){
      $nodeDir = Split-Path -Parent $nodeExe
      $cand = Join-Path $nodeDir "node_modules\npm\bin\npm-cli.js"
      if(Test-Path $cand){ $npmCli = $cand }
    }
    $npm = Get-Command -Name npm -ErrorAction SilentlyContinue
    if(-not $npmCli -and -not $npm){ Write-Warning "npm not found; will copy node_modules from root if available."; return $false }
    Push-Location $dir
    try{
      if(Test-Path (Join-Path $dir "package-lock.json")){
        if($npmCli){ & $nodeExe $npmCli ci --omit=dev --no-audit --no-fund --loglevel=error } else { & npm ci --omit=dev --no-audit --no-fund --loglevel=error }
      }else{
        if($npmCli){ & $nodeExe $npmCli install --omit=dev --no-audit --no-fund --loglevel=error } else { & npm install --omit=dev --no-audit --no-fund --loglevel=error }
      }
      if($LASTEXITCODE -ne 0){ return $false }
      Write-Host "Installed production dependencies in bundle via npm."
      return $true
    }finally{ Pop-Location }
  }catch{
    Write-Warning ("npm install failed: {0}" -f $_)
    return $false
  }
}
function Remove-ItemRetry([string]$path){
  if(-not (Test-Path $path)){ return }
  for($i=0;$i -lt 240;$i++){
    try{
      Remove-Item -Recurse -Force -LiteralPath $path -ErrorAction Stop
      return
    }catch{
      Start-Sleep -Milliseconds 250
    }
  }
  Remove-Item -Recurse -Force -LiteralPath $path
}
function Remove-FileRetry([string]$path){
  if(-not (Test-Path $path)){ return }
  for($i=0;$i -lt 240;$i++){
    try{
      Remove-Item -Force -LiteralPath $path -ErrorAction Stop
      return
    }catch{
      Start-Sleep -Milliseconds 250
    }
  }
  Remove-Item -Force -LiteralPath $path
}
function Move-FileRetry([string]$src,[string]$dest){
  if(-not (Test-Path $src)){ throw ("Source file not found: {0}" -f $src) }
  for($i=0;$i -lt 240;$i++){
    try{
      Move-Item -Force -LiteralPath $src -Destination $dest -ErrorAction Stop
      return
    }catch{
      Start-Sleep -Milliseconds 250
    }
  }
  Copy-Item -Force -LiteralPath $src -Destination $dest
  Remove-FileRetry $src
}
function Test-ZipReadable([string]$zipPath){
  try{
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $z = [System.IO.Compression.ZipFile]::OpenRead((Resolve-Path -LiteralPath $zipPath).Path)
    try{
      return [int]$z.Entries.Count -ge 1
    }finally{
      $z.Dispose()
    }
  }catch{
    return $false
  }
}
function New-ZipFromFolder([string]$sourceDir,[string]$destZip){
  Add-Type -AssemblyName System.IO.Compression
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $destDir = Split-Path -Parent $destZip
  if($destDir -and -not (Test-Path $destDir)){ New-Item -ItemType Directory -Path $destDir -Force | Out-Null }
  $tmpZip = Join-Path ([System.IO.Path]::GetTempPath()) ((Split-Path -Leaf $destZip) + ".tmp-" + [guid]::NewGuid().ToString() + ".zip")
  Remove-FileRetry $tmpZip
  $zip = $null
  $zip = [System.IO.Compression.ZipFile]::Open($tmpZip,[System.IO.Compression.ZipArchiveMode]::Create)
  try{
    $src = (Resolve-Path -LiteralPath $sourceDir).Path
    $files = Get-ChildItem -LiteralPath $src -Recurse -File -Force
    foreach($f in $files){
      $full = $f.FullName
      $rel = $full.Substring($src.Length).TrimStart('\','/')
      $rel = $rel -replace '\\','/'
      if([string]::IsNullOrWhiteSpace($rel)){ continue }
      if($rel -like "mariadb/downloads/*"){ continue }
      if($rel -like "mariadb/data/*"){ continue }
      if($rel -like "mariadb/include/*"){ continue }
      $entry = $zip.CreateEntry($rel,[System.IO.Compression.CompressionLevel]::Optimal)
      $inStream = $null
      for($i=0;$i -lt 240;$i++){
        try{
          $inStream = [System.IO.File]::Open($full,[System.IO.FileMode]::Open,[System.IO.FileAccess]::Read,[System.IO.FileShare]::ReadWrite)
          break
        }catch{
          Start-Sleep -Milliseconds 250
        }
      }
      if(-not $inStream){
        Write-Warning ("Skipping unreadable file: {0}" -f $rel)
        continue
      }
      $outStream = $null
      try{
        $outStream = $entry.Open()
        $inStream.CopyTo($outStream)
      }finally{
        if($outStream){ $outStream.Dispose() }
        $inStream.Dispose()
      }
    }
  }finally{
    if($zip){ $zip.Dispose() }
  }
  if(-not (Test-ZipReadable $tmpZip)){ throw ("ZIP validation failed: {0}" -f $tmpZip) }
  Remove-FileRetry $destZip
  Copy-Item -Force -LiteralPath $tmpZip -Destination $destZip -ErrorAction Stop
  if(-not (Test-ZipReadable $destZip)){ throw ("ZIP validation failed after copy: {0}" -f $destZip) }
  Remove-FileRetry $tmpZip
  if(-not (Test-Path $destZip)){ throw ("Failed to create ZIP: {0}" -f $destZip) }
}
$srcNodeMods = Join-Path $root "node_modules"
$dstNodeMods = Join-Path $bundle "node_modules"
$didDeps = TryNpmInstall $bundle
if(-not $didDeps){
  try{
    if(Test-Path $srcNodeMods){
      Copy-Item -Recurse -Force -LiteralPath $srcNodeMods -Destination $dstNodeMods
      Write-Host "Copied node_modules from root into deploy bundle."
      $didDeps = $true
    }
  }catch{
    Write-Warning ("Failed to copy node_modules: {0}" -f $_)
  }
}
if(-not $didDeps){
  Write-Warning "Dependencies were not installed/copied into the deploy bundle (node_modules missing). Runtime may fail."
}
try{
  $nodeExe = Join-Path $bundle "node\node.exe"
  if(-not (Test-Path $nodeExe)){
    $nodeDir = Join-Path $bundle "node"
    if(-not (Test-Path $nodeDir)){ New-Item -ItemType Directory -Path $nodeDir | Out-Null }
    $ver = "20.11.1"; $arch = "x64"
    $zipUrl = ("https://nodejs.org/dist/v{0}/node-v{0}-win-{1}.zip" -f $ver,$arch)
    $tmpZip = Join-Path ([System.IO.Path]::GetTempPath()) ("node-" + $ver + "-" + $arch + "-" + [guid]::NewGuid().ToString() + ".zip")
    Invoke-WebRequest -UseBasicParsing -Uri $zipUrl -OutFile $tmpZip -TimeoutSec 60
    $tmpExtract = Join-Path ([System.IO.Path]::GetTempPath()) ("node-extract-" + [guid]::NewGuid().ToString())
    New-Item -ItemType Directory -Path $tmpExtract | Out-Null
    Expand-Archive -Path $tmpZip -DestinationPath $tmpExtract -Force
    $ex = Get-ChildItem -Path $tmpExtract -Directory | Where-Object { $_.Name -like ("node-v{0}*" -f $ver) } | Select-Object -First 1
    if($ex){ $exe = Join-Path $ex.FullName "node.exe"; if(Test-Path $exe){ Copy-Item -Force $exe $nodeExe } }
    try{ Remove-Item -Force $tmpZip }catch{}; try{ Remove-Item -Recurse -Force $tmpExtract }catch{}
  }
}catch{}
try{
  if(-not $NoMariaDB){
    $mysqld1 = Join-Path $bundle "mariadb\bin\mysqld.exe"
    $mysqld2 = Join-Path $bundle "mariadb\bin\mariadbd.exe"
    if((-not (Test-Path $mysqld1)) -and (-not (Test-Path $mysqld2))){
      $setupMaria = Join-Path $bundle "scripts\setup-portable-mariadb.ps1"
      if(Test-Path $setupMaria){
        Write-Host "Bundling portable MariaDB into deploy ZIP..."
        & $setupMaria -Port 3307 -NoStart
      }else{
        Write-Warning "setup-portable-mariadb.ps1 not found in bundle; portable MariaDB will not be included."
      }
    }
  }else{
    Write-Host "Skipping portable MariaDB bundling (-NoMariaDB selected)."
  }
}catch{
  Write-Warning ("Portable MariaDB bundling failed: {0}" -f $_)
}
# ensure version is stamped into UI
try{
  $idx = Join-Path $bundle "public\index.html"
  if(Test-Path $idx){
    $html = Get-Content -Raw -LiteralPath $idx -Encoding UTF8
    # title: replace IMS or IMS vX => IMS v<package>
    $html = [regex]::Replace($html,'(?<=<title>\s*)IMS(?: v[0-9][^<]*)?(?=\s*</title>)',("IMS v{0}" -f $pkgVer))
    Set-Content -LiteralPath $idx -Encoding UTF8 -Value $html
    Write-Host ("Stamped UI version: v{0}" -f $pkgVer)
  }
}catch{
  Write-Warning ("Could not stamp version into index.html: {0}" -f $_)
}
# remove nested git folders
Get-ChildItem -Path $bundle -Recurse -Force -Directory -Filter ".git" | ForEach-Object { Remove-Item -Recurse -Force $_.FullName }
# write release metadata inside bundle
$meta = [pscustomobject]@{
  name = "SPUDS-IMS"
  version = $pkgVer
  commit = $sha
  builtAt = (Get-Date).ToString("s")
  zip = $releaseName
}
$metaPath = Join-Path $bundle "release-info.json"
$meta | ConvertTo-Json -Depth 5 | Out-File -FilePath $metaPath -Encoding UTF8 -Force
# build zips
$zipLatest = Join-Path $root $ZipName
$zipRelease = Join-Path $releaseDirPath $releaseName
New-ZipFromFolder $bundle $zipLatest
if(-not (Test-Path $zipLatest)){
  try{
    $pattern = ($ZipName + ".tmp-*")
    $fallback = Get-ChildItem -LiteralPath $root -Filter $pattern -File -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if($fallback){
      Move-Item -Force -LiteralPath $fallback.FullName -Destination $zipLatest -ErrorAction Stop
    }
  }catch{}
}
Copy-Item -Force $zipLatest $zipRelease
if(-not (Test-Path -LiteralPath $zipRelease)){
  $alt = Join-Path $root $releaseName
  if(Test-Path -LiteralPath $alt){
    try{ Move-Item -Force -LiteralPath $alt -Destination $zipRelease }catch{}
  }
}
Remove-ItemRetry $bundle
Write-Host "Deploy ZIP created:"
Write-Host " - Latest:  $zipLatest"
Write-Host " - Release: $zipRelease"
if($Publish){
  $notes = @"
Version: $pkgVer
Commit:  $sha
Built:   $($meta.builtAt)

This release package mirrors the root 'latest' ZIP and includes release-info.json.
"@
  & (Join-Path $root "scripts\publish-release.ps1") -ZipPath $zipRelease -Tag ("v{0}-{1}-{2}" -f $pkgVer,$ts,$sha) -Name ("SPUDS IMS {0}" -f $pkgVer) -Body $notes
}

# Create enhanced installer package if requested
if($CreateInstaller){
  Write-Host "Creating enhanced installer package..."
  $installerBundle = Join-Path $root ("installer-bundle-" + [guid]::NewGuid().ToString())
  New-Item -ItemType Directory -Path $installerBundle | Out-Null
  try{
    # Copy the main deploy ZIP
    $deployZipName = "SPUDS-IMS-Deploy-v{0}.zip" -f $pkgVer
    $deployZipDest = Join-Path $installerBundle $deployZipName
    Copy-Item -Force -LiteralPath $zipLatest -Destination $deployZipDest
    
    # Copy installer script
    $installerScript = Join-Path $root "scripts\install-spuds-ims.ps1"
    if(Test-Path $installerScript) {
      Copy-Item -Force -LiteralPath $installerScript -Destination (Join-Path $installerBundle "install-spuds-ims.ps1")
    }
    
    # Copy uninstaller script to installer bundle
    $uninstallerScript = Join-Path $root "scripts\uninstall-spuds-ims.ps1"
    if(Test-Path $uninstallerScript) {
      Copy-Item -Force -LiteralPath $uninstallerScript -Destination (Join-Path $installerBundle "uninstall-spuds-ims.ps1")
    }

    # Copy uninstaller batch to installer bundle
    $uninstallerBat = Join-Path $root "scripts\uninstall.bat"
    if(Test-Path $uninstallerBat) {
      Copy-Item -Force -LiteralPath $uninstallerBat -Destination (Join-Path $installerBundle "uninstall.bat")
    }
    
    # Create installation instructions
    $instructions = @"
# SPUDS IMS Installation Instructions

## Quick Install (Recommended)
1. Extract this archive to a folder
2. Right-click on `install-spuds-ims.ps1` and select "Run with PowerShell"
3. Follow the on-screen instructions

## Silent Install (Advanced)
For automated deployment, run PowerShell as Administrator and execute:
```powershell
.\install-spuds-ims.ps1 -Silent -CreateShortcuts -StartAfterInstall
```

## Custom Installation
```powershell
# Install to custom directory
.\install-spuds-ims.ps1 -InstallDir "C:\MyApps\SPUDS-IMS"

# Skip MariaDB installation
.\install-spuds-ims.ps1 -NoMariaDB

# Custom ports
.\install-spuds-ims.ps1 -Port 8080 -DbPort 3308
```

## Post-Installation
- Application URL: http://localhost:3200
- Database Port: 3307
- Shortcuts: Created on Desktop and Start Menu (including Uninstaller)
- Start scripts: quick-start.bat, start-spuds-ims.bat, start-database.bat

## Support
Installation log: %TEMP%\spuds-ims-install.log

## Uninstallation
To uninstall, run `uninstall-spuds-ims.ps1` from the installation directory with PowerShell.
```powershell
# Standard uninstall (will prompt to remove data)
.\uninstall-spuds-ims.ps1

# Force remove everything (including database)
.\uninstall-spuds-ims.ps1 -RemoveData

# Uninstall but keep database and backups
.\uninstall-spuds-ims.ps1 -KeepData
```
"@
    Set-Content -Path (Join-Path $installerBundle "README-INSTALL.txt") -Value $instructions -Encoding UTF8
    
    # Create batch file for easy execution
    $easyInstall = @"
@echo off
echo SPUDS IMS Installer
echo ===================
echo.
echo This will install SPUDS IMS with default settings.
echo Press any key to continue or Ctrl+C to cancel...
pause > nul
powershell -ExecutionPolicy Bypass -File "install-spuds-ims.ps1"
pause
"@
    Set-Content -Path (Join-Path $installerBundle "install.bat") -Value $easyInstall -Encoding ASCII
    
    # Create installer metadata
    $installerMeta = [pscustomobject]@{
      name = "SPUDS-IMS-Installer"
      version = $pkgVer
      commit = $sha
      builtAt = (Get-Date).ToString("s")
      deployZip = $deployZipName
      includes = @("install-spuds-ims.ps1", "uninstall-spuds-ims.ps1", "uninstall.bat", "README-INSTALL.txt", "install.bat")
      features = @(
        "Silent installation support",
        "Portable Node.js and MariaDB",
        "Desktop shortcuts",
        "PATH integration",
        "Custom installation paths",
        "Automated database setup",
        "Clean uninstaller with -KeepData support"
      )
    }
    $installerMetaPath = Join-Path $installerBundle "installer-info.json"
    $installerMeta | ConvertTo-Json -Depth 5 | Out-File -FilePath $installerMetaPath -Encoding UTF8 -Force
    
    # Build installer ZIP
    $installerZip = Join-Path $releaseDirPath ("SPUDS-IMS-Installer-v{0}.zip" -f $pkgVer)
    New-ZipFromFolder $installerBundle $installerZip
    
    Write-Host "Enhanced installer package created: $installerZip"
    Write-Host "  - Includes silent installation support"
    Write-Host "  - Portable dependencies (Node.js + MariaDB)"
    Write-Host "  - Desktop shortcuts and PATH integration"
    Write-Host "  - Custom installation options"
    
  }finally{
    Remove-ItemRetry $installerBundle
  }
}
