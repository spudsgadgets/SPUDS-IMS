param(
  [string]$StartName = "SPUDS IMS Start",
  [string]$StopName = "SPUDS IMS Stop",
  [string]$DiagName = "SPUDS IMS Diagnose",
  [string]$NodeName = "SPUDS IMS Setup Node"
)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Split-Path -Parent $root
$desktop = [Environment]::GetFolderPath('Desktop')
$ws = New-Object -ComObject WScript.Shell
function NewLink([string]$path,[string]$target,[string]$workdir){
  $lnk = $ws.CreateShortcut($path)
  $lnk.TargetPath = $target
  $lnk.WorkingDirectory = $workdir
  $lnk.IconLocation = "$env:SystemRoot\System32\shell32.dll,25"
  $lnk.Save()
}
$startTarget = Join-Path $root "Start-IMS.cmd"
$stopTarget = Join-Path $root "Stop-IMS.cmd"
$diagTarget = Join-Path $root "Diagnose-IMS.cmd"
 $nodeTarget = Join-Path $root "Setup-Portable-Node.cmd"
NewLink (Join-Path $desktop ($StartName + ".lnk")) $startTarget $root
NewLink (Join-Path $desktop ($StopName + ".lnk")) $stopTarget $root
NewLink (Join-Path $desktop ($DiagName + ".lnk")) $diagTarget $root
NewLink (Join-Path $desktop ($NodeName + ".lnk")) $nodeTarget $root
Write-Host "Shortcuts created on Desktop"
