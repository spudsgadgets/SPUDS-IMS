param(
  [string]$ZipPath = (Join-Path (Get-Location).Path "SPUDS-MMS-Deploy.zip"),
  [string]$TargetDir = "$env:LOCALAPPDATA\SPUDS-MMS",
  [int]$Port = 3200,
  [switch]$OpenFirewall,
  [switch]$ReserveUrl
)
$ErrorActionPreference = "Stop"
if (-not (Test-Path $ZipPath)) { throw "Zip not found: $ZipPath" }
if (-not (Test-Path $TargetDir)) { New-Item -ItemType Directory -Force -Path $TargetDir | Out-Null }
$temp = Join-Path $env:TEMP ("SPUDS-MMS-update-" + [Guid]::NewGuid().ToString("n"))
New-Item -ItemType Directory -Force -Path $temp | Out-Null
Expand-Archive -Path $ZipPath -DestinationPath $temp -Force
$payload = $temp
if (Test-Path (Join-Path $payload "Start-MMS.cmd")) {
  Write-Host "Payload extracted to: $payload"
} else {
  # zip may contain files directly without a folder
}
# Stop running servers
try {
  $stop = Join-Path $TargetDir "Stop-MMS.cmd"
  if (Test-Path $stop) { & $stop | Out-Null }
} catch {}
# Copy files
& robocopy "$payload" "$TargetDir" /E /XO /NFL /NDL /NJH /NJS /NC | Out-Null
# Optional firewall & URL ACL
if ($OpenFirewall) {
  $fw = Join-Path $TargetDir "Open-Firewall.cmd"
  if (Test-Path $fw) { & $fw | Out-Null }
}
if ($ReserveUrl) {
  $acl = Join-Path $TargetDir "Reserve-URL.cmd"
  if (Test-Path $acl) { & $acl | Out-Null }
}
# Start server
$start = Join-Path $TargetDir "Start-MMS.cmd"
if (Test-Path $start) {
  & $start $Port | Out-Null
  Write-Host "Updated and started SPUDS-MMS at $TargetDir on port $Port"
} else {
  Write-Host "Updated SPUDS-MMS at $TargetDir"
}
# Cleanup
try { Remove-Item $temp -Recurse -Force } catch {}
