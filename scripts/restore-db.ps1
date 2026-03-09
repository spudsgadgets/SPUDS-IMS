param(
  [Parameter(Mandatory=$true)][string]$Path,
  [string]$Database = "ims",
  [string]$DbHost = "127.0.0.1",
  [int]$DbPort = 3307,
  [string]$User = "root",
  [string]$Password = "",
  [switch]$ForceClean
)
$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Split-Path -Parent $here
if(-not (Test-Path $Path)){ Write-Error "File not found: $Path"; exit 1 }
$full = (Resolve-Path -LiteralPath $Path).Path
$ext = [System.IO.Path]::GetExtension($full).ToLower()

$mysqlCandidates = @()
$mysqlCandidates += (Join-Path $root "mariadb\bin\mariadb.exe")
$mysqlCandidates += (Join-Path $root "mariadb\bin\mysql.exe")
$mysqlCandidates += "mariadb.exe"
$mysqlCandidates += "mysql.exe"
$mysqlExe = $null
foreach($c in $mysqlCandidates){ if(Test-Path $c){ $mysqlExe = $c; break } }
if(-not $mysqlExe){ Write-Error "mysql/mariadb client not found. Ensure mariadb\\bin is present or in PATH."; exit 1 }

$workSql = $null
$tempDir = $null
try{
  if($ext -eq ".zip"){
    $tempDir = Join-Path ([System.IO.Path]::GetTempPath()) ("spuds-restore-" + [guid]::NewGuid().ToString())
    New-Item -ItemType Directory -Path $tempDir | Out-Null
    Expand-Archive -Path $full -DestinationPath $tempDir -Force
    $cand = Get-ChildItem -Path $tempDir -Recurse -Filter *.sql | Select-Object -First 1
    if(-not $cand){ throw "No .sql file found inside ZIP." }
    $workSql = $cand.FullName
  }elseif($ext -eq ".sql"){
    $workSql = $full
  }else{
    throw "Unsupported file extension: $ext (expected .sql or .zip)"
  }

  $pwdArg = $null
  if($Password -ne ""){ $pwdArg = "--password=$Password" }
  $baseArgs = @("--host=$DbHost","--port=$DbPort","--user=$User")
  if($pwdArg){ $baseArgs = @($pwdArg) + $baseArgs }

  if($ForceClean){
    & $mysqlExe @($baseArgs + @("--execute=DROP DATABASE IF EXISTS `$Database`; CREATE DATABASE `$Database` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")) | Out-Null
    Write-Host "Dropped and recreated database '$Database'."
  }else{
    & $mysqlExe @($baseArgs + @("--execute=CREATE DATABASE IF NOT EXISTS `$Database` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")) | Out-Null
  }

  $src = $workSql.Replace('\','/')
  Write-Host "Restoring from $workSql ..."
  & $mysqlExe @($baseArgs + @("--execute=source `"$src`"")) | Out-Null
  Write-Host "Restore completed."
}finally{
  if($tempDir -and (Test-Path $tempDir)){ Remove-Item -Recurse -Force $tempDir }
}
