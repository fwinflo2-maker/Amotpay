# Verify production CORS headers for AMOTPay Admin.
param(
    [string]$Api = "https://amotpay-api.nexustechnologies.cloud",
    [string]$AdminOrigin = "https://admin-amotpay.nexustechnologies.cloud",
    [string]$BadOrigin = "https://evil.example.com"
)

$ErrorActionPreference = "Stop"
$fail = 0

function Test-Cors {
    param([string]$Label, [string]$Origin, [bool]$ExpectAllow)
    $headers = @{
        Origin = $Origin
        "Access-Control-Request-Method" = "GET"
        "Access-Control-Request-Headers" = "authorization,content-type"
    }
    $r = Invoke-WebRequest -Uri "$Api/api/admin/dashboard" -Method OPTIONS -Headers $headers -UseBasicParsing
    $allow = $r.Headers["Access-Control-Allow-Origin"]
    if ($ExpectAllow) {
        if ($allow -ne $Origin) {
            Write-Host "FAIL $Label — expected Allow-Origin: $Origin, got: $allow"
            $script:fail++
        } else {
            Write-Host "OK   $Label — Allow-Origin: $allow"
        }
    } else {
        if ($allow) {
            Write-Host "FAIL $Label — unexpected Allow-Origin: $allow"
            $script:fail++
        } else {
            Write-Host "OK   $Label — no Allow-Origin (blocked)"
        }
    }
}

Write-Host "==> CORS verification ($Api)"
Test-Cors -Label "Admin origin" -Origin $AdminOrigin -ExpectAllow $true
Test-Cors -Label "Arbitrary origin" -Origin $BadOrigin -ExpectAllow $false

if ($fail -gt 0) { exit 1 }
Write-Host "CORS VERIFY PASS"
