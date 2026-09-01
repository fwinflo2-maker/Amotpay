# Upload prepared subdomain API package via Hostinger TUS credentials.
param(
    [string]$PackageRoot = ""
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$deployScript = Join-Path $repoRoot "deploy\prepare-subdomain-zip.ps1"
$tusScript = Join-Path $repoRoot "deploy\tus-upload.ps1"

if ([string]::IsNullOrWhiteSpace($PackageRoot)) {
    $zip = & $deployScript
    $temp = Join-Path $env:TEMP ("amotpay-deploy-" + [Guid]::NewGuid().ToString("N"))
    Expand-Archive -Path $zip -DestinationPath $temp -Force
    $PackageRoot = $temp
}

if (-not (Test-Path $PackageRoot)) {
    throw "Package root not found: $PackageRoot"
}

$blocked = '(?i)(^|[\\/])\.git([\\/]|$)|(^|[\\/])node_modules([\\/]|$)'
$files = Get-ChildItem $PackageRoot -Recurse -File
$uploaded = 0
$failed = 0

foreach ($file in $files) {
    $rel = $file.FullName.Substring($PackageRoot.Length).TrimStart('\', '/').Replace('\', '/')
    if ($rel -match $blocked) { continue }
    $ok = & $tusScript -LocalPath $file.FullName -RemotePath $rel
    if ($ok) { $uploaded++ } else { $failed++ }
}

Write-Host "Uploaded: $uploaded"
if ($failed -gt 0) {
    Write-Host "Failed: $failed"
    exit 1
}
Write-Host "DEPLOY PACKAGE UPLOAD COMPLETE"
exit 0
