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
$rootLocalRoot = Join-Path $root "local-mariadb"
$rootMyIni = Join-Path $rootLocalRoot "my.ini"
$rootDataDir = Join-Path $rootLocalRoot "data"
$localAppRoot = Join-Path $env:LOCALAPPDATA "SPUDS-IMS"
$localLocalRoot = Join-Path $localAppRoot "local-mariadb"
$localMyIni = Join-Path $localLocalRoot "my.ini"
$localDataDir = Join-Path $localLocalRoot "data"
$rootIsReparse = $false
try{
  $ri = Get-Item -LiteralPath $root -ErrorAction SilentlyContinue
  if($ri -and ($ri.Attributes -band [IO.FileAttributes]::ReparsePoint)){ $rootIsReparse = $true }
}catch{}
$overrideDataDir = $env:IMS_MARIADB_DATA_DIR
if([string]::IsNullOrWhiteSpace($overrideDataDir)){ $overrideDataDir = $env:IMS_DB_DATA_DIR }
$overrideProvided = -not [string]::IsNullOrWhiteSpace($overrideDataDir)
$dataDir = $null
$myIni = $null
if($overrideProvided){
  $dataDir = $overrideDataDir
  $myIni = ($(if($rootIsReparse){ $localMyIni }else{ $rootMyIni }))
}else{
  if(Test-Path (Join-Path $rootDataDir "mysql")){
    $dataDir = $rootDataDir
    $myIni = $rootMyIni
  }elseif($rootIsReparse){
    $dataDir = $localDataDir
    $myIni = $localMyIni
  }else{
    $dataDir = $rootDataDir
    $myIni = $rootMyIni
  }
}
if(-not $overrideProvided){
  try{
    $di = Get-Item -LiteralPath $dataDir -ErrorAction SilentlyContinue
    if($di -and ($di.Attributes -band [IO.FileAttributes]::ReparsePoint)){
      $dataDir = $localDataDir
      $myIni = $localMyIni
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
Write-Host "Starting MariaDB from $mysqld with $myIni on port $Port"
& $mysqld "--defaults-file=$myIni" "--basedir=$mariaRoot" "--datadir=$dataDir" "--port=$Port" "--bind-address=127.0.0.1" "--tmpdir=$tmpDir" "--console"
$code = $LASTEXITCODE
if($code -and $code -ne 0){
  Write-Host ("MariaDB process exited with code {0}" -f $code)
}
exit 0
