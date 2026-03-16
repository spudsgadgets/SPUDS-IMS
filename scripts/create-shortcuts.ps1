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
$created = 0
foreach($item in @(
  @{ Name=$StartName; Target=$startTarget },
  @{ Name=$StopName; Target=$stopTarget },
  @{ Name=$DiagName; Target=$diagTarget },
  @{ Name=$NodeName; Target=$nodeTarget }
)){
  try{
    $lnkPath = Join-Path $desktop ($item.Name + ".lnk")
    NewLink $lnkPath $item.Target $root
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
