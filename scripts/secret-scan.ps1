# Scan staged/untracked files for accidental secrets before commit.
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

$patterns = @(
    'APP_SECRET\s*=\s*[^\s#]+',
    'DB_PASSWORD\s*=\s*[^\s#]+',
    'ADMIN_PIN\s*=\s*\d+',
    'CASHRAMP_SECRET_KEY\s*=\s*CSHRMP',
    'SUMSUB_SECRET_KEY\s*=\s*\S+',
    'BEGIN (RSA |OPENSSH )?PRIVATE KEY',
    'AmotPay2026',
    '784512'
)

$git = "C:\Program Files\Git\bin\git.exe"
if (-not (Test-Path $git)) { $git = "git" }

$files = & $git ls-files -co --exclude-standard 2>$null
if (-not $files) {
    Write-Host "No git-tracked/staged files (init repo first)."
    exit 0
}

$hits = @()
foreach ($file in $files) {
    if ($file -match '(?i)(node_modules|vendor|\.apk$)') { continue }
    if (-not (Test-Path $file)) { continue }
    $content = Get-Content $file -Raw -ErrorAction SilentlyContinue
    if (-not $content) { continue }
    foreach ($p in $patterns) {
        if ($content -match $p) {
            $hits += "$file :: pattern $p"
        }
    }
}

if ($hits.Count -gt 0) {
    Write-Host "SECRET SCAN FAILED:"
    $hits | ForEach-Object { Write-Host "  $_" }
    exit 1
}

Write-Host "SECRET SCAN PASS"
exit 0
