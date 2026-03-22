param(
  [string]$User = "spuds_admin",
  [string]$Password,
  [string]$ApiPort = "3200",
  [string]$DbPort = "3307",
  [switch]$Start
)
$ErrorActionPreference = "Stop"
try{
  $dir = Join-Path $env:LOCALAPPDATA "SPUDS-IMS"
  if(-not (Test-Path $dir)){ New-Item -ItemType Directory -Path $dir -Force | Out-Null }
  if(-not [string]::IsNullOrWhiteSpace($Password)){
    $sec = ConvertTo-SecureString $Password -AsPlainText -Force
    $enc = $sec | ConvertFrom-SecureString
    $path = Join-Path $dir "db_password.dpapi"
    Set-Content -LiteralPath $path -Value $enc -Encoding ascii -Force
  }
}catch{
  Write-Warning ("Failed to save DB credentials: {0}" -f $_)
}
if($Start){
  try{
    $root = Split-Path -Parent $PSScriptRoot
    $stopCmd = Join-Path $root "Stop-IMS.cmd"
    if(Test-Path $stopCmd){
      & $stopCmd
    }
  }catch{}
  try{
    & (Join-Path $PSScriptRoot "start-all.ps1") -DbPort $DbPort -ApiPort $ApiPort -AllowDB -OpenBrowser:$false -NoDbPrompt
  }catch{
    Write-Error $_
    exit 1
  }
}
