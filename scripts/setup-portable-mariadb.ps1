param(
  [string]$Version = "10.11.8",
  [int]$Port = 3307
)
$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Split-Path -Parent $here
$mariaRoot = Join-Path $root "mariadb"
$binDir = Join-Path $mariaRoot "bin"
$dlDir = Join-Path $mariaRoot "downloads"
if(-not (Test-Path $mariaRoot)){ New-Item -ItemType Directory -Path $mariaRoot | Out-Null }
if(-not (Test-Path $dlDir)){ New-Item -ItemType Directory -Path $dlDir | Out-Null }
$zipName = "mariadb-$Version-winx64.zip"
$zipPath = Join-Path $dlDir $zipName
$urls = @(
  "https://downloads.mariadb.org/f/mariadb-$Version/winx64-packages/mariadb-$Version-winx64.zip?serve=1",
  "https://archive.mariadb.org/mariadb-$Version/winx64-packages/mariadb-$Version-winx64.zip"
)
foreach($u in $urls){
  Write-Host "Attempting download: $u"
  try{
    Invoke-WebRequest -Uri $u -OutFile $zipPath
    if((Get-Item $zipPath).Length -gt 1000000){ break }
  }catch{
    Write-Warning "Download failed: $($_.Exception.Message)"
  }
}
if(-not (Test-Path $zipPath) -or ((Get-Item $zipPath).Length -lt 1000000)){
  throw "Unable to download MariaDB ZIP; please check internet connectivity or try a different version."
}
Write-Host "Extracting $zipPath into $mariaRoot ..."
Expand-Archive -Path $zipPath -DestinationPath $mariaRoot -Force
# Attempt to detect extracted folder
$extracted = Get-ChildItem -Path $mariaRoot -Directory | Where-Object { $_.Name -like "mariadb-*-winx64" } | Select-Object -First 1
if(-not $extracted){ $extracted = Get-ChildItem -Path $mariaRoot -Directory | Where-Object { $_.Name -like "mariadb-*" } | Select-Object -First 1 }
if(-not $extracted){ throw "Extracted MariaDB folder not found under $mariaRoot" }
$exBin = Join-Path $extracted.FullName "bin"
Write-Host "Copying binaries from $exBin to $binDir ..."
if(-not (Test-Path $binDir)){ New-Item -ItemType Directory -Path $binDir | Out-Null }
Copy-Item "$exBin\*" $binDir -Recurse -Force
# Ensure mariadb-install-db.exe exists (fallback to mysql_install_db.exe)
$mariadbInstall = Join-Path $binDir "mariadb-install-db.exe"
$mysqlInstall = Join-Path $binDir "mysql_install_db.exe"
if(-not (Test-Path $mariadbInstall) -and (Test-Path $mysqlInstall)){
  Copy-Item $mysqlInstall $mariadbInstall -Force
}
Write-Host "Starting portable MariaDB on port $Port ..."
Start-Process -FilePath "powershell" -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$((Join-Path $root 'scripts\start-db.ps1'))`" -Port $Port" -WorkingDirectory $root
function Test-Port($h,$p){
  try{
    $client = New-Object System.Net.Sockets.TcpClient
    $async = $client.BeginConnect($h,$p,$null,$null)
    $done = $async.AsyncWaitHandle.WaitOne(2000)
    if($done -and $client.Connected){$client.Close();return $true}
    $client.Close();return $false
  }catch{return $false}
}
for($i=0;$i -lt 20;$i++){
  if(Test-Port "127.0.0.1" $Port){ Write-Host "MariaDB is up on port $Port"; break }
  Start-Sleep -Milliseconds 500
}
Write-Host "Setup complete."
