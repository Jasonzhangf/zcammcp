# UI Desktop DEV-PLAN — 场景化窗口 + CLI 优先

> 最近更新：2025-12-08

本计划描述当前 UI Desktop 的技术架构重构状态，以及后续围绕“CLI 优先 / 消息驱动 / UI 纯交互”的开发原则。

## 1. 架构概览

当前 UI Desktop 分为四层：

1. **状态层（Stores）**
   - `PageStore`：负责 `CameraState` + `UiState`（选中节点、高亮、旧的 layoutMode 等），与相机操作、持久化、日志相关。
   - `UiSceneStore`：负责窗口模式和布局尺寸：
     - `windowMode`: `'main' | 'ball'`；
     - `layoutSize`: `'normal' | 'compact' | 'large'`；
     - 当前为最小实现，只保存 `state`，后续可扩展状态机方法（例如 `setWindowMode`、`setLayoutSize`）。

2. **消息/命令层（Messages）**
   - `WindowCommand`：窗口相关命令枚举：`'shrinkToBall' | 'restoreFromBall' | 'toggleSize'`。
   - `applyWindowCommand(store, cmd)`：纯函数，只修改 `UiSceneStore.state`，不直接依赖 Electron 或 React：
     - `shrinkToBall` → `windowMode = 'ball'`；
     - `restoreFromBall` → `windowMode = 'main'`；
     - `toggleSize` → `layoutSize = normal → compact → large → normal`。
   - 这一层可以在 Node/JS 环境下独立跑单元测试（已在 `UiSceneStore.test.ts` / `WindowCommands.test.ts` 中覆盖）。

3. **布局/场景层（Scenes & Layout）**
   - `LayoutConfig.tsx`：统一定义窗口场景与 slot：
     - `SceneConfig`：`{ id: WindowMode; layoutSize: LayoutSize; slots: ControlSlotConfig[] }`；
     - 当前实现：
       - `MainSceneConfig`：`id = 'main'`，`layoutSize = 'normal'`，slots 包含 `StatusCard` + `ShortcutsCard`；
       - `BallSceneConfig`：`id = 'ball'`，`layoutSize = 'compact'`，slots 只包含 `StatusCard`。
   - `MainScene` / `BallScene`：
     - 位于 `pages/main-scene` / `pages/ball-scene`；
     - 只做 `PageShell(sceneConfig)` 的调用，不包含业务逻辑。

4. **UI 交互层（PageShell / WindowControls）**
   - `PageShell`：统一页面框架：
     - 顶部 header（左侧 `Z + 标题`，右侧 `WindowControls`）；
     - 主体区域根据 `scene.slots` 渲染卡片容器，每个 slot 有稳定的 `data-path`（例如 `ui.controls.status`）。
   - `WindowControls`：右上角窗口控制区域：
     - 使用 `useUiSceneStore()` 读取当前 `windowMode` / `layoutSize`；
     - 本地调用 `applyWindowCommand(store, cmd)` 更新前端状态；
     - 如果存在 `window.electronAPI.sendWindowCommand(cmd)`，则发送命令给 Electron 主进程。
   - UI 只做交互和展示，不直接依赖 CLI 或相机业务逻辑。

---

## 2. Electron 窗口行为与 IPC

当前 Electron 主进程实现（`electron.main.cjs`）：

1. **主窗口创建**
   - 使用 `electron-window-state` 记住位置与大小；
   - 开发模式加载 `http://localhost:<VITE_PORT>`，生产模式加载 `dist-web/index.html`；
   - 无边框（`frame: false`），支持拖拽和缩放（由 CSS + Electron 配置共同控制）。

2. **球窗口逻辑**
   - `createBallWindow(bounds)`：
     - 在主窗口 bounds 中心附近创建一个 72x72 的透明圆形窗口；
     - 加载 `assets/ball/ball.html`，双击球窗口会通过 preload 调用 `restoreFromBall`。

3. **IPC 处理**

   - 基础窗口命令：
     - `window:minimize`：主窗口最小化；
     - `window:close`：退出应用；

   - 球窗口切换：
     - `window:shrinkToBall`：
       - 记录当前主窗口 bounds 到 `lastNormalBounds`；
       - 创建 ball 窗口；
       - 隐藏主窗口；
     - `window:restoreFromBall`：
       - 关闭 ball 窗口（如存在）；
       - 恢复主窗口 bounds（如存在 `lastNormalBounds`）；
       - 取消置顶 / 恢复可缩放 / 显示和聚焦主窗口；

   - 窗口尺寸循环：
     - `window:toggleSize`：
       - 读取当前窗口尺寸；
       - 在 `SIZE_MAP` 中的 `normal → compact → large → normal` 三种配置之间循环；
       - 调整主窗口大小并居中。

   - 窗口边界设置：
     - `window:setBounds`：
       - 接收 `{ x, y, width, height }`；
       - 调用 `mainWindow.setBounds(...)` 设置位置和尺寸。

   - 通用命令入口：
     - `window:sendCommand`：接收 `cmd` 字符串（`shrinkToBall` / `restoreFromBall` / `toggleSize` 等），统一路由到对应 handler。

