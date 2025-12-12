# Windows UI Test Harness

The UI cycle test for Windows mirrors the Linux shell script (`scripts/ui-cicd-test.sh`) but uses PowerShell. All files live under `windows/tests/` so cross‑platform automation can point to a consistent location.

## Directory layout

```
windows/
  tests/
    Invoke-UiCycleTest.ps1   # build ui-desktop, start Electron, run CLI cycle, cleanup
    README.md                # this file
```

## Prerequisites

- PowerShell 7+ (or Windows PowerShell 5.1 with `Test-NetConnection` cmdlet).
- Node.js 20+ with npm available on `PATH`.
- Repository dependencies installed (`npm install`) inside both `ui-desktop/` and `cli/` at least once.

## Running the cycle test

```powershell
cd D:\github\zcammcp\windows\tests
pwsh .\Invoke-UiCycleTest.ps1 -Loop 3 -Timeout 7000 -Port 6224
```
If `pwsh` is not available, use Windows PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File .\Invoke-UiCycleTest.ps1 -Loop 3 -Timeout 7000 -Port 6224
```

Arguments:

- `-Loop`: Number of shrink→ball→restore loops (default `1`).
- `-Timeout`: Timeout per CLI stage in milliseconds (default `5000`). Passed through to `zcam ui window cycle`.
- `-Port`: State host HTTP port (default `6224`). Propagated to both Electron and the CLI through `ZCAM_STATE_PORT`.

Workflow:

1. Builds `ui-desktop` (`npm run build` + `npm run build:web`).
2. Starts `npm run electron` (background) with `ZCAM_STATE_PORT=$Port`.
3. Polls `http://127.0.0.1:$Port/state` until the window channel reports `ok: true`.
4. Runs `npm start -- ui window cycle ...` inside `cli/`.
5. Fetches the final window state for logging.
6. Stops the Electron process even if the CLI command fails.

Notes:

- The helper resolves `npm.cmd` explicitly, so it works even on systems with restrictive PowerShell execution policies.
- The script writes the temporary Electron pid to `ui-desktop/.ui-test-electron.pid` to aid manual cleanup if interrupted.
