param(
    [int]$CliPort = 6291,
    [int]$StatePort = 6224,
    [int]$CameraPort = 6292,
    [int]$UvcPort = 17988,
    [switch]$VerifyUvcCommands
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$uiRoot = Join-Path $repoRoot 'ui-desktop'
$cliServiceScript = Join-Path $repoRoot 'service\cli-daemon\cli-service.cjs'
$cameraServiceScript = Join-Path $repoRoot 'service\camera-state\camera-state.cjs'
$uvcServiceExe = Join-Path $repoRoot 'service\uvcservices\ImvtCameraService.exe'
$nodeBin = (Get-Command node -ErrorAction Stop).Source
$npmCmd = (Get-Command npm.cmd -ErrorAction Stop).Source

$env:ZCAM_CAMERA_STATE_HOST = '127.0.0.1'
$env:ZCAM_CAMERA_STATE_PORT = $CameraPort
$env:ZCAM_CAMERA_STATE_INTERVAL = '0'
$env:ZCAM_UVC_BASE = "http://127.0.0.1:$UvcPort"

$uvcProc = $null
$cameraProc = $null
$cliProc = $null
$uiProc = $null

function Stop-ProcessList($processes, $label) {
    $list = @($processes | Where-Object { $_ })
    if (-not $list -or $list.Count -eq 0) {
        return
    }
    $pids = $list | Select-Object -ExpandProperty ProcessId -Unique
    foreach ($processId in $pids) {
        try {
            Invoke-Step "Stopping $label (PID $processId)"
            Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
        } catch {
            Write-Warning "Failed to stop $label (PID $processId): $_"
        }
    }
}

function Get-ProcessesByCommandFragment($fragment) {
    if (-not $fragment) {
        return @()
    }
    $filter = $fragment.ToLowerInvariant()
    return @(Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
        Where-Object { $_.CommandLine -and $_.CommandLine.ToLowerInvariant().Contains($filter) })
}

function Stop-NodeProcessForScript($scriptPath, $label) {
    $normalized = ($scriptPath -replace '\\','/').ToLowerInvariant()
    $matches = @(Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
        Where-Object {
            $_.CommandLine -and
            ($_.CommandLine.ToLowerInvariant().Contains($normalized))
        })
    Stop-ProcessList $matches $label
}

function Stop-UvcProcess {
    if (-not (Test-Path $uvcServiceExe)) {
        return
    }
    $matches = @(Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
        Where-Object { $_.ExecutablePath -and $_.ExecutablePath -ieq $uvcServiceExe })
    Stop-ProcessList $matches 'UVC service'
}

function Stop-ElectronProcesses {
    $matches = Get-ProcessesByCommandFragment('electron.main.cjs')
    Stop-ProcessList $matches 'Electron UI'
    # npm wrapper process
    $npmMatches = Get-ProcessesByCommandFragment('npm run electron')
    Stop-ProcessList $npmMatches 'npm electron runner'
}

function Stop-ExistingComponents {
    Invoke-Step 'Checking for existing processes'
    Stop-ElectronProcesses
    Stop-NodeProcessForScript $cameraServiceScript 'camera state service'
    Stop-NodeProcessForScript $cliServiceScript 'CLI service'
    Stop-UvcProcess
}

function Invoke-UvcVerification {
    $verifyScript = Join-Path $repoRoot 'scripts\test-uvc-commands.ps1'
    if (-not (Test-Path $verifyScript)) {
        throw "Verification script not found at $verifyScript"
    }
    Invoke-Step 'Running UVC verification script'
    Push-Location $repoRoot
    try {
        & powershell -ExecutionPolicy Bypass -File $verifyScript
        $exit = $LASTEXITCODE
    } finally {
        Pop-Location
    }
    if ($exit -ne 0) {
        throw "UVC verification script exited with code $exit"
    }
}

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

function Start-UvcService {
    $existing = Get-NetTCPConnection -LocalPort $UvcPort -ErrorAction SilentlyContinue
    if ($existing) {
        Invoke-Step "UVC service already listening on port $UvcPort"
        return $null
    }
    if (-not (Test-Path $uvcServiceExe)) {
        Invoke-Step "ImvtCameraService not found at $uvcServiceExe"
        return $null
    }
    Invoke-Step "Starting UVC service ($uvcServiceExe)"
    $proc = Start-Process -FilePath $uvcServiceExe -WorkingDirectory (Split-Path $uvcServiceExe -Parent) -PassThru
    Start-Sleep -Seconds 2
    return $proc
}

function Start-CameraStateService {
    $existing = Get-NetTCPConnection -LocalPort $CameraPort -ErrorAction SilentlyContinue
    if ($existing) {
        Invoke-Step "Camera state service already running on port $CameraPort"
        return $null
    }
    if (-not (Test-Path $cameraServiceScript)) {
        Invoke-Step "Camera state script not found: $cameraServiceScript"
        return $null
    }
    Invoke-Step "Starting camera state service ($cameraServiceScript)"
    $proc = Start-Process -FilePath $nodeBin -ArgumentList $cameraServiceScript -WorkingDirectory (Split-Path $cameraServiceScript -Parent) -PassThru
    Start-Sleep -Seconds 1
    if ($proc) {
        Invoke-Step "Camera state service running (PID $($proc.Id)). Use Stop-Process to end it manually."
    }
    return $proc
}

function Start-Ui {
    Invoke-Step "Starting Electron UI"
    $env:ZCAM_CLI_SERVICE_PORT = $CliPort
    $env:ZCAM_STATE_PORT = $StatePort
    $env:ZCAM_CAMERA_STATE_PORT = $CameraPort
    return Start-Process -FilePath $npmCmd -ArgumentList 'run','electron' -WorkingDirectory $uiRoot -PassThru
}

try {
    Stop-ExistingComponents
    $uvcProc = Start-UvcService
    $cameraProc = Start-CameraStateService
    if ($VerifyUvcCommands) {
        Invoke-UvcVerification
    }
    $cliProc = Start-CliService
    $uiProc = Start-Ui
    Invoke-Step "CLI service + UI launched. Close Electron window to exit."
    Wait-Process -Id $uiProc.Id
} finally {
    if ($cliProc -and -not $cliProc.HasExited) {
        Invoke-Step "Stopping CLI service"
        Stop-Process -Id $cliProc.Id -Force
    }
    if ($cameraProc -and -not $cameraProc.HasExited) {
        Invoke-Step "Stopping camera state service"
        Stop-Process -Id $cameraProc.Id -Force
    }
    if ($uvcProc -and -not $uvcProc.HasExited) {
        Invoke-Step "Stopping UVC service"
        Stop-Process -Id $uvcProc.Id -Force
    }
}
