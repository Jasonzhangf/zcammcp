param(
    [int]$CliPort = 6291,
    [int]$StatePort = 6224
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$uiRoot = Join-Path $repoRoot 'ui-desktop'
$cliServiceScript = Join-Path $repoRoot 'service\cli-daemon\cli-service.js'
$nodeBin = (Get-Command node -ErrorAction Stop).Source
$npmCmd = (Get-Command npm.cmd -ErrorAction Stop).Source

function Invoke-Step($msg) {
    Write-Host "[start-ui] $msg"
}

function Start-CliService {
    $existing = Get-NetTCPConnection -LocalPort $CliPort -ErrorAction SilentlyContinue
    if ($existing) {
        Invoke-Step "CLI service already running on port $CliPort"
        return $null
    }
    Invoke-Step "Starting CLI service ($cliServiceScript)"
    $proc = Start-Process -FilePath $nodeBin -ArgumentList $cliServiceScript -WorkingDirectory (Split-Path $cliServiceScript -Parent) -PassThru
    Start-Sleep -Seconds 1
    return $proc
}

function Start-Ui {
    Invoke-Step "Starting Electron UI"
    $env:ZCAM_CLI_SERVICE_PORT = $CliPort
    $env:ZCAM_STATE_PORT = $StatePort
    return Start-Process -FilePath $npmCmd -ArgumentList 'run','electron' -WorkingDirectory $uiRoot -PassThru
}

try {
    $cliProc = Start-CliService
    $uiProc = Start-Ui
    Invoke-Step "CLI service + UI launched. Close Electron window to exit."
    Wait-Process -Id $uiProc.Id
} finally {
    if ($cliProc -and -not $cliProc.HasExited) {
        Invoke-Step "Stopping CLI service"
        Stop-Process -Id $cliProc.Id -Force
    }
}
