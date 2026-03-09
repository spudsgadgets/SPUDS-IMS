param(
  [string]$CsvDir = "D:\SynologyDrive\SPUDS Software-Shared\Inflow\CSV",
  [string]$BaseUrl = "http://localhost:3200"
)
$ErrorActionPreference = "Stop"
Write-Host "Bulk importing CSVs from $CsvDir to $BaseUrl/api/import ..."
if(-not (Test-Path $CsvDir)){ Write-Error "CSV directory not found: $CsvDir"; exit 1 }
function SanitizeName([string]$name){
  $n = $name.Trim().ToLower()
  $n = ($n -replace "[^a-z0-9_]", "_")
  if([string]::IsNullOrWhiteSpace($n)){ $n = "table" }
  return $n
}
$files = Get-ChildItem -Path $CsvDir -Filter *.csv -File -Recurse
if(-not $files -or $files.Count -eq 0){ Write-Warning "No CSV files found."; exit 0 }
$ok = 0; $fail = 0
foreach($f in $files){
  $table = SanitizeName([System.IO.Path]::GetFileNameWithoutExtension($f.Name))
  Write-Host "Importing '$($f.FullName)' => table '$table' ..."
  try{
    $text = Get-Content -LiteralPath $f.FullName -Raw -Encoding UTF8
    $uri = "$BaseUrl/api/import?table=$table"
    $resp = Invoke-RestMethod -Method Put -Uri $uri -ContentType "text/plain" -Body $text
    Write-Host "  -> ok: $($resp.rows) rows, columns: $((($resp.columns) -join ', '))"
    $ok++
  }catch{
    $msg = $_.Exception.Message
    $detail = ""
    try{
      $r = $_.Exception.Response
      if($r){
        $reader = New-Object System.IO.StreamReader($r.GetResponseStream())
        $detail = $reader.ReadToEnd()
      }
    }catch{}
    if($detail){ Write-Warning "  -> failed: $msg ; response: $detail" } else { Write-Warning "  -> failed: $msg" }
    $fail++
  }
}
Write-Host "Done. Success: $ok, Failed: $fail"
