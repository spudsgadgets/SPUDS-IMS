param(
  [Parameter(Mandatory=$true)][string]$ZipPath,
  [Parameter(Mandatory=$true)][string]$Tag,
  [Parameter(Mandatory=$true)][string]$Name,
  [string]$Body = "",
  [string]$TokenPath
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
if(-not $env:GH_TOKEN -and $TokenPath -and (Test-Path -LiteralPath $TokenPath)){
  try{
    $t = Get-Content -Raw -LiteralPath $TokenPath
    if($t){ $env:GH_TOKEN = $t.Trim() }
  }catch{}
}
$token = $env:GH_TOKEN
if(-not $token -and $env:GITHUB_TOKEN){ $token = $env:GITHUB_TOKEN }
if(-not $token){
  try{
    $defaultTokenPath = Join-Path $env:LOCALAPPDATA 'SPUDS-IMS\gh-token'
    if(Test-Path -LiteralPath $defaultTokenPath){
      $t = Get-Content -Raw -LiteralPath $defaultTokenPath
      if($t){ $token = $t.Trim() }
    }
  }catch{}
}
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
function Get-ReleaseByTag([string]$t){
  try{
    $u = "https://api.github.com/repos/$owner/$repo/releases/tags/$t"
    return Invoke-RestMethod -Method Get -Uri $u -Headers $headers
  }catch{
    return $null
  }
}
function Create-Release([string]$t,[string]$nm,[string]$bd){
  $payload = @{ tag_name=$t; name=$nm; body=$bd; draft=$false; prerelease=$false } | ConvertTo-Json
  return Invoke-RestMethod -Method Post -Uri $uri -Headers $headers -Body $payload -ContentType "application/json"
}
function Update-Release([int]$id,[string]$bd,[string]$nm){
  $u = "https://api.github.com/repos/$owner/$repo/releases/$id"
  $pl = @{}
  if($bd){ $pl.body = $bd }
  if($nm){ $pl.name = $nm }
  $payload = $pl | ConvertTo-Json
  return Invoke-RestMethod -Method Patch -Uri $u -Headers $headers -Body $payload -ContentType "application/json"
}
function Delete-AssetIfExists([int]$rid,[string]$name){
  $u = "https://api.github.com/repos/$owner/$repo/releases/$rid/assets"
  try{
    $assets = Invoke-RestMethod -Method Get -Uri $u -Headers $headers
    if($assets){
      $match = $assets | Where-Object { $_.name -eq $name } | Select-Object -First 1
      if($match -and $match.id){
        $del = "https://api.github.com/repos/$owner/$repo/releases/assets/$($match.id)"
        Invoke-RestMethod -Method Delete -Uri $del -Headers $headers | Out-Null
        Write-Host ("Deleted existing asset: {0}" -f $name)
      }
    }
  }catch{}
}
$rel = Get-ReleaseByTag $Tag
if(-not $rel){
  try{
    $rel = Create-Release $Tag $Name $Body
  }catch{
    $rel = Get-ReleaseByTag $Tag
  }
}else{
  try{ Update-Release ([int]$rel.id) $Body $Name | Out-Null }catch{}
}
if(-not $rel){ Write-Warning "Could not create or fetch release for tag $Tag"; exit 1 }
$uploadUrl = "https://uploads.github.com/repos/$owner/$repo/releases/$($rel.id)/assets"
$assetName = [System.IO.Path]::GetFileName($zipFull)
Delete-AssetIfExists ([int]$rel.id) $assetName
$uploadUri = ($uploadUrl + "?name=" + ([uri]::EscapeDataString($assetName)))
$bytes = [System.IO.File]::ReadAllBytes($zipFull)
Write-Host ("Upload URL: {0}" -f $uploadUrl)
Write-Host ("Upload URI: {0}" -f $uploadUri)
Invoke-RestMethod -Method Post -Uri $uploadUri -Headers $headers -ContentType "application/zip" -Body $bytes | Out-Null
Write-Host "Published/Updated GitHub Release via REST: $Tag"
