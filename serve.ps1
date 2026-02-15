$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://localhost:8080/")

function Get-ContentType($filePath) {
  switch ([System.IO.Path]::GetExtension($filePath).ToLowerInvariant()) {
    ".html" { return "text/html; charset=utf-8" }
    ".css" { return "text/css; charset=utf-8" }
    ".js" { return "application/javascript; charset=utf-8" }
    ".json" { return "application/json; charset=utf-8" }
    ".svg" { return "image/svg+xml" }
    ".png" { return "image/png" }
    ".jpg" { return "image/jpeg" }
    ".jpeg" { return "image/jpeg" }
    default { return "application/octet-stream" }
  }
}

$listener.Start()
Write-Host "Serving $root at http://localhost:8080/landing.html"

try {
  while ($listener.IsListening) {
    $context = $listener.GetContext()
    $path = $context.Request.Url.AbsolutePath.TrimStart("/")
    if ([string]::IsNullOrWhiteSpace($path)) {
      $path = "landing.html"
    }
    $filePath = Join-Path $root $path

    if (Test-Path $filePath -PathType Leaf) {
      $bytes = [System.IO.File]::ReadAllBytes($filePath)
      $context.Response.ContentType = Get-ContentType $filePath
      $context.Response.StatusCode = 200
      $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $message = "Not Found"
      $bytes = [System.Text.Encoding]::UTF8.GetBytes($message)
      $context.Response.StatusCode = 404
      $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    }
    $context.Response.OutputStream.Close()
  }
} finally {
  $listener.Stop()
  $listener.Close()
}
