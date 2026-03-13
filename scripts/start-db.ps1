param([string]$Port = "3307")
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Split-Path -Parent $root
$mariaRoot = Join-Path $root "mariadb"
$myIni = Join-Path $root "local-mariadb\my.ini"
$dataDir = Join-Path $root "local-mariadb\data"
$mysqldCandidates = @()
$mysqldCandidates += (Join-Path -Path $root -ChildPath "mariadb\bin\mariadbd.exe")
$mysqldCandidates += (Join-Path -Path $root -ChildPath "mariadb\bin\mysqld.exe")
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
if(-not (Test-Path $dataDir)){ New-Item -ItemType Directory -Path $dataDir | Out-Null }
$needsInit = -not (Test-Path (Join-Path $dataDir "mysql"))
if($needsInit){
  $installer = $null
  foreach($c in $installCandidates){ if(Test-Path $c){ $installer = $c; break } }
  if(-not $installer){ Write-Error "mariadb-install-db.exe not found for initialization."; exit 1 }
  Write-Host "Initializing MariaDB data dir at $dataDir using $installer"
  $initArgs = @("--datadir=$dataDir")
  if(Test-Path $myIni){ $initArgs += @("--config=$myIni") }
  & $installer @initArgs
}
Write-Host "Starting MariaDB from $mysqld with $myIni on port $Port"
& $mysqld "--defaults-file=$myIni" "--basedir=$mariaRoot" "--datadir=$dataDir" "--port=$Port" "--bind-address=127.0.0.1" "--console"
