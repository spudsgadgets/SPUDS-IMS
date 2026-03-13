param(
  [string]$DbPort = "3307",
  [string]$ApiPort = "3200",
  [switch]$AllowDB,
  [object]$OpenBrowser = $true,
  [string]$AdminPassword = "admin123",
  [switch]$Debug
)
$ErrorActionPreference = "Stop"
$shouldOpenBrowser = $true
function ConvertTo-Bool([object]$v,[bool]$default=$true){
  if($null -eq $v){ return $default }
  if($v -is [bool]){ return $v }
  if($v -is [switch]){ return [bool]$v.IsPresent }
  $s = [string]$v
  if([string]::IsNullOrWhiteSpace($s)){ return $default }
  $t = $s.Trim().ToLowerInvariant()
  if($t -in @('1','true','t','yes','y','on','$true')){ return $true }
  if($t -in @('0','false','f','no','n','off','$false')){ return $false }
  return $default
}
try{ $shouldOpenBrowser = ConvertTo-Bool $OpenBrowser $true }catch{ $shouldOpenBrowser = $true }
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Split-Path -Parent $root
$logDir = Join-Path $root "logs"
if(-not (Test-Path $logDir)){ New-Item -ItemType Directory -Path $logDir | Out-Null }
$dbScript = Join-Path $root "scripts\start-db.ps1"
if(-not (Test-Path $dbScript)){ Write-Error "start-db.ps1 not found at $dbScript"; exit 1 }
$mysqldLocal1 = Join-Path $root "mariadb\bin\mysqld.exe"
$mysqldLocal2 = Join-Path $root "mariadb\bin\mariadbd.exe"
if((-not (Test-Path $mysqldLocal1)) -and (-not (Test-Path $mysqldLocal2))){
  $setupMaria = Join-Path $root "scripts\setup-portable-mariadb.ps1"
  if(Test-Path $setupMaria){
    Write-Host "MariaDB binaries not found under .\\mariadb\\bin; setting up portable MariaDB..."
    try{
      & $setupMaria -Port ([int]$DbPort) -NoStart
    }catch{
      Write-Warning ("Portable MariaDB setup failed: {0}" -f $_)
    }
  }
}
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
      netsh advfirewall firewall add rule name="$name" dir=in action=allow protocol=TCP localport=$port profile=any enable=yes | Out-Null
      Write-Host "Opened Windows Firewall for TCP $port ($name)"
    }
  }catch{
    Write-Warning ("Could not add firewall rule for port {0}: {1}" -f $port, $_)
  }
}
function Test-IsAdmin(){
  try{
    $id=[Security.Principal.WindowsIdentity]::GetCurrent()
    $p=New-Object Security.Principal.WindowsPrincipal($id)
    return $p.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
  }catch{ return $false }
}
Ensure-FirewallRule -name "SPUDS IMS API $ApiPort" -port $ApiPort
if($AllowDB){ Ensure-FirewallRule -name "SPUDS IMS DB $DbPort" -port $DbPort }
if(-not (Test-IsAdmin)){
  Write-Warning "Firewall rules may not be added without Administrator rights. If remote access fails, run Start-IMS.cmd as Administrator."
}
function Ensure-AutoBackupTasks($rootPath,[string]$dbPort){
  try{
    $taskName = "SPUDS IMS Auto Backup"
    $script = Join-Path $rootPath "scripts\backup-db.ps1"
    if(-not (Test-Path $script)){ return }
    $outDir = Join-Path $rootPath "backups"
    $userId = [Security.Principal.WindowsIdentity]::GetCurrent().Name
    $args = "-NoProfile -ExecutionPolicy Bypass -File `"$script`" -OutDir `"$outDir`" -DbPort $dbPort -Compress"
    $action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument $args -WorkingDirectory $rootPath
    $t1 = New-ScheduledTaskTrigger -Daily -At 12:00
    $t2 = New-ScheduledTaskTrigger -Daily -At 18:00
    $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
    $principal = New-ScheduledTaskPrincipal -UserId $userId -LogonType Interactive -RunLevel Limited
    $task = New-ScheduledTask -Action $action -Trigger @($t1,$t2) -Settings $settings -Principal $principal
    try{
      $existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
      if($existing){ Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue | Out-Null }
    }catch{}
    Register-ScheduledTask -TaskName $taskName -InputObject $task -Force | Out-Null
    Write-Host ("Auto backup scheduled: {0} (12:00 and 18:00 daily) -> {1}" -f $taskName,$outDir)
  }catch{
    Write-Warning ("Could not set auto backup schedule: {0}" -f $_)
  }
}
Ensure-AutoBackupTasks $root $DbPort
function Stop-RunningNode($rootPath){
  try{
    $esc = [regex]::Escape($rootPath)
    $nodes = Get-CimInstance Win32_Process -Filter "name='node.exe'" | Where-Object { $_.CommandLine -match 'server\.js' -and $_.CommandLine -match $esc }
    if($nodes){
      foreach($n in $nodes){
        try{ Stop-Process -Id $n.ProcessId -Force -ErrorAction SilentlyContinue }catch{}
      }
    }
  }catch{}
}
Stop-RunningNode $root
Write-Host "Starting Node app on port $ApiPort (listening on all interfaces)..."
try{
  $localNode = Join-Path $root "node\node.exe"
  $nodeCall = $null
  $nodePathActual = $null
  $nodeVer = ""
  if(Test-Path $localNode){ $nodeCall = ('"{0}"' -f $localNode) }
  else{
    $nodeCmd = Get-Command -Name node -ErrorAction SilentlyContinue
    if($nodeCmd){
      $verRaw = ""
      try{ $verRaw = (& node -v) }catch{}
      $major = 0
      if($verRaw -match 'v(\d+)\.'){
        $major = [int]$matches[1]
      }
      if($major -ge 18){ $nodeCall = "node" }
      else{
        Write-Warning ("PATH Node version too old or unknown ('{0}') - will use bundled runtime if available." -f $verRaw)
      }
      $nodeVer = $verRaw
      try{ $nodePathActual = $nodeCmd.Source }catch{}
    }
  }
  if(-not $nodeCall){
    $setupCmd = Join-Path $root "Setup-Portable-Node.cmd"
    if(Test-Path $setupCmd){
      Start-Process -FilePath $setupCmd -WorkingDirectory $root -Wait
      if(Test-Path $localNode){ $nodeCall = ('"{0}"' -f $localNode) }
      $nodePathActual = $localNode
    }
  }
  if(-not $nodeCall){ Write-Error "Node.js runtime not found. Install Node or place node\\node.exe in the IMS folder."; exit 1 }
  if(-not $nodePathActual){
    if($nodeCall -eq "node"){
      try{ $nodePathActual = (Get-Command -Name node -ErrorAction SilentlyContinue).Source }catch{}
    }else{
      $nodePathActual = $localNode
    }
  }
  if($nodePathActual){ Write-Host ("Using Node runtime: {0} {1}" -f $nodePathActual,$nodeVer) }
  if([string]::IsNullOrWhiteSpace($env:IMS_ADMIN_PASSWORD) -and [string]::IsNullOrWhiteSpace($env:IMS_PASSWORD) -and -not [string]::IsNullOrWhiteSpace($AdminPassword)){
    $env:IMS_ADMIN_PASSWORD = $AdminPassword
  }
  if($Debug){
    $env:MYSQL_PORT=$DbPort
    $env:PORT=$ApiPort
    & $nodePathActual (Join-Path $root "server.js")
  }else{
    $env:MYSQL_PORT=$DbPort
    $env:PORT=$ApiPort
    $outLog = Join-Path $logDir "node-out.log"
    $errLog = Join-Path $logDir "node-err.log"
    try{ Remove-Item -Force $outLog,$errLog -ErrorAction SilentlyContinue }catch{}
    $srv = Join-Path $root "server.js"
    Start-Process -FilePath $nodePathActual -ArgumentList @("`"$srv`"") -WorkingDirectory $root -RedirectStandardOutput $outLog -RedirectStandardError $errLog
  }
}catch{ Write-Error ("Node start failed: {0}" -f $_); exit 1 }
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
if($shouldOpenBrowser){
  $base = "http://localhost:$ApiPort/"
  $ok = $false
  for($i=0;$i -lt 40;$i++){
    if(Test-HttpHealth $base){ $ok = $true; break }
    Start-Sleep -Milliseconds 250
  }
  if($ok){
    try{
      Start-Process $base | Out-Null
      Write-Host "Opened browser at $base"
    }catch{
      Write-Warning "Could not open browser automatically: $_"
    }
  }else{
    Write-Warning ("API did not respond at {0}. Check logs\node-err.log and logs\node-out.log" -f $base)
  }
}
Write-Host "Started DB and app. DB port=$DbPort, API port=$ApiPort"
