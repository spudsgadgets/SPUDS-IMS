[CmdletBinding()]
param(
  [string]$ZipPath,
  [string]$AppPath = (Resolve-Path (Join-Path $PSScriptRoot '..')),
  [switch]$Latest,
  [string]$Tag
)

$ErrorActionPreference = "Stop"

function Stop-ProcessByNameAndPath {
    param([string]$Name, [string]$PathPrefix)
    $procs = Get-Process -Name $Name -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "$PathPrefix*" }
    if ($procs) {
        Write-Host "Stopping $Name process(es) running from $PathPrefix..."
        $procs | Stop-Process -Force
        Write-Host "Stopped."
    }
}

# 1. Resolve update source (local ZIP or GitHub release)
function Get-OwnerRepo {
  try{
    $root = Split-Path -Parent $PSScriptRoot
    $root = Split-Path -Parent $root
    Set-Location $root
    $repoUrl = (git config --get remote.origin.url) 2>$null
    if($repoUrl -and ($repoUrl -match 'github.com[:/](.+?)/(.+?)(\.git)?$')){
      return @{ owner=$matches[1]; repo=$matches[2] }
    }
  }catch{}
  return $null
}
function Resolve-ReleaseZip([switch]$UseLatest,[string]$UseTag){
  $gh = Get-OwnerRepo
  if(-not $gh){ throw "Cannot resolve GitHub owner/repo from git remote. Provide -ZipPath instead." }
  $owner = $gh.owner; $repo = $gh.repo
  $uri = $null
  if($UseLatest){ $uri = "https://api.github.com/repos/$owner/$repo/releases/latest" }
  elseif($UseTag){ $uri = "https://api.github.com/repos/$owner/$repo/releases/tags/$UseTag" }
  else{ throw "Provide -Latest or -Tag when ZipPath is not set." }
  $headers = @{ "User-Agent" = "spuds-ims-updater" }
  $token = $env:GH_TOKEN
  if(-not $token -and $env:GITHUB_TOKEN){ $token = $env:GITHUB_TOKEN }
  if($token){ $headers["Authorization"] = ("token {0}" -f $token) }
  $rel = Invoke-RestMethod -Method Get -Uri $uri -Headers $headers
  $asset = $rel.assets | Where-Object { $_.name -match '^SPUDS-IMS-Deploy-.*\.zip$' } | Select-Object -First 1
  if(-not $asset){
    $asset = $rel.assets | Where-Object { $_.name -like '*.zip' } | Select-Object -First 1
  }
  if(-not $asset){ throw "No ZIP asset found in release." }
  $tmpZip = Join-Path ([System.IO.Path]::GetTempPath()) ("spuds-update-" + [guid]::NewGuid().ToString() + ".zip")
  Invoke-WebRequest -UseBasicParsing -Uri $asset.browser_download_url -OutFile $tmpZip -TimeoutSec 120
  return $tmpZip
}
if(-not $ZipPath){
  if($Latest){ $ZipPath = Resolve-ReleaseZip -UseLatest }
  elseif($Tag){ $ZipPath = Resolve-ReleaseZip -UseTag $Tag }
  else{ throw "Provide -ZipPath or use -Latest / -Tag to fetch from GitHub." }
}
if (-not (Test-Path -LiteralPath $ZipPath)) {
  throw "Update ZIP not found at: $ZipPath"
}
if (-not (Test-Path -LiteralPath $AppPath)) {
  throw "Application path not found at: $AppPath"
}

Write-Host "Starting update for SPUDS-IMS at: $AppPath"
Write-Host "Using update package: $ZipPath"

# 2. Stop running processes
Write-Host "Stopping SPUDS-IMS application and database..."
Stop-ProcessByNameAndPath -Name "node" -PathPrefix $AppPath

# Stop any running MariaDB instance. This is broad but necessary.
$dbProcesses = Get-Process -Name "mysqld", "mariadbd" -ErrorAction SilentlyContinue
if ($dbProcesses) {
  Write-Host "Stopping database process(es)..."
  $dbProcesses | Stop-Process -Force
  Write-Host "Stopped."
}

