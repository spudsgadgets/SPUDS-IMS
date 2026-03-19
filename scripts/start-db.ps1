param([string]$Port = "3307")
$ErrorActionPreference = "Stop"
function Test-PortReady($h,$p){
  try{
    $client = New-Object System.Net.Sockets.TcpClient
    $async = $client.BeginConnect($h,$p,$null,$null)
    $done = $async.AsyncWaitHandle.WaitOne(200)
    if($done -and $client.Connected){$client.Close();return $true}
    $client.Close();return $false
  }catch{return $false}
}
if(Test-PortReady "127.0.0.1" ([int]$Port)){
  Write-Host "MariaDB already running on port $Port."
  exit 0
}
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Split-Path -Parent $root
$mariaRoot = Join-Path $root "mariadb"
# Get the root directory for SPUDS-IMS data in the user's Local AppData folder.
function Get-SpudsAppDataDir {
  $p = Join-Path $env:LOCALAPPDATA "SPUDS-IMS"
  if (-not (Test-Path $p)) {
    New-Item -ItemType Directory -Path $p -Force | Out-Null
  }
  return $p
}

# Enforce using a persistent data directory outside the application folder.
$spudsAppData = Get-SpudsAppDataDir
$dataDir = Join-Path $spudsAppData "data"
$myIni = Join-Path $spudsAppData "my.ini"

# Allow overriding the data directory via environment variable for advanced use cases.
$overrideDataDir = $env:IMS_MARIADB_DATA_DIR
if([string]::IsNullOrWhiteSpace($overrideDataDir)){ $overrideDataDir = $env:IMS_DB_DATA_DIR }
if (-not [string]::IsNullOrWhiteSpace($overrideDataDir)) {
  Write-Host "Using override data directory: $overrideDataDir"
  $dataDir = $overrideDataDir
  # When overriding data dir, we assume my.ini might be in a different spot or not used.
  # For simplicity, we'll place it next to the data dir.
  $myIni = Join-Path (Split-Path -Parent $dataDir) "my.ini"
}
$oldDataDir = Join-Path (Join-Path $root "local-mariadb") "data"
$oldHasData = Test-Path (Join-Path $oldDataDir "mysql")
$newHasData = Test-Path (Join-Path $dataDir "mysql")
if($oldHasData -and -not $newHasData){
  try{
    $dataParent = Split-Path -Parent $dataDir
    if($dataParent -and -not (Test-Path $dataParent)){ New-Item -ItemType Directory -Path $dataParent -Force | Out-Null }
    try{
      Move-Item -Force -LiteralPath $oldDataDir -Destination $dataParent -ErrorAction Stop
    }catch{
      Copy-Item -Recurse -Force -LiteralPath $oldDataDir -Destination $dataParent
    }
  }catch{}
}
$mysqldCandidates = @()
$mysqldCandidates += (Join-Path -Path $root -ChildPath "mariadb\bin\mysqld.exe")
$mysqldCandidates += (Join-Path -Path $root -ChildPath "mariadb\bin\mariadbd.exe")
$mysqldCandidates += "mariadbd.exe"
$mysqldCandidates += "mysqld.exe"

$installCandidates = @()
$installCandidates += (Join-Path -Path $root -ChildPath "mariadb\bin\mariadb-install-db.exe")
$installCandidates += (Join-Path -Path $root -ChildPath "mariadb\bin\mysql_install_db.exe")
$installCandidates += "mariadb-install-db.exe"
$installCandidates += "mysql_install_db.exe"
$mysqld = $null
foreach($c in $mysqldCandidates){ if(Test-Path $c){ $mysqld = $c; break } }
if(-not $mysqld){ Write-Error "mysqld.exe not found. Place binaries under .\\mariadb\\bin or add to PATH."; exit 1 }
try{
  $iniDir = Split-Path -Parent $myIni
  if($iniDir -and -not (Test-Path $iniDir)){ New-Item -ItemType Directory -Path $iniDir -Force | Out-Null }
}catch{}
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
$needsInit = -not (Test-Path (Join-Path $dataDir "mysql"))
if($needsInit){
  $initArgs = @("--datadir=$dataDir")
  if(Test-Path $myIni){ $initArgs += @("--config=$myIni") }
  $initialized = $false
  $lastErr = $null
  foreach($c in $installCandidates){
    if(-not (Test-Path $c)){ continue }
    Write-Host "Initializing MariaDB data dir at $dataDir using $c"
    try{
      & $c @initArgs
      $initialized = $true
      break
    }catch{
      $lastErr = $_
    }
  }
  if(-not $initialized){
    if($lastErr){ Write-Error ("MariaDB init failed: {0}" -f $lastErr) }else{ Write-Error "MariaDB init failed." }
    exit 1
  }
}
$tmpDir = [System.IO.Path]::GetTempPath()
$logDir = Join-Path $root "logs"
try{ if(-not (Test-Path $logDir)){ New-Item -ItemType Directory -Path $logDir -Force | Out-Null } }catch{}
$errLog = Join-Path $logDir ("mariadb-{0}.err.log" -f $Port)
Write-Host "Starting MariaDB from $mysqld with $myIni on port $Port"
& $mysqld "--defaults-file=$myIni" "--basedir=$mariaRoot" "--datadir=$dataDir" "--port=$Port" "--bind-address=127.0.0.1" "--tmpdir=$tmpDir" "--log-error=$errLog" "--console"
$code = $LASTEXITCODE
if($code -and $code -ne 0){
  Write-Host ("MariaDB process exited with code {0}" -f $code)
}
exit 0
