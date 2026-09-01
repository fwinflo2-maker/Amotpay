[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$LocalPath,
    [Parameter(Mandatory = $true)]
    [string]$RemotePath
)

$ErrorActionPreference = "Stop"
$baseUrl = $env:AMOTPAY_DEPLOY_BASE_URL
$authKey = $env:AMOTPAY_DEPLOY_AUTH_KEY
$restAuth = $env:AMOTPAY_DEPLOY_REST_AUTH

foreach ($required in @{
    AMOTPAY_DEPLOY_BASE_URL = $baseUrl
    AMOTPAY_DEPLOY_AUTH_KEY = $authKey
    AMOTPAY_DEPLOY_REST_AUTH = $restAuth
}.GetEnumerator()) {
    if ([string]::IsNullOrWhiteSpace($required.Value)) {
        throw "Missing required environment variable: $($required.Key)"
    }
}

if (-not $baseUrl.StartsWith("https://", [StringComparison]::OrdinalIgnoreCase)) {
    throw "AMOTPAY_DEPLOY_BASE_URL must use HTTPS."
}
if (-not (Test-Path -LiteralPath $LocalPath -PathType Leaf)) {
    throw "Upload source does not exist: $LocalPath"
}
if ($RemotePath -match '(^|/)\.\.(/|$)|[?#]') {
    throw "RemotePath contains forbidden path components."
}

$size = (Get-Item $LocalPath).Length
$url = "$($baseUrl.TrimEnd('/'))/$RemotePath" + "?override=true"
$postHeaders = @{
    "X-Auth" = $authKey
    "X-Auth-Rest" = $restAuth
    "Tus-Resumable" = "1.0.0"
    "Upload-Length" = $size.ToString()
    "Upload-Offset" = "0"
}

$post = Invoke-WebRequest -Uri $url -Method Post -Headers $postHeaders -UseBasicParsing

if ($post.StatusCode -ne 201) {
    Write-Error "POST failed for $RemotePath : HTTP $($post.StatusCode)"
    return $false
}

$patchHeaders = @{
    "X-Auth" = $authKey
    "X-Auth-Rest" = $restAuth
    "Tus-Resumable" = "1.0.0"
    "Upload-Offset" = "0"
}
$patch = Invoke-WebRequest -Uri $url -Method Patch -Headers $patchHeaders `
    -ContentType "application/offset+octet-stream" -InFile $LocalPath -UseBasicParsing

if ($patch.StatusCode -ne 204) {
    Write-Error "PATCH failed for $RemotePath : HTTP $($patch.StatusCode)"
    return $false
}

Write-Output "OK $RemotePath"
return $true
