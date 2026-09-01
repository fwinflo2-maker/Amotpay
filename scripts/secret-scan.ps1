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

$staged = & $git diff --cached --name-only 2>$null
$files = if ($staged) { $staged } else { & $git ls-files -co --exclude-standard 2>$null }
if (-not $files) {
    Write-Host "No git-tracked/staged files (init repo first)."
    exit 0
}

$hits = @()
foreach ($file in $files) {
    if ($file -match '(?i)(node_modules|vendor|\.apk$|\.env\.example$|runtime\.env\.example$|secret-scan\.ps1$|generate-hostinger-env\.ps1$|sandbox-phase2\.ps1$|sandbox\.env\.example$|je veux savoir|docs/SANDBOX_PHASE2\.md)') { continue }
    if (-not (Test-Path $file)) { continue }
    $content = Get-Content $file -Raw -ErrorAction SilentlyContinue
    if (-not $content) { continue }
    foreach ($p in $patterns) {
        $m = [regex]::Matches($content, $p)
        foreach ($hit in $m) {
            if ($file -match '^docs/' -and $hit.Value -match '<[^>]+>') { continue }
            if ($file -match '^docs/' -and $hit.Value -match '=\s*$') { continue }
            $hits += "$file :: $($hit.Value)"
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
