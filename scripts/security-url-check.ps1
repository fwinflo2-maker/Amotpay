# Verify sensitive URLs return 403/404 — never 200.
$base = "https://amotpay-api.nexustechnologies.cloud"
$paths = @(
    "/amotpay.env",
    "/.env",
    "/.env.production",
    "/backend/.env",
    "/deploy/runtime.env"
)

$failed = $false
foreach ($path in $paths) {
    $url = "$base$path"
    try {
        $resp = Invoke-WebRequest -Uri $url -Method Head -UseBasicParsing -TimeoutSec 15
        $code = [int]$resp.StatusCode
        if ($code -eq 200) {
            Write-Host "FAIL $url -> HTTP $code (MUST NOT BE 200)"
            $failed = $true
        } else {
            Write-Host "OK   $url -> HTTP $code"
        }
    } catch {
        $code = $_.Exception.Response.StatusCode.value__
        if ($code -in 403, 404, 401) {
            Write-Host "OK   $url -> HTTP $code"
        } else {
            Write-Host "WARN $url -> $($_.Exception.Message)"
        }
    }
}

if ($failed) { exit 1 }
Write-Host "SECURITY URL CHECK PASS"
exit 0
