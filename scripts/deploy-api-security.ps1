# Deploy hardened API security rules to Hostinger (amotpay-api subdomain).
# Requires AMOTPAY_DEPLOY_* env vars OR manual upload via hPanel File Manager.
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$htaccess = Join-Path $root "deploy\api.htaccess"
$packageDir = Join-Path $env:TEMP "amotpay-security-fix"
$packageZip = Join-Path $env:TEMP "amotpay-security-fix.zip"

if (-not (Test-Path $htaccess)) {
    throw "Missing deploy/api.htaccess"
}

New-Item -ItemType Directory -Force -Path $packageDir | Out-Null
Copy-Item $htaccess (Join-Path $packageDir ".htaccess") -Force
if (Test-Path $packageZip) { Remove-Item $packageZip -Force }
Compress-Archive -Path (Join-Path $packageDir ".htaccess") -DestinationPath $packageZip -Force

Write-Host "=== AMOTPay API security deployment package ==="
Write-Host "Package: $packageZip"
Write-Host ""
Write-Host "MANUAL (Hostinger hPanel) — required until deploy credentials are configured:"
Write-Host "  1. File Manager -> public_html/amotpay-api/"
Write-Host "  2. DELETE amotpay.env (move secrets to Hostinger environment variables)"
Write-Host "  3. Replace .htaccess with deploy/api.htaccess from this repository"
Write-Host "  4. Run: .\scripts\security-url-check.ps1"
Write-Host ""

$baseUrl = $env:AMOTPAY_DEPLOY_BASE_URL
$authKey = $env:AMOTPAY_DEPLOY_AUTH_KEY
$restAuth = $env:AMOTPAY_DEPLOY_REST_AUTH
$remotePath = $env:AMOTPAY_API_HTACCESS_REMOTE_PATH

if ([string]::IsNullOrWhiteSpace($remotePath)) {
    $remotePath = ".htaccess"
}

if ([string]::IsNullOrWhiteSpace($baseUrl) -or [string]::IsNullOrWhiteSpace($authKey) -or [string]::IsNullOrWhiteSpace($restAuth)) {
    Write-Host "SKIP automated upload: AMOTPAY_DEPLOY_* environment variables not set."
    Write-Host "Set AMOTPAY_API_HTACCESS_REMOTE_PATH if API subdomain path differs from: $remotePath"
    exit 2
}

& (Join-Path $root "deploy\tus-upload.ps1") -LocalPath (Join-Path $packageDir ".htaccess") -RemotePath $remotePath
Write-Host "Uploaded .htaccess to $remotePath"
Write-Host ""
Write-Host "IMPORTANT: Delete amotpay.env from webroot manually (upload cannot remove files)."
Write-Host "Then run: .\scripts\security-url-check.ps1"
