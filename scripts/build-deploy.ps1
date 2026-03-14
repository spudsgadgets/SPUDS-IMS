param(
  [string]$ZipName = "SPUDS-IMS-Deploy.zip",
  [string]$ReleasesDir = "releases",
  [switch]$Publish
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
$releaseName = "SPUDS-IMS-Deploy-$($pkgVer)-$($ts)-$($sha).zip"
$releaseDirPath = Join-Path $root $ReleasesDir
if(-not (Test-Path $releaseDirPath)){ New-Item -ItemType Directory -Path $releaseDirPath | Out-Null }
# copy files into bundle
$exclude = @('node_modules','dist','.git','coverage',$ReleasesDir,'local-mariadb','backups','logs','.github')
$excludeFiles = @('.gitignore','SPUDS-IMS-Deploy.zip')
$items = Get-ChildItem -Force -LiteralPath $root
foreach($item in $items){
  if($exclude -contains $item.Name){ continue }
  if($item.Name -like "deploy-bundle*"){ continue }
  if((-not $item.PSIsContainer) -and ($excludeFiles -contains $item.Name)){ continue }
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
function TryNpmInstall($dir){
  try{
    $npm = Get-Command -Name npm -ErrorAction SilentlyContinue
    if(-not $npm){ Write-Warning "npm not found; will copy node_modules from root if available."; return $false }
    Push-Location $dir
    try{
      if(Test-Path (Join-Path $dir "package-lock.json")){
        & npm ci --omit=dev --no-audit --no-fund --loglevel=error
      }else{
        & npm install --omit=dev --no-audit --no-fund --loglevel=error
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
function New-ZipFromFolder([string]$sourceDir,[string]$destZip){
  Add-Type -AssemblyName System.IO.Compression
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $tmpZip = ($destZip + ".tmp-" + [guid]::NewGuid().ToString())
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
  Remove-FileRetry $destZip
  Move-Item -Force -LiteralPath $tmpZip -Destination $destZip
}
$srcNodeMods = Join-Path $root "node_modules"
$dstNodeMods = Join-Path $bundle "node_modules"
$didDeps = $false
try{
  if(Test-Path $srcNodeMods){
    Copy-Item -Recurse -Force -LiteralPath $srcNodeMods -Destination $dstNodeMods
    Write-Host "Copied node_modules from root into deploy bundle."
    $didDeps = $true
  }
}catch{
  Write-Warning ("Failed to copy node_modules: {0}" -f $_)
}
if(-not $didDeps){
  if(TryNpmInstall $bundle){ $didDeps = $true }
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
Copy-Item -Force $zipLatest $zipRelease
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
