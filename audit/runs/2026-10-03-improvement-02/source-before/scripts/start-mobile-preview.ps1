param([string]$ApiBaseUrl = 'http://127.0.0.1:3000/api')
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$previousApiUrl = $env:EXPO_PUBLIC_API_BASE_URL
Push-Location -LiteralPath $projectRoot
try {
    $env:EXPO_PUBLIC_API_BASE_URL = $ApiBaseUrl
    & pnpm --filter '@icd/mobile' web
    if ($LASTEXITCODE -ne 0) { throw "Expo preview exited with code $LASTEXITCODE" }
} finally {
    $env:EXPO_PUBLIC_API_BASE_URL = $previousApiUrl
    Pop-Location
}
