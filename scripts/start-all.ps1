param([string]$Port = "3307")
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Split-Path -Parent $root
$dbScript = Join-Path $root "scripts\start-db.ps1"
if(-not (Test-Path $dbScript)){ Write-Error "start-db.ps1 not found at $dbScript"; exit 1 }
Write-Host "Starting MariaDB..."
Start-Process -FilePath "powershell" -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$dbScript`" -Port $Port" -WorkingDirectory $root
function Test-PortReady($h,$p){
  try{
    $client = New-Object System.Net.Sockets.TcpClient
    $async = $client.BeginConnect($h,$p,$null,$null)
    $done = $async.AsyncWaitHandle.WaitOne(200)
    if($done -and $client.Connected){$client.Close();return $true}
    $client.Close();return $false
  }catch{return $false}
}
for($i=0;$i -lt 50;$i++){
  if(Test-PortReady "127.0.0.1" ([int]$Port)){ break }
  Start-Sleep -Milliseconds 200
}
Write-Host "Starting Node app..."
Start-Process -FilePath "powershell" -ArgumentList "-NoProfile -ExecutionPolicy Bypass -Command `$env:MYSQL_PORT='$Port'; node server.js" -WorkingDirectory $root
Write-Host "Started DB and app. DB port=$Port"
