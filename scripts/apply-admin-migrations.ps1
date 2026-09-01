# Apply pending DB migrations via Admin API (requires admin credentials in env).
param(
    [string]$ApiUrl = "https://amotpay-api.nexustechnologies.cloud",
    [string]$Username = $env:AMOTPAY_ADMIN_USERNAME,
    [string]$Password = $env:AMOTPAY_ADMIN_PASSWORD
)

$ErrorActionPreference = "Stop"
if ([string]::IsNullOrWhiteSpace($Username)) { $Username = $env:ADMIN_USERNAME }
if ([string]::IsNullOrWhiteSpace($Password)) {
    $Password = $env:AMOTPAY_ADMIN_PASSWORD
    if ([string]::IsNullOrWhiteSpace($Password)) { $Password = $env:ADMIN_PASSWORD }
    if ([string]::IsNullOrWhiteSpace($Password)) { $Password = $env:ADMIN_PIN }
}

if ([string]::IsNullOrWhiteSpace($Username) -or [string]::IsNullOrWhiteSpace($Password)) {
    throw "Set AMOTPAY_ADMIN_USERNAME and AMOTPAY_ADMIN_PASSWORD (or ADMIN_USERNAME/ADMIN_PASSWORD/ADMIN_PIN)."
}

$loginBody = @{ username = $Username; password = $Password } | ConvertTo-Json
$login = Invoke-RestMethod -Uri "$ApiUrl/api/admin/login" -Method POST -ContentType "application/json" -Body $loginBody
$token = $login.data.token
$headers = @{ Authorization = "Bearer $token" }

Write-Host "==> Migration status (before)"
$before = Invoke-RestMethod -Uri "$ApiUrl/api/admin/migrations" -Headers $headers
$before.data.migrations | ConvertTo-Json -Depth 3

Write-Host "==> Applying pending migrations"
$result = Invoke-RestMethod -Uri "$ApiUrl/api/admin/migrations/apply" -Method POST -Headers $headers -ContentType "application/json" -Body "{}"
if ($result.data.applied.Count -gt 0) {
    Write-Host "Applied: $($result.data.applied -join ', ')"
} else {
    Write-Host "No pending migrations."
}

Write-Host "==> Migration status (after)"
$result.data.status.migrations | ConvertTo-Json -Depth 3
