param(
  [Parameter(Mandatory=$true)][string]$Path,
  [string]$Database = "ims",
  [string]$ArchiveDatabase = "ims_archive",
  [string[]]$Databases = @(),
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

  $dbList = @()
  if($Databases -and $Databases.Count -gt 0){
    $dbList = @($Databases | ForEach-Object { "$_".Trim() } | Where-Object { $_ -ne "" })
  }else{
    $dbList = @("$Database".Trim(),"$ArchiveDatabase".Trim()) | Where-Object { $_ -ne "" }
  }
  $seen = @{}
  $dbList = @($dbList | Where-Object { if($seen.ContainsKey($_.ToLower())){ $false }else{ $seen[$_.ToLower()]=$true; $true } })
  if(-not $dbList -or $dbList.Count -eq 0){ throw "No databases specified." }

  if($ForceClean){
    foreach($db in $dbList){
      $sql = "DROP DATABASE IF EXISTS ``$db``; CREATE DATABASE ``$db`` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
      & $mysqlExe @($baseArgs + @("--execute=$sql")) | Out-Null
    }
    Write-Host ("Dropped and recreated database(s): {0}" -f ($dbList -join ", "))
  }else{
    foreach($db in $dbList){
      $sql = "CREATE DATABASE IF NOT EXISTS ``$db`` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
      & $mysqlExe @($baseArgs + @("--execute=$sql")) | Out-Null
    }
  }

  $src = $workSql.Replace('\','/')
  Write-Host "Restoring from $workSql ..."
  & $mysqlExe @($baseArgs + @("--execute=source `"$src`"")) | Out-Null
  Write-Host "Restore completed."
}finally{
  if($tempDir -and (Test-Path $tempDir)){ Remove-Item -Recurse -Force $tempDir }
}
