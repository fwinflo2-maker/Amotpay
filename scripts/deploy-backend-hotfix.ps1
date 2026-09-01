# Upload specific backend files to amotpay-api via Hostinger TUS (preserves amotpay.env).
param(
    [string]$Domain = "amotpay-api.nexustechnologies.cloud",
    [string]$Username = "u199940923"
)

$ErrorActionPreference = "Stop"
$repo = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$backend = Join-Path $repo "backend\src"
$tus = Join-Path $repo "deploy\tus-upload.ps1"

$files = @(
    @{ Local = "Http\Cors.php"; Remote = "src/Http/Cors.php" },
    @{ Local = "Http\Response.php"; Remote = "src/Http/Response.php" },
    @{ Local = "Version.php"; Remote = "src/Version.php" },
    @{ Local = "Router.php"; Remote = "src/Router.php" }
)

foreach ($f in $files) {
    $localPath = Join-Path $backend $f.Local
    if (-not (Test-Path $localPath)) { throw "Missing $localPath" }
    & $tus -LocalPath $localPath -RemotePath $f.Remote
    if (-not $?) { throw "Upload failed: $($f.Remote)" }
}

Write-Host "BACKEND HOTFIX UPLOAD COMPLETE"
