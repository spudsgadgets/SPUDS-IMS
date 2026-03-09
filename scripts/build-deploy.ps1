param([string]$ZipName = "SPUDS-IMS-Deploy.zip")
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Split-Path -Parent $root
$bundle = Join-Path $root ("deploy-bundle-" + [guid]::NewGuid().ToString())
New-Item -ItemType Directory -Path $bundle | Out-Null
$exclude = @('node_modules','dist','.git','coverage')
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
Get-ChildItem -Path $bundle -Recurse -Force -Directory -Filter ".git" | ForEach-Object { Remove-Item -Recurse -Force $_.FullName }
$zipPath = Join-Path $root $ZipName
if(Test-Path $zipPath){ Remove-Item -Force $zipPath }
Start-Sleep -Milliseconds 100
Compress-Archive -Path (Join-Path $bundle "*") -DestinationPath $zipPath -Force
Remove-Item -Recurse -Force $bundle
Write-Host "Deploy ZIP created at $zipPath"
