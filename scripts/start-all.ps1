param(
  [string]$DbPort = "3307",
  [string]$ApiPort = "3200",
  [switch]$AllowDB,
  [bool]$OpenBrowser = $true
)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Split-Path -Parent $root
$dbScript = Join-Path $root "scripts\start-db.ps1"
if(-not (Test-Path $dbScript)){ Write-Error "start-db.ps1 not found at $dbScript"; exit 1 }
Write-Host "Starting MariaDB on port $DbPort..."
Start-Process -FilePath "powershell" -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$dbScript`" -Port $DbPort" -WorkingDirectory $root
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
  if(Test-PortReady "127.0.0.1" ([int]$DbPort)){ break }
  Start-Sleep -Milliseconds 200
}
function Ensure-FirewallRule($name,$port){
  try{
    $exists = (netsh advfirewall firewall show rule name="$name" | Select-String -Pattern "Rule Name") -ne $null
    if(-not $exists){
      netsh advfirewall firewall add rule name="$name" dir=in action=allow protocol=TCP localport=$port | Out-Null
      Write-Host "Opened Windows Firewall for TCP $port ($name)"
    }
  }catch{
    Write-Warning "Could not add firewall rule for port $port: $_"
  }
}
Ensure-FirewallRule -name "SPUDS IMS API $ApiPort" -port $ApiPort
if($AllowDB){ Ensure-FirewallRule -name "SPUDS IMS DB $DbPort" -port $DbPort }
Write-Host "Starting Node app on port $ApiPort (listening on all interfaces)..."
Start-Process -FilePath "powershell" -ArgumentList "-NoProfile -ExecutionPolicy Bypass -Command `$env:MYSQL_PORT='$DbPort'; `$env:PORT='$ApiPort'; node server.js" -WorkingDirectory $root
try{
  $ips = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -ne '127.0.0.1' -and -not $_.IPAddress.StartsWith('169.254.') } | Select-Object -ExpandProperty IPAddress -ErrorAction SilentlyContinue
  if($ips){
    Write-Host "Accessible URLs:"
    foreach($ip in $ips){ Write-Host ("  http://{0}:{1}/" -f $ip,$ApiPort) }
  }else{
    Write-Host ("Accessible at http://localhost:{0}/ (detected no external IPv4)" -f $ApiPort)
  }
}catch{
  Write-Host ("Accessible at http://localhost:{0}/" -f $ApiPort)
}
function Test-HttpHealth($url){
  try{
    $r = Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 -Uri ($url.TrimEnd('/')+'/api/health') -ErrorAction Stop
    return $r.StatusCode -eq 200
  }catch{ return $false }
}
if($OpenBrowser){
  $base = "http://localhost:$ApiPort/"
  for($i=0;$i -lt 40;$i++){
    if(Test-HttpHealth $base){ break }
    Start-Sleep -Milliseconds 250
  }
  try{
    Start-Process $base | Out-Null
    Write-Host "Opened browser at $base"
  }catch{
    Write-Warning "Could not open browser automatically: $_"
  }
}
Write-Host "Started DB and app. DB port=$DbPort, API port=$ApiPort"
