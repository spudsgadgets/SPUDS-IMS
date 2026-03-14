param(
  [string]$ApiPort = "3200",
  [switch]$Fix,
  [switch]$Start,
  [string]$ExpectedIp = "",
  [string]$Log = ""
)
$ErrorActionPreference = "Stop"
function Out([string]$msg){
  Write-Host $msg
  if($Log){ try{ Add-Content -Path $Log -Value $msg }catch{} }
}
function Ensure-FirewallRule($name,$port){
  try{
    $exists = (netsh advfirewall firewall show rule name="$name" | Select-String -Pattern "Rule Name") -ne $null
    if(-not $exists){
      netsh advfirewall firewall add rule name="$name" dir=in action=allow protocol=TCP localport=$port profile=any enable=yes | Out-Null
      Out ("Opened Windows Firewall for TCP {0}" -f $port)
    }else{
      Out ("Firewall rule exists for TCP {0}" -f $port)
    }
  }catch{
    Out ("Firewall rule check failed: {0}" -f $_.Exception.Message)
  }
}
function Get-IPs(){
  try{
    $ips = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -ne '127.0.0.1' -and -not $_.IPAddress.StartsWith('169.254.') } | Select-Object -ExpandProperty IPAddress -ErrorAction SilentlyContinue
    return $ips
  }catch{ return @() }
}
function Test-Health($port){
  try{
    $r = Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 -Uri ("http://127.0.0.1:{0}/api/health" -f $port) -ErrorAction Stop
    if($r.StatusCode -eq 200){ return $true }
    $r2 = Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 -Uri ("http://localhost:{0}/api/health" -f $port) -ErrorAction Stop
    return $r2.StatusCode -eq 200
  }catch{ return $false }
}
function Get-HealthDetail($port){
  try{
    $r = Invoke-WebRequest -UseBasicParsing -TimeoutSec 3 -Uri ("http://127.0.0.1:{0}/api/health" -f $port) -ErrorAction Stop
    $obj = $null
    try{ $obj = $r.Content | ConvertFrom-Json }catch{}
    if($obj){
      $ok = [bool]$obj.ok
      if($ok){ return ("ok=true db={0}" -f ([bool]$obj.db)) } else { return ("ok=false error={0}" -f ($obj.error)) }
    }else{
      return ("status {0}" -f $r.StatusCode)
    }
  }catch{
    return ("{0}" -f $_.Exception.Message)
  }
}
function Test-Listening($port){
  try{
    $lines = netstat -ano | Select-String -Pattern (":{0}\s" -f $port)
    $list = @()
    foreach($l in $lines){ if($l.ToString() -match "LISTENING\s+(\d+)$"){ $list += [int]$Matches[1] } }
    return $list
  }catch{ return @() }
}
function Test-Node(){
  try{ return (Get-Command -Name node -ErrorAction SilentlyContinue) -ne $null }catch{ return $false }
}
function Test-LocalNode($root){
  try{
    $p = Join-Path $root "node\node.exe"
    if(Test-Path $p){ return $p } else { return $null }
  }catch{ return $null }
}
function Ensure-Node($root){
  $hasPath = Test-Node
  $local = Test-LocalNode $root
  if($hasPath -or $local){ return $true }
  try{
    $setupCmd = Join-Path $root "Setup-Portable-Node.cmd"
    if(Test-Path $setupCmd){
      Start-Process -FilePath $setupCmd -WorkingDirectory $root -Wait
      $local2 = Test-LocalNode $root
      return ($local2 -ne $null)
    }
  }catch{}
  return $false
}
function Get-DepStatus($root){
  try{
    $mods = Join-Path $root "node_modules"
    $has = Test-Path $mods
    $deps = @("mysql2")
    $missing = @()
    if($has){
      foreach($d in $deps){
        $p = Join-Path $mods $d
        if(-not (Test-Path $p)){ $missing += $d }
      }
    }else{
      $missing = $deps
    }
    return @{ has=$has; missing=$missing }
  }catch{
    return @{ has=$false; missing=@("unknown") }
  }
}
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Split-Path -Parent $here
Out ("Diagnosing access on port {0}" -f $ApiPort)
$pids = Test-Listening ([int]$ApiPort)
if($pids -and $pids.Count -gt 0){
  Out ("Listening on 0.0.0.0:{0}" -f $ApiPort)
  foreach($procId in $pids){
    try{ $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue; if($proc){ Out ("PID {0}: {1}" -f $procId,$proc.Name) } }catch{}
  }
}else{
  Out ("Not listening on port {0}" -f $ApiPort)
  $hasNode = Test-Node
  $localNode = Test-LocalNode $root
  if($hasNode){ Out "Node.js found on PATH." }
  elseif($localNode){ Out ("Bundled node found at {0}" -f $localNode) }
  else{ Out "Node.js runtime not found on PATH and no bundled node present." }
  $dep = Get-DepStatus $root
  if(-not $dep.has){ Out "Dependencies missing: node_modules not found." }
  elseif($dep.missing -and $dep.missing.Count -gt 0){ Out ("Missing dependencies: {0}" -f ([string]::Join(", ",$dep.missing))) }
}
$healthy = Test-Health $ApiPort
$healthText = if($healthy){"OK"}else{"FAIL"}
Out ("Local health: {0}" -f $healthText)
if(-not $healthy){ Out ("Health detail: {0}" -f (Get-HealthDetail $ApiPort)) }
$ips = Get-IPs
if($ips -and $ips.Count -gt 0){
  Out "Accessible URLs:"
  foreach($ip in $ips){ Out ("  http://{0}:{1}/" -f $ip,$ApiPort) }
}else{
  Out "No external IPv4 detected"
}
if($ExpectedIp){
  $present = ($ips | Where-Object { $_ -eq $ExpectedIp }) -ne $null
  $presentText = if($present){"True"}else{"False"}
  Out ("Expected IP present: {0}" -f $presentText)
}
if($Fix){
  Ensure-FirewallRule -name ("SPUDS IMS API {0}" -f $ApiPort) -port $ApiPort
}
if($Start){
  if(-not (Ensure-Node $root)){ Out "Could not ensure Node.js runtime; setup may require internet or manual node.exe copy."; }
  $startAll = Join-Path $root "scripts\start-all.ps1"
  & $startAll -DbPort "3307" -ApiPort $ApiPort -AllowDB -OpenBrowser $false
  Start-Sleep -Seconds 3
  $healthy2 = Test-Health $ApiPort
  $healthText2 = if($healthy2){"OK"}else{"FAIL"}
  Out ("Post-start health: {0}" -f $healthText2)
  if(-not $healthy2){ Out ("Health detail: {0}" -f (Get-HealthDetail $ApiPort)) }
}