Write-Host "Waiting for processes to terminate..."
Start-Sleep -Seconds 3

$backupRoot = Join-Path $AppPath "backups"
if(-not (Test-Path $backupRoot)){ New-Item -ItemType Directory -Path $backupRoot | Out-Null }
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$zipBackup = Join-Path $backupRoot ("app-" + $stamp + ".zip")
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::Open($zipBackup,[System.IO.Compression.ZipArchiveMode]::Create)
try{
  $src = (Resolve-Path -LiteralPath $AppPath).Path
  $files = Get-ChildItem -LiteralPath $src -Recurse -File -Force
  foreach($f in $files){
    $full = $f.FullName
    $rel = $full.Substring($src.Length).TrimStart('\','/')
    $rel = $rel -replace '\\','/'
    if([string]::IsNullOrWhiteSpace($rel)){ continue }
    if($rel -like "logs/*"){ continue }
    if($rel -like "backups/*"){ continue }
    if($rel -like "releases/*"){ continue }
    if($rel -like "mariadb/data/*"){ continue }
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
    if(-not $inStream){ continue }
    $outStream = $null
    try{
      $outStream = $entry.Open()
      $inStream.CopyTo($outStream)
    }finally{
      if($outStream){ $outStream.Dispose() }
      $inStream.Dispose()
    }
  }
  $pkgVer = "unknown"
  try{
    $pkgPath = Join-Path $AppPath "package.json"
    if(Test-Path $pkgPath){ $pkgVer = (Get-Content -Raw -LiteralPath $pkgPath | ConvertFrom-Json).version }
  }catch{}
  $sha = "nogit"
  try{
    $sha = (git rev-parse --short HEAD).Trim()
    if(-not $sha){ $sha = "nogit" }
  }catch{}
  $meta = [pscustomobject]@{
    name = "SPUDS-IMS"
    createdAt = (Get-Date).ToString("s")
    version = $pkgVer
    commit = $sha
    excludes = @("logs/*","backups/*","releases/*","mariadb/data/*")
  }
  $metaEntry = $zip.CreateEntry("backup-info.json",[System.IO.Compression.CompressionLevel]::Optimal)
  $metaStr = $meta | ConvertTo-Json -Depth 5
  $outStream = $metaEntry.Open()
  try{
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($metaStr)
    $outStream.Write($bytes,0,$bytes.Length)
  }finally{
    $outStream.Dispose()
  }
}finally{
  if($zip){ $zip.Dispose() }
}

try{
  $existing = Get-ChildItem -LiteralPath $backupRoot -File -Filter "app-*.zip" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending
  if($existing -and $existing.Count -gt 5){
    $toDelete = $existing | Select-Object -Skip 5
    foreach($b in $toDelete){
      try{ Remove-Item -Force -LiteralPath $b.FullName }catch{}
    }
  }
}catch{}

# 3. Clear old application files
Write-Host "Clearing old application files from $AppPath..."
# Exclude folders that might contain user data or other important artifacts
$itemsToDelete = Get-ChildItem -Path $AppPath -Force -Exclude "logs", "backups", "releases"
foreach ($item in $itemsToDelete) {
    Remove-Item -Recurse -Force -LiteralPath $item.FullName
}
Write-Host "Old application files cleared."

# 4. Extract new version
Write-Host "Extracting new version from $ZipPath..."
Expand-Archive -LiteralPath $ZipPath -DestinationPath $AppPath -Force
Write-Host "Update extracted successfully."

# 5. Restart application
$startScript = Join-Path $AppPath "scripts\start-all.ps1"
if (-not (Test-Path $startScript)) {
    throw "start-all.ps1 not found in the new version. Cannot restart application."
}

Write-Host "Starting the new version of SPUDS-IMS..."
Start-Process -FilePath "powershell" -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$startScript`"" -WorkingDirectory $AppPath

Write-Host "----------------------------------------------------"
Write-Host " SPUDS-IMS update complete and application started. "
Write-Host "----------------------------------------------------"
