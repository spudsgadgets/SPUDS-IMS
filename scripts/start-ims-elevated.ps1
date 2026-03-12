param(
  [string]$DbPort = "3307",
  [string]$ApiPort = "3200"
)
$ErrorActionPreference = "Stop"
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
function Test-IsAdmin(){
  try{
    $id=[Security.Principal.WindowsIdentity]::GetCurrent()
    $p=New-Object Security.Principal.WindowsPrincipal($id)
    return $p.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
  }catch{ return $false }
}
if(-not (Test-IsAdmin)){
  Start-Process -FilePath "powershell" -ArgumentList ("-NoProfile -ExecutionPolicy Bypass -File `"{0}`" -DbPort {1} -ApiPort {2}" -f $PSCommandPath,$DbPort,$ApiPort) -Verb RunAs
  exit 0
}
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Split-Path -Parent $here
Ensure-Node $root | Out-Null
$startAll = Join-Path $root "scripts\start-all.ps1"
& $startAll -DbPort $DbPort -ApiPort $ApiPort -AllowDB -OpenBrowser $true
