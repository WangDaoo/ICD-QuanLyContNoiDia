param(
    [switch]$RestartApi,
    [string]$MysqlExecutable = 'C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld.exe'
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$apiDirectory = Join-Path $projectRoot 'apps\api'
$mysqlRuntimeDirectory = Join-Path $env:LOCALAPPDATA 'icd-management\mysql-local'
$mysqlDataDirectory = Join-Path $mysqlRuntimeDirectory 'data'
$logDirectory = Join-Path $projectRoot 'test-artifacts\2026-10-01-live-integration\backend'
$apiPidPath = Join-Path $logDirectory 'api.pid'

# Khong khoi tao lai, migrate hay seed tu dong de giu nguyen du lieu da co.
if (-not (Test-Path -LiteralPath (Join-Path $mysqlDataDirectory 'mysql'))) {
    throw "Khong tim thay MySQL da khoi tao tai $mysqlDataDirectory. Xem scripts/README.md."
}
if (-not (Test-Path -LiteralPath $MysqlExecutable)) {
    throw "Khong tim thay mysqld.exe tai $MysqlExecutable."
}
$environmentContent = Get-Content -LiteralPath (Join-Path $projectRoot '.env') -Raw
if ($environmentContent -notmatch '(?m)^MYSQL_PORT=3307\s*$') {
    throw 'MYSQL_PORT trong .env phai la 3307 cho MySQL local tach rieng.'
}

New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
$mysqlListener = Get-NetTCPConnection -State Listen -LocalPort 3307 -ErrorAction SilentlyContinue |
    Select-Object -First 1
if (-not $mysqlListener) {
    $mysqlBaseDirectory = Split-Path -Parent (Split-Path -Parent $MysqlExecutable)
    $mysqlArguments = '--no-defaults --basedir="' + $mysqlBaseDirectory +
        '" --datadir="' + $mysqlDataDirectory +
        '" --port=3307 --bind-address=127.0.0.1 --mysqlx=OFF --console'
    Start-Process -FilePath $MysqlExecutable -ArgumentList $mysqlArguments `
        -WorkingDirectory $mysqlRuntimeDirectory -WindowStyle Hidden `
        -RedirectStandardOutput (Join-Path $mysqlRuntimeDirectory 'mysql.stdout.log') `
        -RedirectStandardError (Join-Path $mysqlRuntimeDirectory 'mysql.stderr.log') | Out-Null
    $mysqlDeadline = (Get-Date).AddSeconds(30)
    do {
        Start-Sleep -Milliseconds 500
        $mysqlListener = Get-NetTCPConnection -State Listen -LocalPort 3307 -ErrorAction SilentlyContinue |
            Select-Object -First 1
    } while (-not $mysqlListener -and (Get-Date) -lt $mysqlDeadline)
    if (-not $mysqlListener) {
        throw "MySQL chua mo port 3307. Xem $mysqlRuntimeDirectory\mysql.stderr.log."
    }
}
$mysqlProcess = Get-CimInstance Win32_Process -Filter "ProcessId=$($mysqlListener.OwningProcess)"
if ($mysqlProcess.Name -ne 'mysqld.exe' -or
    -not $mysqlProcess.CommandLine.Contains($mysqlDataDirectory)) {
    throw 'Port 3307 dang duoc mot runtime khac su dung; khong thay the process do.'
}
$mysqlListener.OwningProcess | Set-Content -LiteralPath (Join-Path $mysqlRuntimeDirectory 'mysql.pid')

$apiListener = Get-NetTCPConnection -State Listen -LocalPort 3000 -ErrorAction SilentlyContinue |
    Select-Object -First 1
if ($apiListener) {
    if (-not (Test-Path -LiteralPath $apiPidPath) -or
        [int](Get-Content -LiteralPath $apiPidPath) -ne $apiListener.OwningProcess) {
        throw 'Port 3000 dang duoc mot runtime khac su dung; khong thay the process do.'
    }
}
if (-not $apiListener -or $RestartApi) {
    $pnpmCommand = (Get-Command pnpm.cmd -ErrorAction Stop).Source
    Push-Location $projectRoot
    try {
        & $pnpmCommand --filter @icd/api build
        if ($LASTEXITCODE -ne 0) { throw 'Backend build that bai.' }
    } finally {
        Pop-Location
    }
    if ($apiListener) {
        Stop-Process -Id $apiListener.OwningProcess
    }
    $nodeCommand = (Get-Command node.exe -ErrorAction Stop).Source
    $apiProcess = Start-Process -FilePath $nodeCommand -ArgumentList 'dist/main.js' `
        -WorkingDirectory $apiDirectory -WindowStyle Hidden `
        -RedirectStandardOutput (Join-Path $logDirectory 'api.stdout.log') `
        -RedirectStandardError (Join-Path $logDirectory 'api.stderr.log') -PassThru
    $apiProcess.Id | Set-Content -LiteralPath $apiPidPath
}

$apiDeadline = (Get-Date).AddSeconds(90)
do {
    try {
        $readyResponse = Invoke-WebRequest -Uri 'http://127.0.0.1:3000/api/health/ready' -TimeoutSec 3
        if ($readyResponse.StatusCode -eq 200) { break }
    } catch {
        if ((Get-Date) -ge $apiDeadline) {
            throw "API chua ready. Xem $logDirectory\api.stderr.log."
        }
    }
    Start-Sleep -Milliseconds 500
} while ((Get-Date) -lt $apiDeadline)

Write-Output "MySQL local: 127.0.0.1:3307, PID $($mysqlListener.OwningProcess)"
Write-Output "API ready: http://127.0.0.1:3000/api, PID $(Get-Content -LiteralPath $apiPidPath)"