4. **preload 暴露接口**（`electron.preload.cjs`）：
   - `window.electronAPI` 包含：
     - `minimize()` / `close()`；
     - `shrinkToBall()` / `restoreFromBall()`；
     - `toggleSize()`；
     - `setBounds({ x, y, width, height })`；
     - `sendWindowCommand(cmd: string)`：统一发送窗口命令到主进程。

---

## 3. 当前 UI 重构进度

已完成：

1. **DevChannel / DevSocket / BaseControl 旧实现清理**
   - 删除 `DevChannelImpl`、老的 `BaseControl` Dev 上报逻辑，以及所有 `.bak`/`.old` 历史文件；
   - 删除旧的 ball Dev 实现（`BallClient.ts` 等），只保留 HTML ball 窗口。

2. **引入 UiSceneStore + WindowCommands**
   - `UiSceneStore` 定义窗口模式与布局尺寸，并有基础单元测试；
   - `WindowCommand` + `applyWindowCommand`/`nextLayoutSize` 已实现且可在纯 Node 环境下测试。

3. **场景化布局层**
   - 使用 `LayoutConfig.tsx` 定义 `MainSceneConfig` / `BallSceneConfig`；
   - `MainScene` / `BallScene` 只负责引用 `PageShell(sceneConfig)`；
   - `PageShell` 负责 header + WindowControls + 按 slot 渲染卡片。

4. **窗口控制 UI 层**
   - `WindowControls.tsx` 已提供“缩球 / 恢复 / 切尺寸”按钮：
     - 点击按钮 → 更新 `UiSceneStore` → 通过 `electronAPI` 调用 Electron。

5. **Electron 窗口行为**
   - `electron.main.cjs` 与 `electron.preload.cjs` 已完成最小可运行版本：
     - 支持基本窗口生命周期（打开/最小化/关闭）；
     - 支持 `shrinkToBall` / `restoreFromBall` / `toggleSize` / `setBounds`；
     - 支持通用 `sendWindowCommand` 接口，便于 UI/CLI 统一使用。

待完成：

1. **CLI 窗口命令模块（unit test 层）**
   - 在 `cli` 项目中恢复并扩展 `ui` 模块：
     - `zcam ui window shrink` / `restore` / `toggle-size` / `set-bounds` / `cycle`；
     - CLI 命令通过 IPC（或本地 TCP server）把 `{cmd, payload}` 发送给 Electron 主进程，**不依赖 UI**。
   - 为这些 CLI 命令编写单元测试：
     - 使用 Node + mock IPC（或本地测试 server），确保命令参数校验和命令路由正确。

2. **消息驱动的系统测试（system test 层）**
   - 编写一个消息 orchestrator 脚本（例如 `ui-desktop/headless-cycle.js` 或 `cli/scripts/ui-window-cycle.js`）：
     - 接收消息序列（JSON 配置或命令行参数）；
     - 内部调用 CLI：`zcam ui window shrink`、`restore`、`toggle-size`、`set-bounds` 等；
     - 完成 shrink→ball→restore 的回环测试，并在必要时断言窗口位置/大小（需要在 Electron 端返回状态）。

3. **UI monkey 自测（UI 层自感知）**
   - 使用上面的消息/CLI 流程，针对 UI 做 monkey 测试：
     - 随机或按策略触发 `sendWindowCommand`（通过 CLI 或直接调用 preload）；
     - 验证 UI 在长时间运行下不会崩溃，窗口模式和尺寸切换正确；
     - 未来可扩展控件自感知（替代旧的 BaseControl DevReport）。

---

## 4. 开发与提交流程建议

1. **功能开发优先级**：
   - **先实现 CLI 层**：确保所有窗口行为（缩球/恢复/切尺寸/设边界）都有对应 CLI 命令和单元测试；
   - 再实现 **系统测试脚本**：用消息驱动 CLI，形成端到端回环；
   - 最后完善 UI 交互和样式，通过 monkey 测试脚本自测 UI。

2. **提交流程**：
   - 每次改动需保证：
     - `ui-desktop` 内 `npm run build && npm test && npm run build:web` 通过；
     - `cli` 内单元测试（含新加的 ui-window 测试）通过；
   - 提交信息中建议标注：
     - 本次改动是否影响 `UiSceneStore`、`WindowCommand`、Electron IPC 或 CLI；
     - 是否更新了相应文档（AGENTS / DEV-PLAN / TEST-RULES）。

3. **文档同步规则**：
   - 更新窗口行为或命令时：
     - 同步更新 `AGENTS.md` 的“功能与消息系统现状”；
     - 更新 `docs/DEV-PLAN.md` 中的架构和进度说明；
     - 更新 `docs/TEST-RULES.md` 中的测试规则（单元/系统/monkey）。

