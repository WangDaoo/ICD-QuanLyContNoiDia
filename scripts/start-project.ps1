param(
    [ValidateSet('Audit', 'Local')][string]$Mode = 'Audit',
    [switch]$Check,
    [switch]$NoBrowser,
    [ValidateSet('mysql', 'api', 'web', 'mobile')][string]$Service,
    [string]$MysqlExecutable = 'C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld.exe'
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$auditRun = '2026-10-03-improvement-02'
$mysqlDirectory = Join-Path $env:LOCALAPPDATA 'icd-management\mysql-ux-audit-20261003'
$logDirectory = Join-Path $projectRoot 'logs\launcher'
$apiPort = if ($Mode -eq 'Audit') { 3001 } else { 3000 }
$webPort = if ($Mode -eq 'Audit') { 5174 } else { 5173 }
$apiBaseUrl = "http://127.0.0.1:$apiPort/api"
$webUrl = "http://127.0.0.1:$webPort/"
$mobileUrl = 'http://127.0.0.1:8081/'

function Find-Listener([int]$Port) {
    Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue |
        Select-Object -First 1
}

function Assert-Owner([string]$Name, [int]$Port) {
    $listener = Find-Listener $Port
    if (-not $listener) { return $false }
    $process = Get-CimInstance Win32_Process -Filter "ProcessId=$($listener.OwningProcess)"
    $command = [string]$process.CommandLine
    $expectedRoot = if ($Name -eq 'mysql') { $mysqlDirectory } else { $projectRoot }
    if ($command.IndexOf($expectedRoot, [StringComparison]::OrdinalIgnoreCase) -lt 0) {
        throw "Port $Port belongs to another runtime. Close it manually or use the matching mode; no process was stopped."
    }
    $marker = switch ($Name) {
        'mysql' { 'mysqld' }
        'api' { if ($Mode -eq 'Audit') { 'ui-audit-server.e2e-spec' } else { 'dist/main.js' } }
        'web' { 'vite' }
        'mobile' { 'expo' }
    }
    if ($command -notmatch [regex]::Escape($marker)) {
        throw "Port $Port is not the expected ICD $Name service."
    }
    # Mobile shares one port across environments: never silently reuse another API target.
    if ($Name -eq 'mobile') {
        $receiptPath = Join-Path $logDirectory 'mobile-target.json'
        if (Test-Path -LiteralPath $receiptPath) {
            $receipt = Get-Content -LiteralPath $receiptPath -Raw | ConvertFrom-Json
            if ($receipt.pid -ne $listener.OwningProcess -or $receipt.apiBaseUrl -ne $apiBaseUrl) {
                throw 'Expo Web 8081 uses another or unrecorded API target. Close its terminal before switching environments.'
            }
        } else {
            throw 'Expo Web 8081 has no launcher target receipt. Close its terminal and run this BAT again; the launcher will configure the correct API.'
        }
    }
    Write-Host "[REUSE] $Name on $Port (PID $($listener.OwningProcess))"
    return $true
}

function Wait-Port([int]$Port, [int]$Timeout = 300) {
    $deadline = (Get-Date).AddSeconds($Timeout)
    do {
        if (Find-Listener $Port) { return }
        if ((Get-Date) -ge $deadline) { throw "Port $Port did not start. Read $logDirectory." }
        Start-Sleep -Seconds 1
    } while ($true)
}

function Start-ServiceWorker([string]$Name, [int]$Port) {
    if (Assert-Owner $Name $Port) { return }
    if ($Check) { Write-Host "[PLAN] Start $Name on $Port"; return }
    New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
    $arguments = '-NoLogo -NoProfile -File "' + $PSCommandPath + '" -Mode ' + $Mode +
        ' -Service ' + $Name + ' -MysqlExecutable "' + $MysqlExecutable + '"'
    $worker = Start-Process -FilePath (Get-Command powershell.exe).Source -ArgumentList $arguments `
        -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru `
        -RedirectStandardOutput (Join-Path $logDirectory "$Mode-$Name.stdout.log") `
        -RedirectStandardError (Join-Path $logDirectory "$Mode-$Name.stderr.log")
    Write-Host "[START] $Name (worker PID $($worker.Id)); waiting for port $Port..."
    Wait-Port $Port
    if (-not (Assert-Owner $Name $Port)) { throw "$Name listener vanished." }
}

try {
    Set-Location -LiteralPath $projectRoot
    foreach ($command in @('node.exe', 'pnpm.cmd')) { Get-Command $command -ErrorAction Stop | Out-Null }
    foreach ($path in @('apps\api\node_modules', 'apps\web\node_modules', 'apps\mobile\node_modules')) {
        if (-not (Test-Path -LiteralPath (Join-Path $projectRoot $path))) {
            throw 'Dependencies are missing. Run pnpm install in icd-management, then rerun the BAT.'
        }
    }

    if ($Service) {
        switch ($Service) {
            'mysql' {
                & $MysqlExecutable --no-defaults "--datadir=$mysqlDirectory" --port=3308 --bind-address=127.0.0.1 --mysqlx=OFF --console
            }
            'api' {
                if ($Mode -ne 'Audit') { throw 'The API worker is for Audit mode only. Local uses start-local-runtime.ps1.' }
                & node.exe audit/tools/audit-command.mjs serve
            }
            'web' {
                $env:VITE_API_URL = $apiBaseUrl
                & pnpm.cmd --filter '@icd/web' dev --host 127.0.0.1 --port $webPort --strictPort
            }
            'mobile' {
                $env:EXPO_PUBLIC_API_BASE_URL = $apiBaseUrl
                & pnpm.cmd --filter '@icd/mobile' web
            }
        }
        exit $LASTEXITCODE
    }

    Write-Host "ICD startup mode: $Mode"
    # Check frontend conflicts before starting a database/API or switching environments.
    foreach ($entry in @(@('web', $webPort), @('mobile', 8081))) {
        if (Find-Listener $entry[1]) { Assert-Owner $entry[0] $entry[1] | Out-Null }
    }
    if ($Mode -eq 'Audit') {
        if (-not (Test-Path -LiteralPath (Join-Path $projectRoot "audit\runs\$auditRun\.env.local"))) {
            throw 'Audit environment is missing. This launcher does not create or seed a database.'
        }
        if (-not (Test-Path -LiteralPath $MysqlExecutable) -or -not (Test-Path -LiteralPath (Join-Path $mysqlDirectory 'mysql'))) {
            throw 'Initialized audit MySQL data or mysqld.exe is missing. Database initialization is not performed automatically.'
        }
        Start-ServiceWorker 'mysql' 3308
        if (-not $Check -or (Find-Listener 3308)) {
            & node.exe --input-type=module -e "const a=await import('./audit/tools/audit-api-client.mjs'); const r=await import('node:module'); const q=r.createRequire(new URL('./apps/api/package.json',import.meta.url)); const c=await q('mariadb').createConnection({host:a.env.MYSQL_HOST,port:Number(a.env.MYSQL_PORT),user:a.env.MYSQL_USER,password:a.env.MYSQL_PASSWORD,database:a.env.MYSQL_DATABASE}); try {const rows=await c.query('SELECT DATABASE() AS databaseName'); const t=await import('./audit/tools/audit-target.mjs'); t.assertAuditTarget(a.env,rows[0].databaseName); console.log('[PASS] Exact isolated database verified');} finally {await c.end();}"
            if ($LASTEXITCODE -ne 0) { throw 'Audit database guard failed.' }
        }
        Start-ServiceWorker 'api' $apiPort
    } elseif (-not $Check) {
        & (Join-Path $PSScriptRoot 'start-local-runtime.ps1') -MysqlExecutable $MysqlExecutable
    } else {
        if (-not (Test-Path -LiteralPath (Join-Path $projectRoot '.env'))) { throw 'Local .env is missing.' }
        Write-Host '[PLAN] Use existing start-local-runtime.ps1: MySQL 3307, API 3000; no reset/seed.'
    }

    if (-not $Check -or (Find-Listener $apiPort)) {
        $deadline = (Get-Date).AddSeconds(120)
        do {
            try {
                $ready = Invoke-WebRequest -UseBasicParsing -Uri "$apiBaseUrl/health/ready" -TimeoutSec 3
                if ($ready.StatusCode -eq 200) { break }
            } catch {
                if ($Check -or (Get-Date) -ge $deadline) { throw 'API readiness failed. Frontends were not started.' }
            }
            Start-Sleep -Seconds 1
        } while ($true)
        Write-Host "[READY] $apiBaseUrl"
    }
    Start-ServiceWorker 'web' $webPort
    if (-not (Find-Listener 8081) -and -not $Check) {
        # The receipt is written after Metro binds, using the actual listener PID.
        New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
        $arguments = '-NoLogo -NoProfile -File "' + $PSCommandPath + '" -Mode ' + $Mode + ' -Service mobile'
        Start-Process -FilePath (Get-Command powershell.exe).Source -ArgumentList $arguments `
            -WorkingDirectory $projectRoot -WindowStyle Hidden `
            -RedirectStandardOutput (Join-Path $logDirectory "$Mode-mobile.stdout.log") `
            -RedirectStandardError (Join-Path $logDirectory "$Mode-mobile.stderr.log") | Out-Null
        Wait-Port 8081
        @{ pid = (Find-Listener 8081).OwningProcess; apiBaseUrl = $apiBaseUrl } |
            ConvertTo-Json | Set-Content -LiteralPath (Join-Path $logDirectory 'mobile-target.json') -Encoding UTF8
    }
    Start-ServiceWorker 'mobile' 8081
    Write-Host "Web:    $webUrl"
    Write-Host "Mobile: $mobileUrl (Expo Web)"
    Write-Host "API:    $apiBaseUrl"
    Write-Host "Logs:   $logDirectory"
    if (-not $NoBrowser -and -not $Check) {
        Start-Process $webUrl
        Start-Process $mobileUrl
    }
    if ($Check) { Write-Host '[PASS] Preflight only; no services started and no browser opened.' }
} catch {
    Write-Host "[ERROR] $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
