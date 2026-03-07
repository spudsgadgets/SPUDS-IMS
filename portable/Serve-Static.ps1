param(
  [string]$Root = ".",
  [int]$Port = 3200,
  [switch]$Lan
)
$ErrorActionPreference = "Stop"
$Root = (Resolve-Path $Root).Path
$prefix = if ($Lan) { "http://+:$Port/" } else { "http://localhost:$Port/" }
$listener = [System.Net.HttpListener]::new()
try {
  $listener.Prefixes.Add($prefix)
  $listener.Start()
} catch {
  if ($Lan) {
    $prefix = "http://localhost:$Port/"
    $listener = [System.Net.HttpListener]::new()
    $listener.Prefixes.Add($prefix)
    $listener.Start()
  } else { throw }
}
Write-Host "Serving $Root on $prefix"
function Get-ContentType {
  param([string]$path)
  $ext = [IO.Path]::GetExtension($path).ToLowerInvariant()
  switch ($ext) {
    ".html" { "text/html; charset=utf-8" }
    ".htm" { "text/html; charset=utf-8" }
    ".css" { "text/css; charset=utf-8" }
    ".js" { "application/javascript; charset=utf-8" }
    ".json" { "application/json; charset=utf-8" }
    ".png" { "image/png" }
    ".jpg" { "image/jpeg" }
    ".jpeg" { "image/jpeg" }
    ".gif" { "image/gif" }
    ".svg" { "image/svg+xml" }
    ".ico" { "image/x-icon" }
    ".txt" { "text/plain; charset=utf-8" }
    ".csv" { "text/csv; charset=utf-8" }
    ".woff" { "font/woff" }
    ".woff2" { "font/woff2" }
    ".ttf" { "font/ttf" }
    ".map" { "application/octet-stream" }
    default { "application/octet-stream" }
  }
}
while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  try {
    $rel = $ctx.Request.Url.AbsolutePath
    $rel = [Uri]::UnescapeDataString($rel)
    if ($rel -eq "/") { $rel = "/index.html" }
    $rel = $rel.TrimStart("/")
    $unsafe = $rel.Contains("..")
    $file = if ($unsafe) { $null } else { Join-Path $Root $rel }
    if ($file -and (Test-Path $file -PathType Container)) {
      $indexPath = Join-Path $file "index.html"
      if (Test-Path $indexPath -PathType Leaf) { $file = $indexPath } else { $file = $null }
    }
    if ($file -and (Test-Path $file -PathType Leaf)) {
      $bytes = [IO.File]::ReadAllBytes($file)
      $ct = Get-ContentType $file
      $resp = $ctx.Response
      $resp.Headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
      $resp.Headers["Pragma"] = "no-cache"
      $resp.Headers["Expires"] = "0"
      $resp.ContentType = $ct
      $resp.ContentLength64 = $bytes.Length
      $resp.OutputStream.Write($bytes,0,$bytes.Length)
      $resp.OutputStream.Close()
    } else {
      $resp = $ctx.Response
      $resp.StatusCode = 404
      $body = [Text.Encoding]::UTF8.GetBytes("404")
      $resp.ContentType = "text/plain; charset=utf-8"
      $resp.ContentLength64 = $body.Length
      $resp.OutputStream.Write($body,0,$body.Length)
      $resp.OutputStream.Close()
    }
  } catch {
    try {
      $ctx.Response.StatusCode = 500
      $body = [Text.Encoding]::UTF8.GetBytes("500")
      $ctx.Response.ContentType = "text/plain; charset=utf-8"
      $ctx.Response.ContentLength64 = $body.Length
      $ctx.Response.OutputStream.Write($body,0,$body.Length)
      $ctx.Response.OutputStream.Close()
    } catch {}
  }
}
