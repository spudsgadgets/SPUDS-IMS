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
Add-Type -AssemblyName System.IO.Compression.FileSystem
$za = $null
try{
  $za = [System.IO.Compression.ZipFile]::OpenRead($zipPath)
  $first = $za.Entries | Where-Object { $_.FullName -like "*/*" } | Select-Object -First 1
  $prefix = if($first){ ($first.FullName.Split('/')[0] + '/') }else{ $null }
  foreach($e in $za.Entries){
    $rel = $e.FullName
    if($prefix -and $rel.StartsWith($prefix,[System.StringComparison]::OrdinalIgnoreCase)){ $rel = $rel.Substring($prefix.Length) }
    if([string]::IsNullOrWhiteSpace($rel)){ continue }
    $relWin = $rel -replace '/', '\'
    $dest = Join-Path $mariaRoot $relWin
    if($e.FullName.EndsWith('/')){
      if(-not (Test-Path $dest)){ New-Item -ItemType Directory -Path $dest -Force | Out-Null }
      continue
    }
    $dir = Split-Path -Parent $dest
    if($dir -and -not (Test-Path $dir)){ New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    try{
      [System.IO.Compression.ZipFileExtensions]::ExtractToFile($e,$dest,$true)
    }catch{}
  }
}finally{
  if($za){ $za.Dispose() }
}
if(-not (Test-Path $binDir)){ throw "Extract failed: $binDir not found after extraction." }
# Ensure mariadb-install-db.exe exists (fallback to mysql_install_db.exe)
$mariadbInstall = Join-Path $binDir "mariadb-install-db.exe"
$mysqlInstall = Join-Path $binDir "mysql_install_db.exe"
if(-not (Test-Path $mariadbInstall) -and (Test-Path $mysqlInstall)){
  Copy-Item $mysqlInstall $mariadbInstall -Force
}
$clientExe = Join-Path $binDir "mariadb.exe"
if(-not (Test-Path $clientExe)){ $clientExe = Join-Path $binDir "mysql.exe" }
if(-not (Test-Path $clientExe)){ throw "Extract failed: mariadb.exe/mysql.exe not found under $binDir." }
$mysqldExe = Join-Path $binDir "mariadbd.exe"
if(-not (Test-Path $mysqldExe)){ $mysqldExe = Join-Path $binDir "mysqld.exe" }
if(-not (Test-Path $mysqldExe)){ throw "Extract failed: mariadbd.exe/mysqld.exe not found under $binDir." }

$localRoot = Join-Path $root "local-mariadb"
$myIni = Join-Path $localRoot "my.ini"
$dataDir = Join-Path $localRoot "data"
if(-not (Test-Path $localRoot)){ New-Item -ItemType Directory -Path $localRoot | Out-Null }
if(-not (Test-Path $dataDir)){ New-Item -ItemType Directory -Path $dataDir | Out-Null }
if(-not (Test-Path $myIni)){
  $base = ($mariaRoot -replace '\\','/')
  $data = ($dataDir -replace '\\','/')
  $tmp = ([System.IO.Path]::GetTempPath() -replace '\\','/')
  @"
[mysqld]
basedir=$base
datadir=$data
tmpdir=$tmp
bind-address=127.0.0.1
character-set-server=utf8mb4
collation-server=utf8mb4_unicode_ci
skip-name-resolve
max_allowed_packet=64M
sql_mode=

[client]
port=$Port
"@ | Set-Content -Path $myIni -Encoding ascii
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
