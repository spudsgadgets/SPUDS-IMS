param(
  [string]$Tag = ""
)
$ErrorActionPreference = "Stop"
function _Try($script){ try{ & ([scriptblock]::Create($script)) }catch{ $null } }
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Split-Path -Parent $root
Set-Location $root
# derive version from package.json if no tag provided
if(-not $Tag -or $Tag.Trim() -eq ""){
  $pkg = Get-Content -Raw -LiteralPath (Join-Path $root 'package.json') | ConvertFrom-Json
  $Tag = "v$($pkg.version)"
}
# ensure clean working tree
$status = (_Try "git status --porcelain")
if($status){ Write-Warning "Uncommitted changes present. Commit before tagging."; exit 1 }
# create tag if missing
$existsRaw = _Try "git tag -l $Tag"
$exists = if ($existsRaw) { ($existsRaw | Out-String).Trim() } else { "" }
if(-not $exists){
  git tag -a $Tag -m "Release $Tag"
  Write-Host "Created tag $Tag"
} else {
  Write-Host "Tag $Tag already exists; pushing"
}
# push tag
git push origin $Tag
Write-Host "Pushed $Tag. GitHub Actions will build and publish the release."
