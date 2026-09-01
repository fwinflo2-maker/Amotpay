# AMOTPay Phase 2 — sandbox configuration and E2E validation.
# Credentials ONLY from environment variables or deploy/sandbox.env.local (gitignored).
param(
    [switch]$ConfigureProviders,
    [switch]$TestConnections,
    [switch]$SyncCapabilities,
    [switch]$RunE2E,
    [switch]$All
)

$ErrorActionPreference = "Stop"
$Api = $env:AMOTPAY_API_URL
if ([string]::IsNullOrWhiteSpace($Api)) { $Api = "https://amotpay-api.nexustechnologies.cloud" }
$Api = $Api.TrimEnd("/")

function Write-Step([string]$Message) { Write-Host "==> $Message" }

function Invoke-AmotApi {
    param(
        [string]$Method = "GET",
        [string]$Path,
        [hashtable]$Headers = @{},
        [object]$Body = $null
    )
    $uri = "$Api/api$Path"
    $params = @{
        Uri = $uri
        Method = $Method
        Headers = $Headers
        UseBasicParsing = $true
        TimeoutSec = 120
    }
    if ($Body -ne $null) {
        $params.ContentType = "application/json"
        $params.Body = ($Body | ConvertTo-Json -Depth 8 -Compress)
    }
    try {
        $resp = Invoke-WebRequest @params
        return $resp.Content | ConvertFrom-Json
    } catch {
        $stream = $_.Exception.Response.GetResponseStream()
        if ($stream) {
            $reader = New-Object System.IO.StreamReader($stream)
            $text = $reader.ReadToEnd()
            if ($text) {
                try { return $text | ConvertFrom-Json } catch { throw $text }
            }
        }
        throw $_
    }
}

function Get-AdminToken {
    $username = $env:AMOTPAY_ADMIN_USERNAME
    if ([string]::IsNullOrWhiteSpace($username)) { $username = $env:ADMIN_USERNAME }
    $password = $env:AMOTPAY_ADMIN_PASSWORD
    if ([string]::IsNullOrWhiteSpace($password)) {
        $password = $env:ADMIN_PASSWORD
        if ([string]::IsNullOrWhiteSpace($password)) { $password = $env:ADMIN_PIN }
    }

    if (-not [string]::IsNullOrWhiteSpace($username) -and -not [string]::IsNullOrWhiteSpace($password)) {
        $json = Invoke-AmotApi -Method POST -Path "/admin/login" -Body @{ username = $username; password = $password }
    } elseif (-not [string]::IsNullOrWhiteSpace($password)) {
        $json = Invoke-AmotApi -Method POST -Path "/admin/login" -Body @{ pin = $password }
    } else {
        throw "Set AMOTPAY_ADMIN_USERNAME + AMOTPAY_ADMIN_PASSWORD (or ADMIN_PIN). Load deploy/sandbox.env.local first."
    }
    if (-not $json.success) { throw "Admin login failed" }
    return $json.data.token
}

function Test-SecurityCheck {
    $script = Join-Path (Split-Path $PSScriptRoot -Parent) "scripts\security-url-check.ps1"
    & $script
    if ($LASTEXITCODE -ne 0) { throw "Security URL check failed" }
}

function Set-ProviderCredentials {
    param([string]$Token, [string]$Provider, [hashtable]$Values)
    $headers = @{ Authorization = "Bearer $Token" }
    $path = "/admin/providers/$($Provider.ToLower())"
    $json = Invoke-AmotApi -Method PUT -Path $path -Headers $headers -Body $Values
    if (-not $json.success) { throw "Failed to save $Provider credentials" }
}

function Test-ProviderConnection {
    param([string]$Token, [string]$Provider)
    $headers = @{ Authorization = "Bearer $Token" }
    $json = Invoke-AmotApi -Method POST -Path "/admin/providers/$($Provider.ToLower())/test" -Headers $headers -Body @{}
    if (-not $json.success) { throw "$Provider test failed" }
    $status = $json.data.status
    Write-Host "$Provider test: $status (latency $($json.data.latency_ms)ms)"
    if ($status -ne "CONNECTED") {
        throw "$Provider is not CONNECTED"
    }
}

if ($All) {
    $ConfigureProviders = $true
    $TestConnections = $true
    $SyncCapabilities = $true
    $RunE2E = $true
}

