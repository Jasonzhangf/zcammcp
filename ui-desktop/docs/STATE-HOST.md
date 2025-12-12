# State Host Service

The UI Desktop application now starts an in-process state service as soon as Electron boots. The service exposes an HTTP API (`http://127.0.0.1:${ZCAM_STATE_PORT||6224}`) and acts as the single source of truth for window/UI/CLI/service status.

## Responsibilities

- Maintain a shared state tree:
  ```json
  {
    "window": { "mode": "main", "layoutSize": "normal", "ballVisible": false },
    "ui": { ... },
    "cli": { ... },
    "services": { ... }
  }
  ```
- Accept state pushes from the renderer/UI (`pushState`) and from Electron main (window actions).
- Execute commands published by CLI or automation (`POST /command`), currently supporting:
  - `window: shrinkToBall | restoreFromBall | toggleSize | setBounds`.
- Provide read APIs for tooling/tests (`GET /state`, `GET /state?channel=window`).

## API

### `GET /state[?channel=window]`

Returns the full state payload or the specified channel.

### `POST /state`

Body: `{ "channel": "window", "payload": { ... } }`  
Merges payload into the channel and timestamps it.

Used by:
- Electron main: pushes `window` changes when shrinking/restoring.
- Renderer (`window.electronAPI.pushState`): pushes `ui.layout`, etc.
- CLI: records last command/result under `cli`.

### `POST /command`

Body: `{ "channel": "window", "action": "shrinkToBall", "payload": { ... } }`  
Executes the registered handler and returns `{ ok, result, state }`.

This powers `zcam ui window shrink/restore/toggle-size/set-bounds` and any future automation.

## Renderer Integration

`electron.preload.cjs` exposes `window.electronAPI.pushState(channel, payload)` so React components can report state. `WindowControls.tsx` pushes `mode` and `layoutSize` every time the right-top buttons are used.

## CLI Integration

`cli/src/modules/ui-window.js` now sends commands via `POST /command` and prints the returned state diff. The `cycle` subcommand asserts that `state.window.mode` transitions correctly, enabling headless verification.

## Extending

- Additional channels (e.g., `services.uvc`, `ui.pageStore`, `cli.operations`) should be pushed through the same `/state` endpoint.
- To expose new commands, register an action handler in `electron.main.cjs` (`stateHost.registerHandler('channel', handler)`).
- CI/automation can read from `/state` or stream results by polling until the expected state arrives.
