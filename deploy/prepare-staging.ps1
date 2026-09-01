$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$backend = "$root\backend"
$staging = "$root\deploy\staging"

if (Test-Path $staging) { Remove-Item $staging -Recurse -Force }

# amotpay/rest/ = public entry; runtime configuration comes from server variables.
$dirs = @(
    "$staging\amotpay\rest\admin",
    "$staging\amotpay\vendor",
    "$staging\amotpay\src"
)
foreach ($d in $dirs) { New-Item -ItemType Directory -Force -Path $d | Out-Null }

Copy-Item "$PSScriptRoot\staging.htaccess" "$staging\amotpay\.htaccess"
Copy-Item "$backend\public\index.php" "$staging\amotpay\rest\index.php"
Copy-Item "$PSScriptRoot\api.htaccess" "$staging\amotpay\rest\.htaccess"
Copy-Item "$backend\public\admin\index.php" "$staging\amotpay\rest\admin\index.php"
Copy-Item "$backend\vendor\autoload.php" "$staging\amotpay\vendor\autoload.php"
Copy-Item "$backend\src\*" "$staging\amotpay\src\" -Recurse

# Strip file-based environment loading from copied public entrypoints.
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$adminServicePath = "$staging\amotpay\src\Services\AdminService.php"
if (Test-Path $adminServicePath) {
    $adminService = Get-Content $adminServicePath -Raw
    $adminService = $adminService -replace "Env::get\('ADMIN_PIN',\s*'[^']*'\)\s*\?\?\s*'[^']*'", "Env::require('ADMIN_PIN')"
    [IO.File]::WriteAllText($adminServicePath, $adminService, $utf8NoBom)
}

foreach ($entrypoint in @("$staging\amotpay\rest\index.php", "$staging\amotpay\rest\admin\index.php")) {
    $content = Get-Content $entrypoint -Raw
    $content = $content -replace '(?m)^\s*Env::load\([^\r\n]+\);\r?\n?', ''
    if ($entrypoint.EndsWith("rest\index.php")) {
        $content = $content -replace '(?m)^use AmotPay\\Config\\Env;\r?\n', ''
    }
    [IO.File]::WriteAllText($entrypoint, $content, $utf8NoBom)
}

Write-Output "Files:"
Get-ChildItem $staging\amotpay -Recurse -File | ForEach-Object {
    $_.FullName.Substring("$staging\".Length).Replace('\','/')
}
