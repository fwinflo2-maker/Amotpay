$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$backend = "$root\backend"
$out = "$root\deploy\subdomain-root"
$ts = Get-Date -Format "yyyyMMdd_HHmmss"
$archiveDir = $env:AMOTPAY_DEPLOY_OUTPUT_DIR
if ([string]::IsNullOrWhiteSpace($archiveDir)) {
    $archiveDir = Join-Path ([IO.Path]::GetTempPath()) "AmotPayDeploy"
}

$archiveDir = [IO.Path]::GetFullPath($archiveDir)
if ($archiveDir.StartsWith($root, [StringComparison]::OrdinalIgnoreCase)) {
    throw "AMOTPAY_DEPLOY_OUTPUT_DIR must be outside the workspace."
}
New-Item -ItemType Directory -Force -Path $archiveDir | Out-Null
$zip = Join-Path $archiveDir "amotpay-api_$ts.zip"

if (Test-Path $out) { Remove-Item $out -Recurse -Force }
New-Item -ItemType Directory -Force -Path "$out\vendor", "$out\src" | Out-Null

Copy-Item "$backend\public\index.php" "$out\index.php"
Copy-Item "$PSScriptRoot\api.htaccess" "$out\.htaccess"
Copy-Item "$backend\vendor\autoload.php" "$out\vendor\autoload.php"
Copy-Item "$backend\src\*" "$out\src\" -Recurse

# Runtime configuration is supplied by the hosting environment, never by a webroot file.
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$adminServicePath = "$out\src\Services\AdminService.php"
if (Test-Path $adminServicePath) {
    $adminService = Get-Content $adminServicePath -Raw
    $adminService = $adminService -replace "Env::get\('ADMIN_PIN',\s*'[^']*'\)\s*\?\?\s*'[^']*'", "Env::require('ADMIN_PIN')"
    [IO.File]::WriteAllText($adminServicePath, $adminService, $utf8NoBom)
}

$indexPath = "$out\index.php"
$index = Get-Content $indexPath -Raw
$index = $index -replace '(?m)^use AmotPay\\Config\\Env;\r?\n', ''
$index = $index -replace '(?m)^\s*Env::load\([^\r\n]+\);\r?\n?', ''
[IO.File]::WriteAllText($indexPath, $index, $utf8NoBom)

Remove-Item $zip -ErrorAction SilentlyContinue
Compress-Archive -Path "$out\*" -DestinationPath $zip -Force
Write-Output $zip
