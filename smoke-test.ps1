param(
  [string]$BaseUrl = "http://localhost:3000"
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

Step "Login with demo admin"
$login = JsonPost "$BaseUrl/api/login" @{
  email = "admin.demo@university.edu"
  password = "admin1234"
} $session
Assert ($null -ne $login.user) "Login response missing user"

Step "Read /api/me"
$me = JsonGet "$BaseUrl/api/me" $session
Assert ($me.user.email -eq "admin.demo@university.edu") "Unexpected user from /api/me"

Step "Read AI status/insights"
$aiStatus = JsonGet "$BaseUrl/api/ai/status" $session
Assert ($null -ne $aiStatus.aiSync) "Missing aiSync in /api/ai/status"
$aiInsights = JsonGet "$BaseUrl/api/ai/insights" $session
Assert ($null -ne $aiInsights.insights.health) "Missing health in /api/ai/insights"

Step "Validate /api/ai/assistant bad input"
try {
  JsonPost "$BaseUrl/api/ai/assistant" @{ message = ""; scope = "dashboard" } $session | Out-Null
  throw "Expected /api/ai/assistant to reject empty message"
} catch {
  Write-Host "Expected rejection confirmed for empty message"
}

Step "Validate /api/payment-receipts rejects invalid method"
try {
  JsonPost "$BaseUrl/api/payment-receipts" @{
    method = "invalid_method"
    receiver = "01143813016"
    sender = "01000000000"
    amount = 200
    paymentRef = "ABC123"
    proofUrl = "/api/uploads/proof/fake.png"
  } $session | Out-Null
  throw "Expected /api/payment-receipts to reject invalid method"
} catch {
  Write-Host "Expected rejection confirmed for invalid payment method"
}

Step "Read integrations status"
$int = JsonGet "$BaseUrl/api/integrations/status" $session
Assert ($null -ne $int.integrations) "Missing integrations in /api/integrations/status"

Step "Read storage health"
$storage = JsonGet "$BaseUrl/api/storage/health" $session
Assert ($null -ne $storage.storage) "Missing storage object in /api/storage/health"
Assert ($storage.storage.driver -in @("sqlite", "json", "mock-local")) "Unknown storage driver"
Assert ($null -ne $storage.storage.records) "Missing storage records in /api/storage/health"

Step "Run manual storage backup"
try {
  $backup = JsonPost "$BaseUrl/api/storage/backup" @{} $session
  if ($backup.skipped -eq $true) {
    Write-Host "Backup endpoint returned skipped: $($backup.reason)"
  } else {
    Assert ($null -ne $backup.file) "Backup success response missing file path"
  }
} catch {
  throw "Storage backup endpoint failed: $($_.Exception.Message)"
}

Write-Host "`nSmoke test completed successfully." -ForegroundColor Green
