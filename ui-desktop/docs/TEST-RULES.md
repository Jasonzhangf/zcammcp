# UI Desktop TEST-RULES — CLI / 消息 / UI 测试规则

> 最近更新：2025-12-08

本文件定义 UI Desktop 在新架构下的测试策略与规则：

- **单元测试（unit）**：优先通过 CLI 与纯逻辑模块验证，避免依赖 UI。
- **系统测试（system）**：通过“消息 → CLI → IPC → Electron → UI”的链路驱动回环测试。
- **UI 自测（monkey）**：在 Electron 下通过消息/CLI 随机/策略触发 UI 操作，验证稳定性。

## 1. 单元测试层（Unit）

### 1.1 状态与消息

- `UiSceneStore`：
  - 应在 Node 环境中测试其构造与状态保持：
    - 初始 `windowMode` / `layoutSize` 与构造入参一致；
    - 后续扩展的状态机方法（如有）应在此层测试。

- `WindowCommand` / `applyWindowCommand`：
  - 针对三种命令进行测试：
    - `shrinkToBall`：`windowMode` 由 `'main'` 变为 `'ball'`；
    - `restoreFromBall`：`windowMode` 由 `'ball'` 变为 `'main'`；
    - `toggleSize`：按 `normal → compact → large → normal` 循环；
  - 测试中不依赖 React/Electron，只验证 state 变更逻辑。

### 1.2 Electron IPC

- 主进程 `electron.main.cjs`：
  - 使用 Node/Electron 测试或脚本，验证以下 IPC 行为：
    - `window:shrinkToBall`：调用后主窗口隐藏、ball 窗口出现，且记录的 `lastNormalBounds` 与调用前一致；
    - `window:restoreFromBall`：关闭 ball 窗口并恢复主窗口 bounds；
    - `window:toggleSize`：在三种预定义尺寸之间循环；
    - `window:setBounds`：根据传入 x/y/width/height 设置主窗口位置和大小；
    - `window:sendCommand(cmd)`：正确路由到上述 handler。

- preload `electron.preload.cjs`：
  - 验证 `window.electronAPI` 暴露的方法参数签名与 IPC handler 一致；
  - 验证在无 Electron 环境下（如 JSDOM）不会因 `window.electronAPI` 未定义导致崩溃（UI 侧需 guard）。

### 1.3 CLI 层（后续补充）

> TODO: 当 CLI `ui window` 子命令完成后，补充以下测试规则：

- `zcam ui window shrink`：应发送 `window:shrinkToBall` 命令，退出码 0，错误时退出码非 0；
- `zcam ui window restore`：应发送 `window:restoreFromBall` 命令；
- `zcam ui window toggle-size`：应发送 `window:toggleSize` 命令；
- `zcam ui window set-bounds --x X --y Y --width W --height H`：应发送对应 `window:setBounds` payload；
- `zcam ui window cycle --loop N --timeout T`：循环 shrink/restore 行为，任何阶段失败/超时时退出码非 0。

## 2. 系统测试层（System）

系统测试通过“消息→CLI→IPC→Electron→UI”的方式执行完整回环，目标是不依赖人工点击 UI，即可验证窗口行为。

### 2.1 基本回环（shrink→ball→restore）

1. 前置条件：
   - 启动 Electron 主程序（开发或生产模式均可）。
   - CLI 可用（`zcam` 可执行）。

2. 流程：
   - Step 1：调用 `zcam ui window shrink`：
     - 预期主窗口隐藏，ball 窗口出现；
   - Step 2：等待 ball 挂载（可通过 Electron 日志或未来的状态查询接口检查）；
   - Step 3：调用 `zcam ui window restore`：
     - 预期 ball 窗口关闭，主窗口恢复到原始 bounds；
   - Step 4：等待 ball 卸载（同上）。

3. 失败条件：
   - 任意 CLI 调用返回非 0 退出码；
   - 在指定 timeout 内未观察到 ball 出现/消失。

### 2.2 尺寸循环测试

1. 前置条件同上；
2. 流程：
   - 连续调用 `zcam ui window toggle-size` 三次；
   - 每次调用后通过 Electron 状态（日志或查询 IPC）确认窗口尺寸依次为 `normal` → `compact` → `large` → `normal`；
3. 失败条件：
   - 尺寸未按预期切换；
   - 调用出现错误或 timeout。

### 2.3 边界设置测试

1. 调用 `zcam ui window set-bounds --x 100 --y 100 --width 800 --height 600`；
2. 通过 Electron 状态接口（或调试日志）确认窗口位置和尺寸与参数一致；
3. 在不同平台/多显示器环境下重复测试，确保逻辑健壮性。

> Windows 平台可以运行 `windows/tests/Invoke-UiCycleTest.ps1`，它会自动构建 `ui-desktop`、启动 `npm run electron` 并执行 `zcam ui window cycle`。示例：`cd D:\github\zcammcp\windows\tests; pwsh .\Invoke-UiCycleTest.ps1 -Loop 3 -Timeout 7000`

状态反馈说明：所有窗口/CLI 状态都通过 `StateHost` (`http://127.0.0.1:${ZCAM_STATE_PORT||6224}`) 维护，`zcam ui window ...` 命令会读取 `/state` 并在构建结果中断言 `state.window` 是否符合预期。

## 3. UI 自测（Monkey）

UI 自测不通过 CLI 直接控制窗口，而是从 UI 交互路径出发，仍然遵循“消息优先”的思想：

1. 启动 Electron + UI；
2. 编写 monkey 脚本（可以是一个独立 Node 程序或浏览器脚本）执行如下操作：
   - 随机/按策略点击右上角球按钮（`WindowControls`）；
   - 随机/按策略点击尺寸按钮；
   - 在合理的时间间隔内重复上述操作若干轮；
3. 同时监控：
   - Electron 进程不崩溃；
   - 窗口始终可见（或按照预期在主窗/ball 窗口之间切换）；
   - 不出现异常日志（如未处理异常、IPC 错误）。

> UI monkey 自测的核心目标是发现 UI 层与消息/IPC 层在高频操作下的边界情况，而不是验证具体业务逻辑。

## 4. 进度标记（截至当前）

- [x] 清理 DevChannel / DevSocket 旧实现，移除 BaseControl Dev 报告连接；
- [x] 引入 UiSceneStore 与 WindowCommand，并完成基础单元测试；
- [x] 完成场景化布局（MainScene/BallScene + PageShell + LayoutConfig），可运行的最小 UI；
- [x] Electron 主进程支持 shrink/restore/toggle-size/setBounds 和 sendWindowCommand；
- [ ] CLI `ui window` 子命令：shrink/restore/toggle-size/set-bounds/cycle；
- [ ] 消息驱动系统测试脚本：通过 CLI 自动执行窗口回环；
- [ ] UI monkey 自测脚本：通过消息/CLI 驱动 UI 控件。
