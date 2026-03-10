param(
  [Parameter(Mandatory=$true)][string]$ZipPath,
  [Parameter(Mandatory=$true)][string]$Tag,
  [Parameter(Mandatory=$true)][string]$Name,
  [string]$Body = ""
)
$ErrorActionPreference = "Stop"
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
# Prefer gh CLI if available and logged in
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
# Fallback to REST API using GH_TOKEN
if(-not $env:GH_TOKEN){ Write-Warning "GH_TOKEN not set; skipping publish."; exit 0 }
$uri = "https://api.github.com/repos/$owner/$repo/releases"
$headers = @{ Authorization = "token $($env:GH_TOKEN)"; "User-Agent" = "spuds-ims-release-script" }
$payload = @{ tag_name=$Tag; name=$Name; body=$Body; draft=$false; prerelease=$false } | ConvertTo-Json
$rel = Invoke-RestMethod -Method Post -Uri $uri -Headers $headers -Body $payload -ContentType "application/json"
$uploadUrl = $rel.upload_url -replace '\{\?name,label\}$',''
$assetName = [System.IO.Path]::GetFileName($zipFull)
$uploadUri = "$uploadUrl?name=$([uri]::EscapeDataString($assetName))"
$bytes = [System.IO.File]::ReadAllBytes($zipFull)
Invoke-RestMethod -Method Post -Uri $uploadUri -Headers $headers -ContentType "application/zip" -Body $bytes | Out-Null
Write-Host "Published GitHub Release via REST: $Tag"
