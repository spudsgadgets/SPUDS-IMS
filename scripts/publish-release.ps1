param(
  [Parameter(Mandatory=$true)][string]$ZipPath,
  [Parameter(Mandatory=$true)][string]$Tag,
  [Parameter(Mandatory=$true)][string]$Name,
  [string]$Body = ""
)
$ErrorActionPreference = "Stop"
function Ensure-GH {
  if(Get-Command gh -ErrorAction SilentlyContinue){ return }
  if($env:GH_TOKEN){ return }
  try{
    $tools = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "..\\.tools\\gh"
    New-Item -ItemType Directory -Force -Path $tools | Out-Null
    $latest = Invoke-RestMethod -Uri 'https://api.github.com/repos/cli/cli/releases/latest'
    $asset = $latest.assets | Where-Object { $_.name -match 'windows_amd64.zip$' } | Select-Object -First 1
    if(-not $asset){ return }
    $zip = Join-Path $tools "gh.zip"
    Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $zip
    Expand-Archive -Path $zip -DestinationPath $tools -Force
    Remove-Item $zip -Force
    $gh = (Get-ChildItem -Recurse -File -Path $tools -Filter 'gh.exe' | Select-Object -First 1)
    if($gh){
      $env:PATH = ($gh.Directory.FullName + ';' + $env:PATH)
    }
  }catch{
    Write-Verbose "Unable to auto-install gh: $_"
  }
}
function Ensure-GHLogin {
  if(-not (Get-Command gh -ErrorAction SilentlyContinue)){ return }
  if($env:GH_TOKEN -or $env:GITHUB_TOKEN){ return }
  try{
    & gh auth status 2>$null 1>$null
    if($LASTEXITCODE -eq 0){ return }
  }catch{}
}
function TryRun($cmd){ try{ Invoke-Expression $cmd }catch{ $null } }
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Split-Path -Parent $root
Set-Location $root
$repoUrl = (TryRun "git config --get remote.origin.url")
if(-not $repoUrl){ Write-Warning "No git remote; skipping publish."; exit 0 }
if($repoUrl -match 'github.com[:/](.+?)/(.+?)(\.git)?$'){
  $owner=$matches[1]; $repo=$matches[2]
}else{
  Write-Warning "Unsupported remote URL: $repoUrl"; exit 0
}
$zipFull = (Resolve-Path $ZipPath).Path
# Token (if any) is used for non-interactive auth with gh and/or REST fallback
$token = $env:GH_TOKEN
if(-not $token -and $env:GITHUB_TOKEN){ $token = $env:GITHUB_TOKEN }
if($token -and -not $env:GH_TOKEN){ $env:GH_TOKEN = $token }
# Prefer gh CLI if available and logged in
Ensure-GH
Ensure-GHLogin
if(Get-Command gh -ErrorAction SilentlyContinue){
  $notesFile = New-TemporaryFile
  $Body | Out-File -FilePath $notesFile -Encoding UTF8
  Try{
    & gh release create $Tag $zipFull --title $Name --notes-file $notesFile
    Write-Host "Published GitHub Release via gh: $Tag"
    exit 0
  }Catch{
    Write-Warning "gh release failed: $_"
  }Finally{
    Remove-Item -Force $notesFile -ErrorAction SilentlyContinue
  }
}
# Fallback to REST API using GH_TOKEN/GITHUB_TOKEN
if(-not $token){ Write-Warning "GH_TOKEN/GITHUB_TOKEN not set; skipping publish."; exit 0 }
$uri = "https://api.github.com/repos/$owner/$repo/releases"
$headers = @{ Authorization = "token $token"; "User-Agent" = "spuds-ims-release-script" }
$payload = @{ tag_name=$Tag; name=$Name; body=$Body; draft=$false; prerelease=$false } | ConvertTo-Json
$rel = Invoke-RestMethod -Method Post -Uri $uri -Headers $headers -Body $payload -ContentType "application/json"
$uploadUrl = $rel.upload_url -replace '\{\?name,label\}$',''
$assetName = [System.IO.Path]::GetFileName($zipFull)
$uploadUri = "$uploadUrl?name=$([uri]::EscapeDataString($assetName))"
$bytes = [System.IO.File]::ReadAllBytes($zipFull)
Invoke-RestMethod -Method Post -Uri $uploadUri -Headers $headers -ContentType "application/zip" -Body $bytes | Out-Null
Write-Host "Published GitHub Release via REST: $Tag"
