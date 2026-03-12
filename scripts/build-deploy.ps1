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
$exclude = @('node_modules','dist','.git','coverage',$ReleasesDir)
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
function TryNpmInstall($dir){
  try{
    $npm = Get-Command -Name npm -ErrorAction SilentlyContinue
    if(-not $npm){ Write-Warning "npm not found; will copy node_modules from root if available."; return $false }
    Push-Location $dir
    try{
      if(Test-Path (Join-Path $dir "package-lock.json")){
        & npm ci --omit=dev
      }else{
        & npm install --omit=dev
      }
      Write-Host "Installed production dependencies in bundle via npm."
      return $true
    }finally{ Pop-Location }
  }catch{
    Write-Warning ("npm install failed: {0}" -f $_)
    return $false
  }
}
if(-not (TryNpmInstall $bundle)){
  try{
    $srcNodeMods = Join-Path $root "node_modules"
    $dstNodeMods = Join-Path $bundle "node_modules"
    if(Test-Path $srcNodeMods){
      Copy-Item -Recurse -Force -LiteralPath $srcNodeMods -Destination $dstNodeMods
      Write-Host "Copied node_modules from root into deploy bundle."
    }else{
      Write-Warning "node_modules not available; runtime may fail. Ensure dependencies are installed before packaging."
    }
  }catch{
    Write-Warning ("Failed to copy node_modules: {0}" -f $_)
  }
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
    # brand: replace IMS or IMS vX inside brand-name span
    $html = [regex]::Replace($html,'(?<=class="brand-name">)IMS(?: v[0-9][^<]*)?',("IMS v{0}" -f $pkgVer))
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
if(Test-Path $zipLatest){ Remove-Item -Force $zipLatest }
Compress-Archive -Path (Join-Path $bundle "*") -DestinationPath $zipLatest -Force
Copy-Item -Force $zipLatest $zipRelease
Remove-Item -Recurse -Force $bundle
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
