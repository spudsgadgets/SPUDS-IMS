param(
  [string]$Port = "3307"
)
$ErrorActionPreference = "Stop"
try{
  $names = @("mysqld","mariadbd")
  $procs = @()
  foreach($n in $names){
    $p = Get-Process -Name $n -ErrorAction SilentlyContinue
    if($p){ $procs += $p }
  }
  if(-not $procs -or $procs.Count -eq 0){ Write-Host "No MariaDB/mysqld process found."; exit 0 }
  $procs | Stop-Process -Force
  Write-Host "Stopped MariaDB/mysqld processes."
}catch{
  Write-Warning "Failed to stop MariaDB/mysqld: $_"
}
