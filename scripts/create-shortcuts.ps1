param(
  [string]$StartName = "SPUDS IMS Start",
  [string]$StopName = "SPUDS IMS Stop",
  [string]$DiagName = "SPUDS IMS Diagnose",
  [string]$NodeName = "SPUDS IMS Setup Node",
  [string]$UninstallName = "SPUDS IMS Uninstall"
)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Split-Path -Parent $root
$desktop = [Environment]::GetFolderPath('Desktop')
$ws = New-Object -ComObject WScript.Shell
function NewLink([string]$path,[string]$target,[string]$workdir,[string]$args="",[int]$iconIndex=25){
  $lnk = $ws.CreateShortcut($path)
  $lnk.TargetPath = $target
  if($args){ $lnk.Arguments = $args }
  $lnk.WorkingDirectory = $workdir
  $lnk.IconLocation = "$env:SystemRoot\System32\shell32.dll,$iconIndex"
  $lnk.Save()
}
$startTarget = Join-Path $root "Start-IMS.cmd"
$stopTarget = Join-Path $root "Stop-IMS.cmd"
$diagTarget = Join-Path $root "Diagnose-IMS.cmd"
$nodeTarget = Join-Path $root "Setup-Portable-Node.cmd"
$uninstPath = Join-Path $root "scripts\uninstall-spuds-ims.ps1"

$created = 0
$shortcutList = @(
  @{ Name=$StartName; Target=$startTarget; Icon=25 },
  @{ Name=$StopName; Target=$stopTarget; Icon=27 },
  @{ Name=$DiagName; Target=$diagTarget; Icon=23 },
  @{ Name=$NodeName; Target=$nodeTarget; Icon=14 }
)

if(Test-Path $uninstPath){
  $shortcutList += @{ 
    Name=$UninstallName; 
    Target="powershell.exe"; 
    Args="-NoProfile -ExecutionPolicy Bypass -File `"$uninstPath`""; 
    Icon=31 
  }
}

foreach($item in $shortcutList){
  try{
    $lnkPath = Join-Path $desktop ($item.Name + ".lnk")
    NewLink $lnkPath $item.Target $root $item.Args $item.Icon
    $created++
  }catch{
    try{ Write-Warning ("Could not create shortcut '{0}' on Desktop: {1}" -f $item.Name,$_) }catch{}
  }
}
if($created -gt 0){
  Write-Host "Shortcuts created on Desktop"
}else{
  Write-Warning "No shortcuts were created (Desktop may not be writable)."
}
exit 0
