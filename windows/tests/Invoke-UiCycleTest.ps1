param(
    [int]$Loop = 1,
    [int]$Timeout = 5000,
    [int]$Port = 6224
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$windowsRoot = Split-Path -Parent $scriptRoot
$repoRoot = Split-Path -Parent $windowsRoot
$uiDesktop = Join-Path $repoRoot 'ui-desktop'
$cliRoot = Join-Path $repoRoot 'cli'
$pidFile = Join-Path $uiDesktop '.ui-test-electron.pid'
$npmCmd = (Get-Command npm.cmd -ErrorAction Stop).Source
$stateUri = "http://127.0.0.1:$Port/state?channel=window"
$baselineElectronPids = @(
    Get-Process -Name electron -ErrorAction SilentlyContinue | ForEach-Object { $_.Id }
)

function Invoke-Step {
    param(
        [string]$Message
    )
    Write-Host "[ui-test] $Message"
}

function Start-ElectronDev {
    Invoke-Step "Building ui-desktop (ts + web)"
    Push-Location $uiDesktop
    try {
        & $npmCmd run build | Out-Null
        & $npmCmd run build:web | Out-Null
    } finally {
        Pop-Location
    }

    Invoke-Step "Starting Electron via npm run electron"
    $process = Start-Process -FilePath $npmCmd -ArgumentList "run","electron" -WorkingDirectory $uiDesktop -PassThru
    $process.Id | Out-File -FilePath $pidFile -Encoding ascii
    return $process
}

function Wait-StateHost {
    Invoke-Step "Waiting for state host on port $Port"
    $maxAttempts = 60
    for ($i = 0; $i -lt $maxAttempts; $i++) {
        try {
            $response = Invoke-RestMethod -Method Get -Uri $stateUri -TimeoutSec 2 -ErrorAction Stop
            if ($response.ok) {
                Invoke-Step "State host ready"
                return
            }
        } catch {
            Start-Sleep -Seconds 1
        }
    }
    throw "State host on port $Port not ready after $maxAttempts seconds"
}

function Stop-ElectronDev {
    param(
        [System.Diagnostics.Process]$Process
    )
    if (-not $Process) { return }
    try {
        if (-not $Process.HasExited) {
            Invoke-Step "Stopping Electron pid $($Process.Id)"
            $Process.CloseMainWindow() | Out-Null
            Start-Sleep -Seconds 1
            if (-not $Process.HasExited) {
                Stop-Process -Id $Process.Id -Force
            }
        }
    } catch {
        Write-Warning "Failed to stop Electron cleanly: $_"
    } finally {
        if (Test-Path $pidFile) {
            Remove-Item $pidFile -Force
        }
    }

    Stop-NewElectronProcesses
}

function Stop-NewElectronProcesses {
    $current = Get-Process -Name electron -ErrorAction SilentlyContinue
    foreach ($proc in $current) {
        if ($baselineElectronPids -contains $proc.Id) {
            continue
        }
        try {
            Invoke-Step "Stopping spawned Electron process $($proc.Id)"
            Stop-Process -Id $proc.Id -Force -ErrorAction Stop
        } catch {
            Write-Warning "Failed to stop Electron pid $($proc.Id): $_"
        }
    }
}

function Ensure-StatePortFree {
    $existing = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    if ($existing) {
        $pids = ($existing | Select-Object -ExpandProperty OwningProcess | Sort-Object -Unique) -join ', '
        throw "TCP port $Port is already in use by PID(s): $pids. Please stop those processes before running the test."
    }
}

function Get-WindowState {
    try {
        return Invoke-RestMethod -Method Get -Uri $stateUri -TimeoutSec 2 -ErrorAction Stop
    } catch {
        Write-Warning "Failed to fetch window state: $_"
        return $null
    }
}

$electronProcess = $null
$previousStatePort = $env:ZCAM_STATE_PORT
try {
    $env:ZCAM_STATE_PORT = $Port
    Ensure-StatePortFree
    $electronProcess = Start-ElectronDev
    Wait-StateHost

    Invoke-Step "Running CLI cycle (loop=$Loop timeout=$Timeout)"
    Push-Location $cliRoot
    try {
        & $npmCmd start -- ui window cycle --loop "$Loop" --timeout "$Timeout"
    } finally {
        Pop-Location
    }

    $windowResponse = Get-WindowState
    if ($windowResponse -and $windowResponse.state) {
        $state = $windowResponse.state
        Invoke-Step ("Final window state => mode={0} layout={1} ball={2}" -f $state.mode, $state.layoutSize, $state.ballVisible)
    }
} finally {
    Stop-ElectronDev -Process $electronProcess
    if ($previousStatePort) {
        $env:ZCAM_STATE_PORT = $previousStatePort
    } else {
        Remove-Item Env:ZCAM_STATE_PORT -ErrorAction SilentlyContinue
    }
}
