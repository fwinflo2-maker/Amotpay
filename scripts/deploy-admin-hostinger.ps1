# Build and package AMOTPay Admin for Hostinger static deploy.
param(
    [switch]$Deploy
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$adminRoot = Join-Path $repoRoot "admin"
$staging = Join-Path $env:TEMP ("amotpay-admin-" + [Guid]::NewGuid().ToString("N"))

Push-Location $adminRoot
npm run build
if ($LASTEXITCODE -ne 0) { throw "Admin build failed" }
Pop-Location

New-Item -ItemType Directory -Force -Path $staging | Out-Null
Copy-Item -Path (Join-Path $adminRoot "dist\*") -Destination $staging -Recurse -Force
Copy-Item -Path (Join-Path $adminRoot "deploy\.htaccess") -Destination $staging -Force

$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$zip = Join-Path $env:TEMP "amotpay-admin_$stamp.zip"
if (Test-Path $zip) { Remove-Item $zip -Force }
Compress-Archive -Path (Join-Path $staging "*") -DestinationPath $zip -Force
Write-Host "Admin package: $zip"

if ($Deploy) {
    Write-Host "Deploy via Hostinger MCP: hosting_deployStaticWebsite -domain admin-amotpay.nexustechnologies.cloud -archivePath $zip"
}

Remove-Item $staging -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "ADMIN PACKAGE READY"
