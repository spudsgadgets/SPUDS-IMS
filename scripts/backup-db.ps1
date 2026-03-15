param(
  [string]$Database = "ims",
  [string]$ArchiveDatabase = "ims_archive",
  [string[]]$Databases = @(),
  [string]$OutDir,
  [string]$DbHost = "127.0.0.1",
  [int]$DbPort = 3307,
  [string]$User = "root",
  [string]$Password = "",
  [switch]$Compress
)
$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Split-Path -Parent $here
if(-not $OutDir){ $OutDir = (Join-Path $root "backups") }
if(-not (Test-Path $OutDir)){ New-Item -ItemType Directory -Path $OutDir | Out-Null }

$dumpCandidates = @()
$dumpCandidates += (Join-Path $root "mariadb\bin\mariadb-dump.exe")
$dumpCandidates += (Join-Path $root "mariadb\bin\mysqldump.exe")
$dumpCandidates += "mariadb-dump.exe"
$dumpCandidates += "mysqldump.exe"
$dumpExe = $null
foreach($c in $dumpCandidates){ if(Test-Path $c){ $dumpExe = $c; break } }
if(-not $dumpExe){ Write-Error "mariadb-dump/mysqldump not found. Ensure mariadb\\bin is present or in PATH."; exit 1 }

$ts = Get-Date -Format "yyyy-MM-dd-HHmm"
$base = "spuds-ims-backup-$ts"
$sqlName = "$base.sql"
$sqlPath = Join-Path $OutDir $sqlName

$dbList = @()
if($Databases -and $Databases.Count -gt 0){
  $dbList = @($Databases | ForEach-Object { "$_".Trim() } | Where-Object { $_ -ne "" })
}else{
  $dbList = @("$Database".Trim(),"$ArchiveDatabase".Trim()) | Where-Object { $_ -ne "" }
}
$seen = @{}
$dbList = @($dbList | Where-Object { if($seen.ContainsKey($_.ToLower())){ $false }else{ $seen[$_.ToLower()]=$true; $true } })
if(-not $dbList -or $dbList.Count -eq 0){ throw "No databases specified." }

$args = @("--host=$DbHost","--port=$DbPort","--user=$User","--single-transaction","--quick","--routines","--events","--default-character-set=utf8mb4","--databases") + $dbList
if($Password -ne ""){ $args = @("--password=$Password") + $args }
try{
  $charsetDir = Join-Path $root "mariadb\share\charsets"
  if(Test-Path $charsetDir){ $args += @("--character-sets-dir=" + ($charsetDir -replace '\\','/')) }
}catch{}

Write-Host ("Backing up database(s) '{0}' from {1}:{2} ..." -f ($dbList -join ", "),$DbHost,$DbPort)
& $dumpExe @args | Out-File -FilePath $sqlPath -Encoding ascii
Write-Host "Backup created: $sqlPath"

if($Compress){
  $zipPath = [System.IO.Path]::ChangeExtension($sqlPath,".zip")
  if(Test-Path $zipPath){ Remove-Item -Force $zipPath }
  Compress-Archive -Path $sqlPath -DestinationPath $zipPath -Force
  Remove-Item -Force $sqlPath
  Write-Host "Compressed to: $zipPath"
}
Write-Host "Done."
