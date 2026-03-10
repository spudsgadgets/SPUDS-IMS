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
