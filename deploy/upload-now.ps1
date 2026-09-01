$ErrorActionPreference = "Stop"
$staging = "$PSScriptRoot\staging\amotpay"

& "$PSScriptRoot\prepare-staging.ps1" | Out-Null

$blockedArtifact = '(?i)(^|[\\/])migrations?([\\/]|$)|(^|[\\/])\.(?!htaccess$)|\.(env|sql|zip|7z|rar|tar|gz|tgz|apk|aab|jks|keystore|p12|pfx|pem|key)$|(^|[\\/])[^\\/]*(credential|secret|token|migrat)[^\\/]*$'
$files = Get-ChildItem $staging -Recurse -File
foreach ($f in $files) {
    $rel = $f.FullName.Substring($staging.Length + 1).Replace('\', '/')
    if ($rel -match $blockedArtifact) {
        throw "Blocked deployment artifact: $rel"
    }
    & "$PSScriptRoot\tus-upload.ps1" -LocalPath $f.FullName -RemotePath "amotpay/$rel"
}
Write-Output "All $($files.Count) files uploaded."
