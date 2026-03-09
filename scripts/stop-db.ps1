param(
  [string]$Port = "3307"
)
$ErrorActionPreference = "Stop"
try{
  $procs = Get-Process -Name "mysqld" -ErrorAction SilentlyContinue
  if(-not $procs){Write-Host "No mysqld process found.";exit 0}
  $procs | Stop-Process -Force
  Write-Host "Stopped mysqld processes."
}catch{
  Write-Warning "Failed to stop mysqld: $_"
}

