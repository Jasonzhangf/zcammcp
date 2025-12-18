param(
    [string]$UvcBase = 'http://127.0.0.1:17988',
    [string]$CameraStateHost = '127.0.0.1',
    [int]$CameraStatePort = 6292
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$cliRoot = Join-Path $repoRoot 'cli'
$nodeBin = (Get-Command node -ErrorAction Stop).Source
$refreshUri = "http://${CameraStateHost}:${CameraStatePort}/refresh"
$healthUri = "http://${CameraStateHost}:${CameraStatePort}/health"

try {
    Invoke-RestMethod -Method Get -Uri $healthUri | Out-Null
} catch {
    throw "camera-state service unavailable at $healthUri. Start service before running this script."
}

function Invoke-UvcSetCommand {
    param(
        [Parameter(Mandatory = $true)]
        [hashtable]$TestCase
    )

    $args = @('src/index.js', 'uvc', 'set', $TestCase.Key, '--value', [string]$TestCase.Value, '--json')
    if ($TestCase.ContainsKey('Auto')) {
        $autoValue = if ($TestCase.Auto) { 'true' } else { 'false' }
        $args += @('--auto', $autoValue)
    }

    Push-Location $cliRoot
    try {
        $previousBase = $env:ZCAM_UVC_BASE
        $env:ZCAM_UVC_BASE = $UvcBase
        $output = & $nodeBin @args 2>&1
        $exitCode = $LASTEXITCODE
        $env:ZCAM_UVC_BASE = $previousBase
    } finally {
        Pop-Location
    }

    if ($exitCode -ne 0) {
        throw "uvc set $($TestCase.Key) failed.`n$output"
    }
}

function Invoke-CameraStateRefresh {
    param(
        [string[]]$Keys
    )

    $body = if ($Keys -and $Keys.Count -gt 0) {
        @{ keys = $Keys }
    } else {
        @{}
    }
    $json = $body | ConvertTo-Json -Depth 4

    return Invoke-RestMethod -Method Post -Uri $refreshUri -Body $json -ContentType 'application/json'
}

function Compare-Value {
    param(
        [double]$Expected,
        $Actual,
        [double]$Tolerance = 0
    )

    if ($null -eq $Actual) {
        return $false
    }

    $actualNumber = [double]$Actual
    $delta = [math]::Abs($actualNumber - $Expected)
    return $delta -le $Tolerance
}

$testCases = @(
    @{ Name = 'Pan'; Key = 'pan'; Value = 100; Tolerance = 5 },
    @{ Name = 'Tilt'; Key = 'tilt'; Value = 500; Tolerance = 5 },
    @{ Name = 'Zoom'; Key = 'zoom'; Value = 10000; Tolerance = 20 },
    @{ Name = 'Focus'; Key = 'focus'; Value = 600; Tolerance = 10 },
    @{ Name = 'Exposure'; Key = 'exposure'; Value = -6; Auto = $false; Tolerance = 0 },
    @{ Name = 'Gain'; Key = 'gain'; Value = 20; Tolerance = 2 },
    @{ Name = 'WhiteBalance'; Key = 'whitebalance'; Value = 5200; Auto = $false; Tolerance = 150 },
    @{ Name = 'Brightness'; Key = 'brightness'; Value = 55; Tolerance = 2 },
    @{ Name = 'Contrast'; Key = 'contrast'; Value = 60; Tolerance = 2 },
    @{ Name = 'Saturation'; Key = 'saturation'; Value = 70; Tolerance = 2 }
)

$results = @()

foreach ($case in $testCases) {
    Write-Host "-> uvc set $($case.Key) $($case.Value)" -ForegroundColor Cyan
    Invoke-UvcSetCommand -TestCase $case
    Start-Sleep -Milliseconds 200
    $payload = Invoke-CameraStateRefresh -Keys @($case.Key)
    $valueEntry = $payload.state.values.$($case.Key)
    $actualValue = $valueEntry.value
    $ok = Compare-Value -Expected ([double]$case.Value) -Actual $actualValue -Tolerance ([double]$case.Tolerance)
    $results += [pscustomobject]@{
        Name = $case.Name
        Key = $case.Key
        Expected = $case.Value
        Actual = $actualValue
        Tolerance = $case.Tolerance
        UpdatedAt = $valueEntry.updatedAt
        Success = $ok
    }
    if ($ok) {
        Write-Host "   PASS -> actual $actualValue" -ForegroundColor Green
    } else {
        Write-Host "   FAIL -> actual $actualValue" -ForegroundColor Red
    }
}

$failed = @($results | Where-Object { -not $_.Success })

Write-Host "`n=== Verification Summary ==="
$results | Format-Table Name, Key, Expected, Actual, Success

if ($failed.Count -gt 0) {
    Write-Error "UVC verification failed for $($failed.Count) command(s)."
    exit 1
}

Write-Host "All UVC commands verified successfully."
