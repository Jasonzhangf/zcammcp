# camera-state 服务与 UVC 命令验证指南

> 最近更新：2025-12-15

## 1. 服务职责

- `service/camera-state/camera-state.cjs` 负责从 `ImvtCameraService` 读取 `pan/tilt/zoom/focus/exposure/gain/whitebalance/brightness/contrast/saturation` 等 UVC 属性，并缓存为 HTTP 服务（默认 `http://127.0.0.1:6292`）。
- 新默认行为：`ZCAM_CAMERA_STATE_INTERVAL = 0`。即不会后台轮询，只有在收到 `POST /refresh` 或 CLI `camera-state refresh` 时才访问 UVC，避免占满带宽。需要长轮询时自行设置 `ZCAM_CAMERA_STATE_INTERVAL=<ms>`。
- Electron 主进程在启动时只要 `camera-state` 在线，就会定时拉 `/state`，再把快照通过 `window.electronAPI.onCameraState` 推送给 React `PageStore`，控件展示的就是最新缓存。

## 2. 一键命令验证脚本

`scripts/test-uvc-commands.ps1` 会执行以下流程：

1. 假设 `ImvtCameraService.exe` 与 `camera-state` 均已运行；
2. 逐条执行 `node cli/src/index.js uvc set <key> --value <value> [--auto true|false] --json`；
3. 紧接着调用 `POST http://127.0.0.1:6292/refresh` 指定 key，读取 `state.values.<key>.value`；
4. 对比期望值和实际值（包含容差，用于处理硬件量化/步长），输出 PASS/FAIL；
5. 全部通过即退出码 0，否则退出码 1，方便集成到 CI。

默认覆盖的 key：

| Key          | Value | Auto | 说明                       |
| ------------ | ----- | ---- | -------------------------- |
| pan          | 100   |      | 平移                       |
| tilt         | 500   |      | 俯仰                       |
| zoom         | 10000 |      | 伸缩，容差 20（硬件就近值） |
| focus        | 600   |      | 焦距                       |
| exposure     | -6    | false| 曝光（关闭自动）           |
| gain         | 4     |      | 增益                       |
| whitebalance | 5200  | false| 白平衡，容差 150           |
| brightness   | 55    |      | 亮度                       |
| contrast     | 60    |      | 对比度                     |
| saturation   | 70    |      | 饱和度                     |

运行示例：

```powershell
pwsh scripts/test-uvc-commands.ps1 `
  -UvcBase http://127.0.0.1:17988 `
  -CameraStateHost 127.0.0.1 `
  -CameraStatePort 6292
```

如需要调整 key/value，只需编辑脚本中的 `$testCases` 数组。

> 💡 **浏览器模式（无 Electron）**
>
> UI 现在默认通过 `HttpCliChannel` 直接向 `http://127.0.0.1:6291` 的 CLI service 发送命令。需要自定义地址时，可以在页面里设置 `window.__ZCAM_CLI_SERVICE_BASE__ = 'http://your-host:port'`，或在构建阶段注入 `VITE_ZCAM_CLI_SERVICE_BASE`。若 CLI service 开启在非本机，还需相应配置 `ZCAM_CLI_ALLOW_ORIGIN` 以允许 CORS。

## 3. 通过 StateHost 远程发命令（消息驱动）

Electron 主进程在启动时已经向 `StateHost` 注册了 `cli` channel，可直接通过 `POST http://127.0.0.1:6224/command` 驱动与 UI 滑块同一路径的命令（内部仍调用 `runCliBridge` → CLI service → `uvc set`）。

示例：设置 zoom=1200

```powershell
$body = @{
  channel = 'cli'
  action  = 'uvc.set'
  payload = @{
    key = 'zoom'
    value = 1200
  }
} | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:6224/command -Body $body -ContentType 'application/json'
```

示例：读取当前 focus

```powershell
$body = @{
  channel = 'cli'
  action  = 'uvc.get'
  payload = @{
    key = 'focus'
  }
} | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:6224/command -Body $body -ContentType 'application/json'
```

如需直接传递完整 CLI 参数，可使用 `action = 'run'` 并带上 `payload.args = @('uvc','set','zoom','--value','1200')`，其效果与 UI 滑块完全一致，适合自动化消息驱动测试。

## 4. UI 调试模式（Mock API）

当真实 UVC 服务或 CLI 环境不可用时，可以启用 mock 模式让 UI 独立跑通：

1. 在构建/启动前设置 `VITE_ZCAM_USE_MOCK_API=true`（Vite dev server / 生产打包都生效）；或者在浏览器控制台/预加载脚本中写入 `window.__ZCAM_USE_MOCK_API__ = true` 再刷新。
2. mock 模式下：
   - `createCliChannel` 自动退回 `MockCliChannel`，所有 slider/按钮依旧会更新 PageStore 状态，但不会真正调用 CLI。
   - `startMockCameraState` 会周期性地向 PageStore 注入假数据（pan/tilt/zoom/focus/曝光等），方便观察 UI 动画和联动。
   - 可随时把开关关掉并刷新，恢复到真实 CLI + camera-state 的数据链路。

这样可以在没有硬件或服务的环境里对 UI 做完整调试，再切换到真 API 验证逻辑。

## 5. 推荐调试顺序

1. 启动 UVC 服务与 camera-state。推荐运行 `pwsh scripts/start-ui-with-cli.ps1 -VerifyUvcCommands`，脚本会先清理旧进程、拉起 UVC/camera-state，并自动执行命令验证；如需跳过验证可省略开关。
2. 若不使用 `-VerifyUvcCommands`，可单独运行 `scripts/test-uvc-commands.ps1`，确保命令下发和状态回读 OK。
3. 最后启动 Electron UI。由于 PageStore 订阅了 `camera:state`，PTZ/曝光控件会直接使用 state service 的真实值，形成 UI↔CLI↔服务闭环。
