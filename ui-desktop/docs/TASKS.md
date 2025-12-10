# UI Desktop Tasks: 场景化布局 + 自感知 + 无 Dev 通道

> 目标：实现主窗口 / 球窗口 / 多尺寸的统一场景架构，使用轻量消息和自感知机制，不依赖 DevChannel，每个基础设施层都可独立测试。

## 任务 1：状态与消息基础设施

1. 在 `framework/state/` 中引入 `UiSceneStore`，包含 `windowMode` 与 `layoutSize` 状态定义，并提供最小构造函数，后续扩展为状态机。
2. 在 `framework/messages/` 中定义 `WindowCommand` 与 `applyWindowCommand(store, cmd)`，以及 `nextLayoutSize` 等纯函数，确保可以在不依赖 React/Electron 的环境下单独测试。
3. 清理 `PageStore` 中与场景/窗口模式无关的逻辑，使其只关注 `CameraState` 与操作注册表（稍后重构）。

## 任务 2：控件自感知基础设施

1. 调整 `BaseControl`，移除对 Dev 通道的依赖，只保留自感知数据采集（mount / update / unmount、DOMRect、滚动条、交互耗时等）。
2. 定义统一的 `ControlMetrics` 结构，并提供易于测试的访问方式（例如 `getMetrics()` 或专用 hook）。
3. 为至少一个基础控件（如 Slider / Toggle）编写独立测试，验证在交互过程中自感知数据是否按预期变化。

## 任务 3：场景与布局配置

1. 在 `framework/ui/PageShellConfig.ts` 中定义 `SceneConfig` 与 `LayoutConfig`，用配置描述 main / ball 场景中的卡片与控件布局，而不是在页面组件中写死结构。
2. 将 `pages/main` 和 `pages/ball` 重构为 `MainScene` 与 `BallScene` 组件，通过配置驱动布局，只负责组合，不直接访问底层 store 细节。
3. 确保场景配置中为每个控件提供稳定的 `id` / `path`，便于后续测试和可观测数据聚合。

## 任务 4：窗口模式与尺寸切换（无 DevChannel）

1. 在 `framework/ui/WindowControls.tsx` 中实现右上角球图标与尺寸图标：
   - 点击球图标时，调用 `applyWindowCommand(uiSceneStore, 'shrinkToBall')` 或 `'restoreFromBall'`；
   - 点击尺寸图标时，调用 `applyWindowCommand(uiSceneStore, 'toggleSize')`，在 `normal / compact / large` 之间循环。
2. 在 preload 中实现 `window.electronAPI.sendWindowCommand(cmd)`，主进程根据命令调整物理窗口（创建/销毁球窗口、修改尺寸），并在需要时通过 IPC 将最终窗口状态同步给前端。
3. 为前端部分编写测试，使用模拟的 `electronAPI` 验证 `WindowControls` 在不同场景下发送的命令是否正确。

## 任务 5：旧实现清理与目录整理

1. 清理 `src/app` 下所有 `.bak` / `.old` / `.before-*` 文件，保证每个功能只有一个实现（已完成第一轮清理）。
2. 删除不再使用的 Dev Socket / DevChannel 相关代码与脚本，只保留当前的 Electron CJS 入口与 preload 实现。
3. 梳理目录结构：
   - `src/app/app/`：应用入口与上下文（`RootScene`、`contexts`、`createStores`）。
   - `src/app/framework/`：状态、消息、UI 基础设施、持久化、日志等。
   - `src/app/pages/`：场景级页面（`MainScene`、`BallScene` 等）。
   - `src/app/components/`：与业务无关的通用 UI 组件（如 `PageShell`、`Modal`、`CardHost`）。
   - `src/app/controls/`：业务控件（`controls/<domain>/<ControlName>/`）。

## 任务 6：集成验证与文档同步

1. 保留并简化 `headless-cycle.js`，通过 IPC 调用 `shrinkToBall` / `restoreFromBall`，验证 Electron 窗口行为（不依赖 Dev 通道）。
2. 更新 `AGENTS.md`、`ui-desktop/docs/DEV-PLAN.md` 与 `ui-desktop/docs/TEST-RULES.md`：
   - 描述 `UiSceneStore`、`WindowCommand` 以及窗口模式 / 布局尺寸的状态机；
   - 描述控件自感知数据的结构与基本测试规则。
3. 手动验证流程：
   - 启动 UI（开发或生产模式）；
   - 在主窗口中使用右上角球图标缩小为球，确认主窗口与球窗口行为符合预期；
   - 双击球窗口恢复主窗口；
   - 使用尺寸图标切换不同布局，确认卡片/控件布局随尺寸变化而调整。
