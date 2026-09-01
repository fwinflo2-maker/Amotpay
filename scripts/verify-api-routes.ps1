# Verify critical API routes respond (not 404).
param(
    [string]$BaseUrl = "https://amotpay-api.nexustechnologies.cloud"
)

$ErrorActionPreference = "Stop"
$getRoutes = @(
    "/api/health",
    "/api/health/migrations",
    "/api/health/cashramp",
    "/api/health/sumsub",
    "/api/kyc/status",
    "/api/eligibility",
    "/api/capabilities",
    "/api/admin/dashboard",
    "/api/admin/providers/overview",
    "/api/admin/capabilities",
    "/api/admin/kyc",
    "/api/admin/ledger",
    "/api/admin/reconciliation"
)
$postRoutes = @(
    "/api/kyc/start",
    "/api/v2/quote",
    "/api/v2/transfers",
    "/api/webhooks/cashramp",
    "/api/webhooks/sumsub",
    "/api/admin/login"
)

$fail = 0
foreach ($p in $getRoutes) {
    try {
        $r = Invoke-WebRequest -Uri "$BaseUrl$p" -Method GET -UseBasicParsing
        $code = $r.StatusCode
    } catch {
        $code = $_.Exception.Response.StatusCode.value__
    }
    if ($code -eq 404) { $fail++; Write-Host "FAIL GET $p -> 404" } else { Write-Host "OK   GET $p -> $code" }
}
foreach ($p in $postRoutes) {
    try {
        Invoke-WebRequest -Uri "$BaseUrl$p" -Method POST -ContentType "application/json" -Body "{}" -UseBasicParsing | Out-Null
        $code = 200
    } catch {
        $code = $_.Exception.Response.StatusCode.value__
    }
    if ($code -eq 404) { $fail++; Write-Host "FAIL POST $p -> 404" } else { Write-Host "OK   POST $p -> $code" }
}
if ($fail -gt 0) { throw "API route verification failed ($fail not found)" }
Write-Host "API ROUTE VERIFY PASS"
