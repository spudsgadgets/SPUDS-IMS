param(
  [string]$DbPort = "3307",
  [string]$ApiPort = "3200"
)
$ErrorActionPreference = "Stop"
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
$startAll = Join-Path $root "scripts\start-all.ps1"
& $startAll -DbPort $DbPort -ApiPort $ApiPort -AllowDB -OpenBrowser $true
