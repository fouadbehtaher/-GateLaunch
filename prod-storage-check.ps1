param(
  [string]$BaseUrl = "http://localhost:3000",
  [string]$Email = "admin.demo@university.edu",
  [string]$Password = "admin1234"
)

$ErrorActionPreference = "Stop"

function Step($text) {
  Write-Host "`n==> $text" -ForegroundColor Cyan
}

function Assert($condition, $message) {
  if (-not $condition) {
    throw "Assertion failed: $message"
  }
}

function JsonPost($url, $body, $webSession) {
  return Invoke-RestMethod -Method Post -Uri $url -Body ($body | ConvertTo-Json) -ContentType "application/json" -WebSession $webSession
}

function JsonGet($url, $webSession) {
  return Invoke-RestMethod -Method Get -Uri $url -WebSession $webSession
}

$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

Step "Admin login"
$login = JsonPost "$BaseUrl/api/login" @{
  email = $Email
  password = $Password
} $session
Assert ($null -ne $login.user) "Login failed or missing user"

Step "Check /api/storage/health"
$health = JsonGet "$BaseUrl/api/storage/health" $session
Assert ($null -ne $health.storage) "Missing storage payload"
Assert ($health.storage.driver -eq "sqlite") "Expected sqlite driver, found: $($health.storage.driver)"
Assert ($health.storage.exists -eq $true) "Storage file should exist"
Assert ($health.storage.backup.enabled -eq $true) "Backup should be enabled"
Assert ($health.storage.backup.writable -eq $true) "Backup directory should be writable"
Write-Host "Driver: $($health.storage.driver)"
Write-Host "DB File: $($health.storage.file)"
Write-Host "Backup Dir: $($health.storage.backup.dir)"

Step "Trigger manual backup"
$backup = JsonPost "$BaseUrl/api/storage/backup" @{} $session
if ($backup.skipped -eq $true) {
  throw "Backup skipped: $($backup.reason)"
}
Assert ($null -ne $backup.file) "Manual backup response missing file path"
Write-Host "Backup file: $($backup.file)"

Step "Re-check /api/storage/health"
$health2 = JsonGet "$BaseUrl/api/storage/health" $session
Assert ($null -ne $health2.storage.backup.lastRunAt) "lastRunAt should be populated after backup"
Assert ($null -ne $health2.storage.backup.lastFile) "lastFile should be populated after backup"
Write-Host "Last backup at: $($health2.storage.backup.lastRunAt)"
Write-Host "Last backup file: $($health2.storage.backup.lastFile)"

Write-Host "`nProduction storage check passed." -ForegroundColor Green
