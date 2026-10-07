# Run this file manually in PowerShell. The agent must not execute it after a policy rejection.
$ErrorActionPreference = 'Stop'
$nativeAuditRepoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$nativeAuditAdb = Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'
$previousAuditApiBase = $env:EXPO_PUBLIC_API_BASE_URL
$previousAuditLocation = Get-Location
$auditReverseCreated = $false
try {
    if (-not (Test-Path -LiteralPath (Join-Path $nativeAuditRepoRoot 'apps\mobile\package.json'))) {
        throw 'ICD mobile project was not found at the expected path.'
    }
    if (-not (Test-Path -LiteralPath $nativeAuditAdb)) { throw 'Android SDK ADB is missing.' }
    Set-Location -LiteralPath $nativeAuditRepoRoot
    $existingAuditMetro = @(Get-NetTCPConnection -State Listen -LocalPort 8081 -ErrorAction SilentlyContinue)
    if ($existingAuditMetro.Count) { throw 'Port 8081 is occupied. Existing services will not be stopped.' }
    & node --input-type=module -e "import {guardAuditRuntime,closeConnection} from './audit/tools/audit-api-client.mjs'; try{await guardAuditRuntime();console.log('Isolated API3001/database guard PASS');}finally{await closeConnection();}"
    if ($LASTEXITCODE -ne 0) { throw 'Isolated audit database/API guard failed. No application was launched.' }
    $nativeDeviceState = & $nativeAuditAdb -s emulator-5554 get-state
    if ($LASTEXITCODE -ne 0 -or $nativeDeviceState.Trim() -ne 'device') { throw 'emulator-5554 is not connected.' }
    $priorAuditReverse = & $nativeAuditAdb -s emulator-5554 reverse --list
    if (($priorAuditReverse -match 'tcp:8081\s+') -and -not ($priorAuditReverse -match 'tcp:8081\s+tcp:8081')) {
        throw 'ADB port 8081 has a different existing mapping. It will not be overwritten.'
    }
    if (-not ($priorAuditReverse -match 'tcp:8081\s+tcp:8081')) {
        & $nativeAuditAdb -s emulator-5554 reverse tcp:8081 tcp:8081
        if ($LASTEXITCODE -ne 0) { throw 'ADB Metro port forwarding failed.' }
        $auditReverseCreated = $true
    }
    $env:EXPO_PUBLIC_API_BASE_URL = 'http://10.0.2.2:3001/api'
    Write-Host 'Starting ICD Field in Expo Go. Keep this terminal open during testing.'
    Write-Host 'Backend: isolated API3001. Stop with Ctrl+C after testing.'
    & pnpm --filter '@icd/mobile' exec expo start --localhost --port 8081 --android
    if ($LASTEXITCODE -ne 0) { throw "Expo exited with code $LASTEXITCODE. Keep its error text for diagnosis." }
} finally {
    if ($auditReverseCreated) { & $nativeAuditAdb -s emulator-5554 reverse --remove tcp:8081 | Out-Null }
    $env:EXPO_PUBLIC_API_BASE_URL = $previousAuditApiBase
    Set-Location -LiteralPath $previousAuditLocation
}
