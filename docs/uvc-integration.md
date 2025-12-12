# UVC Service Integration Plan

The `service/uvcservices` directory contains the Windows-only **ImvtCameraService** which exposes a HTTP + WebSocket API for UVC cameras. This document summarizes the usage instructions in `ImvtCameraService_Reference.md` and outlines how the UI/CLI stack should connect to it.

## Service Overview

- **Binary:** `service/uvcservices/ImvtCameraService.exe`
- **Reference:** `service/uvcservices/ImvtCameraService_Reference.md`
- **Default base URL:** `http://localhost:17988`
- **WebSocket:** `ws://localhost:17988/ws`
- **Operations:** `GET /usbvideoctrl` with query parameters (`key`, `value`, `auto`, `width`, `height`)

To start the service on Windows:

```powershell
cd D:\github\zcammcp\service\uvcservices
Start-Process .\ImvtCameraService.exe
```

Verify the API is up:

```powershell
Invoke-WebRequest "http://localhost:17988/usbvideoctrl?key=brightness"
```

## Supported Properties

The service responds to any of the following property keys (full list from the reference file):

```
exposure, focus, zoom, pan, tilt, iris, roll,
brightness, contrast, saturation, sharpness,
whitebalance, gain, backlightcompensation,
hue, gamma
```

- **Get property info:** `GET /usbvideoctrl?key=brightness`
- **Set property value:** `GET /usbvideoctrl?key=brightness&value=128`
- **Enable auto mode (where supported):** add `&auto=true`

Resolution and frame-rate use dedicated keys:

- `GET /usbvideoctrl?key=resolutions`
- `GET /usbvideoctrl?key=resolutions&width=1920&height=1080`
- `GET /usbvideoctrl?key=framerates`
- `GET /usbvideoctrl?key=framerates&value=30`

System-wide capability dump: `GET /usbvideoctrl?action=query`.

## CLI 模块（已实现）

`cli/src/modules/uvc/index.js` + `cli/src/services/uvc-service.js` 现已提供完整的命令封装，默认对接 `http://127.0.0.1:17988/usbvideoctrl`。常用示例：

```powershell
# 查询服务状态
zcam uvc status --json

# 获取/设置属性
zcam uvc get brightness --json
zcam uvc set exposure --value 120 --json
zcam uvc set exposure --auto --json  # 切换 auto

# 分辨率 / 帧率
zcam uvc list-resolutions --json
zcam uvc set-resolution --width 1920 --height 1080 --json
zcam uvc list-framerates --json
zcam uvc set-framerate 30 --json
```

所有子命令都支持：

- `--base-url <url>` 覆盖默认服务地址；
- `--timeout <ms>` 控制请求超时；
- `--json` 强制 JSON 输出（便于 UI/StateHost 自动解析）。

Jest 单测位于 `cli/tests/unit/uvc-service.test.js`，通过注入 mock `fetch` 验证了查询、设置和超时分支；`npm test` 会自动执行。

## UI Integration Path

1. **OperationRegistry extensions**
   - Add `uvcOperations` under `ui-desktop/src/app/app/operations/` that wrap CLI `uvc` commands (via `PageStore.runOperation`).
   - Map UI controls (e.g., brightness slider) to `operationId = 'uvc.setBrightness'` which produces a CLI payload `{ cmd: 'uvc set', key: 'brightness', value }`.

2. **CLI bridge**
   - `PageStore` already emits `CliRequest`. Extend the CLI runtime to route `uvc.*` operations to the new module.
   - Ensure responses include new state (`value`, `range`) so UI can update.

3. **Service discovery**
   - On UI startup, run `zcam uvc query` → `GET /usbvideoctrl?action=query` to cache ranges/defaults.
   - Store the metadata inside `cameraState.image` (or a new `uvc` branch) to render slider bounds dynamically.

4. **Error handling**
   - CLI module should propagate HTTP status codes and message bodies. UI operations can surface them via toast/log.
   - If the service is down, CLI should return `ok: false` so PageStore can keep UI disabled.

5. **Testing hooks**
   - Reuse the new Windows cycle script to keep Electron alive, then call `zcam uvc get/set` in CI to ensure the HTTP bridge works.
   - Mock server: for non-Windows CI, provide a lightweight Node mock that mimics the `/usbvideoctrl` contract so tests stay cross-platform.

## Next Steps

1. Implement `cli/src/modules/uvc.js` with `get/set/resolution/framerate/query` commands.
2. Create `ui-desktop/src/app/app/operations/uvcOperations.ts` mapping UI controls to CLI payloads.
3. Update `PageStore` initial state to include placeholders for UVC properties.
4. Add UI controls (sliders/toggles) under `controls/image/` or `controls/uvc/` that consume the new operations.
5. Document the workflow in `AGENTS.md` once the integration is complete.
