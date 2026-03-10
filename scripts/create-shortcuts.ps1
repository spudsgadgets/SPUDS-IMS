param(
  [string]$StartName = "SPUDS IMS Start",
  [string]$StopName = "SPUDS IMS Stop"
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
NewLink (Join-Path $desktop ($StartName + ".lnk")) $startTarget $root
NewLink (Join-Path $desktop ($StopName + ".lnk")) $stopTarget $root
Write-Host "Shortcuts created on Desktop"
