param(
    [string]$Mode = 'real', # real | mock
    [int]$Timeout = 5000
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$windowsRoot = Split-Path -Parent $scriptRoot
$repoRoot = Split-Path -Parent $windowsRoot
$cliRoot = Join-Path $repoRoot 'cli'
$serviceRoot = Join-Path $repoRoot 'service'
$uvcExe = Join-Path $serviceRoot 'uvcservices\ImvtCameraService.exe'
$nodeBin = (Get-Command node -ErrorAction Stop).Source
$cliEntry = Join-Path $cliRoot 'src\index.js'
$stateHostUri = 'http://127.0.0.1:6224/state'
$uvcPort = 17988

$serviceProcess = $null

function Invoke-Step($msg) {
    Write-Host "[uvc-test] $msg"
}

function Start-UvcService {
    if (-not (Test-Path $uvcExe)) {
        throw "ImvtCameraService.exe not found at $uvcExe"
    }
    Invoke-Step "Starting ImvtCameraService.exe"
    $proc = Start-Process -FilePath $uvcExe -PassThru
    return $proc
}

function Wait-UvcService {
    $timeoutAt = (Get-Date).AddMilliseconds($Timeout)
    do {
        try {
            $res = Invoke-WebRequest -Uri "http://127.0.0.1:$uvcPort/usbvideoctrl?action=query" -TimeoutSec 2 -ErrorAction Stop
            if ($res.StatusCode -eq 200) {
                Invoke-Step "UVC service ready"
                return
            }
        } catch {
            Start-Sleep -Milliseconds 200
        }
    } while ((Get-Date) -lt $timeoutAt)
    throw "UVC service not ready within $Timeout ms"
}

function Stop-UvcService {
    param([System.Diagnostics.Process]$Process)
    if (-not $Process) { return }
    try {
        Invoke-Step "Stopping UVC service pid $($Process.Id)"
        Stop-Process -Id $Process.Id -Force -ErrorAction SilentlyContinue
    } catch {
        Write-Warning "Failed to stop UVC service: $_"
    }
}

function Run-CliCommand([string[]]$cliArgs) {
    Invoke-Step "Running CLI: node src/index.js $($cliArgs -join ' ')"
    Push-Location $cliRoot
    try {
        return & $nodeBin $cliEntry @cliArgs
    } finally {
        Pop-Location
    }
}

function Push-StateHost([string]$command, [string]$stdout, [bool]$ok) {
    try {
        $payload = @{
            channel = 'cli';
            payload = @{
                lastCommand = $command;
                stdout = $stdout;
                ok = $ok;
                updatedAt = (Get-Date).ToUniversalTime().ToString('o');
            }
        } | ConvertTo-Json -Depth 5
        Invoke-WebRequest -Uri 'http://127.0.0.1:6224/state' -Method Post -Body $payload -ContentType 'application/json' | Out-Null
    } catch {
        Write-Warning "Failed to push state host: $_"
    }
}

try {
    $serviceProcess = Start-UvcService
    Wait-UvcService

    $commands = @(
        @('uvc','status','--json'),
        @('uvc','get','brightness','--json'),
        @('uvc','set','brightness','--value','60','--json'),
        @('uvc','get','brightness','--json')
    )

    foreach ($cmdArgs in $commands) {
        $cmdLine = $cmdArgs -join ' '
        try {
            $result = Run-CliCommand $cmdArgs
            Write-Host $result
            Push-StateHost $cmdLine $result $true
        } catch {
            Push-StateHost $cmdLine $_ $false
            throw
        }
    }
} finally {
    Stop-UvcService -Process $serviceProcess
}
