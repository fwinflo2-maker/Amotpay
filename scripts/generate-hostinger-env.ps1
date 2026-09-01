# Generate NEW secret values for Hostinger environment (never commit output).
$ErrorActionPreference = "Stop"

function New-RandomHex([int]$bytes = 32) {
    $buf = New-Object byte[] $bytes
    [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($buf)
    return ([BitConverter]::ToString($buf) -replace '-', '').ToLower()
}

function New-RandomPin([int]$length = 12) {
    $digits = "0123456789"
    $buf = New-Object byte[] $length
    [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($buf)
    return -join ($buf | ForEach-Object { $digits[$_ % $digits.Length] })
}

$appSecretBytes = New-Object byte[] 48
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($appSecretBytes)

Write-Host "=== AMOTPay secret rotation (paste into Hostinger env only) ==="
Write-Host ""
Write-Host "ADMIN_USERNAME=admin"
Write-Host "ADMIN_PASSWORD=$(New-RandomPin 12)Aa"
Write-Host "BOOTSTRAP_ADMIN_USERNAME=admin"
Write-Host "BOOTSTRAP_ADMIN_PASSWORD=$(New-RandomPin 12)Bb"
Write-Host "APP_SECRET=$([Convert]::ToBase64String($appSecretBytes))"
Write-Host "ADMIN_PIN=$(New-RandomPin 12)"
Write-Host "DB_PASSWORD=$(New-RandomHex 24)"
Write-Host ""
Write-Host "Provider keys (rotate in Cashramp / Sumsub dashboards, then set in Hostinger):"
Write-Host "CASHRAMP_API_KEY=<from Cashramp dashboard>"
Write-Host "CASHRAMP_SECRET_KEY=<from Cashramp dashboard>"
Write-Host "SUMSUB_APP_TOKEN=<from Sumsub dashboard>"
Write-Host "SUMSUB_SECRET_KEY=<from Sumsub dashboard>"
Write-Host ""
Write-Host "After rotation:"
Write-Host "  1. Delete amotpay.env from Hostinger webroot"
Write-Host "  2. Deploy hardened .htaccess (deploy/api.htaccess)"
Write-Host "  3. Run scripts/security-url-check.ps1"
Write-Host "  4. Re-test app login and provider connections"