if (-not ($ConfigureProviders -or $TestConnections -or $SyncCapabilities -or $RunE2E)) {
    Write-Host @"
Usage:
  .\scripts\sandbox-phase2.ps1 -ConfigureProviders -TestConnections
  .\scripts\sandbox-phase2.ps1 -SyncCapabilities
  .\scripts\sandbox-phase2.ps1 -RunE2E
  .\scripts\sandbox-phase2.ps1 -All

Load credentials first from deploy/sandbox.env.local (never commit).
"@
    exit 2
}

Write-Step "Security check"
Test-SecurityCheck

$token = Get-AdminToken

if ($ConfigureProviders) {
    Write-Step "Configure Cashramp (if env vars set)"
    $cashramp = @{}
    foreach ($key in @("CASHRAMP_API_URL","CASHRAMP_PUBLIC_KEY","CASHRAMP_SECRET_KEY","CASHRAMP_WEBHOOK_SECRET")) {
        $val = [Environment]::GetEnvironmentVariable($key)
        if (-not [string]::IsNullOrWhiteSpace($val)) { $cashramp[$key] = $val }
    }
    $cashramp["CASHRAMP_ENVIRONMENT"] = "production"
    if ($cashramp.Count -gt 0) {
        Set-ProviderCredentials -Token $token -Provider "cashramp" -Values $cashramp
        Write-Host "Cashramp credentials saved (encrypted server-side)"
    } else {
        Write-Host "Skip Cashramp configure — no CASHRAMP_* env vars"
    }

    Write-Step "Configure Sumsub (if env vars set)"
    $sumsub = @{}
    foreach ($key in @("SUMSUB_BASE_URL","SUMSUB_APP_TOKEN","SUMSUB_SECRET_KEY","SUMSUB_WEBHOOK_SECRET","SUMSUB_LEVEL_NAME")) {
        $val = [Environment]::GetEnvironmentVariable($key)
        if (-not [string]::IsNullOrWhiteSpace($val)) { $sumsub[$key] = $val }
    }
    if ($sumsub.Count -gt 0) {
        Set-ProviderCredentials -Token $token -Provider "sumsub" -Values $sumsub
        Write-Host "Sumsub credentials saved (encrypted server-side)"
    } else {
        Write-Host "Skip Sumsub configure — no SUMSUB_* env vars"
    }
}

if ($TestConnections) {
    Write-Step "Test provider connections"
    Test-ProviderConnection -Token $token -Provider "cashramp"
    Test-ProviderConnection -Token $token -Provider "sumsub"
}

if ($SyncCapabilities) {
    Write-Step "Sync Cashramp capabilities"
    $headers = @{ Authorization = "Bearer $token" }
    $json = Invoke-AmotApi -Method POST -Path "/admin/capabilities/sync" -Headers $headers -Body @{}
    if (-not $json.success) { throw "Capability sync failed" }
    Write-Host "Capability sync OK"
}

if ($RunE2E) {
    Write-Step "E2E sandbox flow (register → customer → KYC start)"
    $suffix = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
    $phone = "+2376" + (Get-Random -Minimum 10000000 -Maximum 99999999)
    $reg = Invoke-AmotApi -Method POST -Path "/auth/register" -Body @{
        first_name = "Sandbox"
        last_name = "User$suffix"
        phone = $phone
        password = "SandboxPass!" + $suffix
        country_code = "CM"
    }
    if (-not $reg.success) { throw "Register failed" }
    $userToken = $reg.data.token
    $headers = @{ Authorization = "Bearer $userToken" }

    $c1 = Invoke-AmotApi -Method POST -Path "/onboarding/cashramp" -Headers $headers -Body @{}
    $c2 = Invoke-AmotApi -Method POST -Path "/onboarding/cashramp" -Headers $headers -Body @{}
    if ($c1.data.cashramp_customer_id -ne $c2.data.cashramp_customer_id) {
        throw "Cashramp customer idempotency failed"
    }
    Write-Host "Cashramp customer: $($c1.data.cashramp_customer_id) (idempotent OK)"

    $kyc = Invoke-AmotApi -Method POST -Path "/kyc/start" -Headers $headers -Body @{}
    Write-Host "KYC start status: $($kyc.data.status)"
    Write-Host "Complete Sumsub sandbox verification + webhooks, then re-run with quote/transfer steps."
    Write-Host "See docs/SANDBOX_E2E.md for quote and transfer payloads."
}

Write-Host ""
Write-Host "PHASE 2 SCRIPT COMPLETE"
