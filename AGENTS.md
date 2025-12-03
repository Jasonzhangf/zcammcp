# Repository Guidelines

本仓库分为两大部分：

- **MCP Server (现有 CLI / 相机服务)**：位于根目录 `src/`、`dist/` 等，遵循原有开发流程。
- **Desktop UI 框架与实现**：新建子项目 `ui-desktop/`，用于跨平台桌面相机控制 UI（Electron + TS），并通过唯一 CLI 管道与相机通信。

以下是整体开发规范和模块索引，新的 UI 相关开发请特别关注 `ui-desktop/` 部分。

---

## 1. 顶层模块索引

- `src/` / `dist/`：MCP server 与核心相机服务
  - `src/core/`：CameraManager、ConfigManager 等共享管理类
  - `src/services/`：PTZ/Exposure/Image/Streaming 等业务服务
  - `src/tools/`：MCP tools 注册与工具域逻辑

- `docs/`
  - `AGENTS.md`：本文件，开发者指南入口
  - `ui-design-spec.md`：UI 容器/数据/Operation/持久化设计规范（**UI 开发必读**）
  - 其他 MCP/CLI 设计文档

- `ui-desktop/`：Desktop UI 子项目（新）
  - `src/app/framework/`：UI 框架层（与业务解耦）
    - `state/`：PageStore、CameraState/UiState 定义
    - `operations/`：OperationRegistry 等通用操作分发
    - `transport/`：CliChannel 抽象（唯一 CLI 通道接口 + mock 实现）
    - `persistence/`：PagePersistence / PreferencesPersistence / SnapshotPersistence 等持久化模块
    - `logging/`：IoLogWriter 等日志模块（I/O 日志、replay 脚本）
  - `src/app/pages/`：页面与区域实现（按 data-node-path 对应目录层级）
    - `main/status/StatusCard.tsx` → `zcam.camera.pages.main.status`
    - `main/ptz/PtzCard.tsx` → `zcam.camera.pages.main.ptz`
    - 后续：`imageControl/`、`shortcuts/` 等
  - `docs/`：未来可加入 UI 单独文档（如调试指南）

---

## 2. MCP Server 开发说明（根项目）

### 2.1 Project Structure & Module Organization
- TypeScript sources live in `src/`; shared managers sit under `src/core` and camera services under `src/services`.
- Build artifacts are emitted to `dist/` by `npm run build`; do not edit files there manually.
- Integration scripts (`test-*.js`) exercise the MCP server end-to-end and reside at repo root. Additional design notes are in `docs/`, while runtime settings land in `config/`.

### 2.2 Build, Test, and Development Commands
- `npm install` installs dependencies and TypeScript tooling.
- `npm run dev` starts `ts-node src/index.ts` for live iteration against a local camera.
- `npm run build` compiles TypeScript through `tsc`, producing `dist/index.js` for distribution.
- `npm start` runs the compiled MCP server from `dist/` with production-like settings.
- `npm test` executes the Jest suite with coverage enabled; inspect `coverage/lcov-report/index.html` for details。

### 2.3 Coding Style & Naming Conventions
- Use ES module syntax with `camelCase` functions and `PascalCase` classes; keep filenames `PascalCase` for classes and `camelCase` for utilities.
- Maintain two-space indentation, prefer explicit return types on exported members, and favor async/await over promise chains.
- Log via `console.log` only when the message aids troubleshooting; remove chatty debug output before merging.
- Run `npm run build` before submitting a PR to surface `tsc` warnings locally.

### 2.4 Testing Guidelines
- Write Jest specs next to the code they cover (e.g., `src/services/StreamingService.test.ts`).
- Use real HTTP calls for testing against actual cameras.
- Target meaningful edge cases (network failures, invalid payloads) and keep coverage at or above the current baseline reported by CI.

---

## 3. Desktop UI 框架与实现（`ui-desktop/`）

### 3.1 目录结构（与 DOM/控件层级对应）

```text
ui-desktop/
  package.json
  tsconfig.json
  src/
    app/
      framework/              # 框架层: 不含 ZCAM 业务
        container/            # ContainerNode 等容器元数据
        state/                # PageStore / CameraState / UiState
        operations/           # OperationRegistry
        transport/            # CliChannel 抽象 + mock 实现
        persistence/          # PagePersistence / PreferencesPersistence / SnapshotPersistence
        logging/              # IoLogWriter 等日志模块
      pages/                  # 页面与区域实现, 按路径映射目录
        main/
          index.tsx           # MainPage 入口
          status/StatusCard.tsx      # zcam.camera.pages.main.status
          ptz/PtzCard.tsx            # zcam.camera.pages.main.ptz
          imageControl/...           # 后续
          shortcuts/...              # 后续
```

路径与目录映射规则详见 `docs/ui-design-spec.md` 的 “路径与目录结构映射” 一节。

### 3.2 框架 vs 实现分离

- `framework/`：
  - 定义容器模型 `ContainerNode`（path/kind/role/selectable/...）；
  - 定义页面数据中心 `PageStore`（包含 `cameraState` 和 `uiState`）；
  - 定义 Operation 机制（OperationContext/Payload/Result + OperationRegistry）；
  - 定义统一 CLI 通道接口 `CliChannel`（唯一 CLI 管道）；
  - 定义持久化和日志接口（PagePersistence/PreferencesPersistence/SnapshotPersistence/IoLogWriter）。
  - 不包含任何 ZCAM 业务逻辑。

- `app/pages/` + `app/operations/`（后续创建）：
  - 定义具体的 `CameraState` 子树结构（ptz/exposure/wb/image/...）；
  - 定义 ZCAM 业务 Operation（例如 `ptz.setFocus`、`exposure.setIso`）；
  - 实现 UI 组件（PTZ 卡片、曝光区、白平衡区、快捷栏），通过 `ContainerNode.path/kind` 和 `bindKey/valueKey/operationId` 连接到框架。

### 3.3 UI 开发流程（精简版）

每个 UI 功能块（例如 PTZ 控制、曝光控制、新控件）开发遵循以下流程：

1. **设计容器与路径**：
   - 在 `docs/ui-design-spec.md` 中为新控件确定 `data-node-path` / `data-node-kind`；
   - 确定控件属于哪个页面/分区/分组（与目录结构对应）。

2. **在 `ui-desktop/src/app/pages/...` 建立组件文件**：
   - 路径例如 `src/app/pages/main/ptz/FocusGroup.tsx`；
   - 导出对应的 `ContainerNode` 元数据和 React 组件：
     - `path`、`role`、`kind`、`selectable`；
     - 可选：`bindKey` / `valueKey` / `operationId`。

3. **在 CameraState 中增加字段**（应用层）：
   - 例如为曝光新增 `someParam: { value; view }`；
   - 更新默认状态（初始 CameraState）。

4. **定义 Operation**：
   - 在 `app/operations/xxxOperations.ts` 中新增 OperationDefinition：
     - 处理业务逻辑（数值裁剪 / 显示值映射）；
     - 构造统一的 `CliRequest`（命令 + 参数）；
     - 返回 `newStatePartial`；
   - 将 Operation 注册到 `OperationRegistry`。

5. **接入框架（PageStore + CLI）**：
   - PageStore 初始化时注入 OperationRegistry 和 CliChannel；
   - UI 控件组件通过 `operationId` 调用 `PageStore.runOperation(...)`，不直接访问 CLI。

6. **持久化 & 日志集成**：
   - 在 PageStore 或应用层为关键页面状态调用 `PagePersistence.save/load`；
   - 在 Operation 执行时使用 `IoLogWriter.append` 记录 I/O 日志；
   - 在需要时通过 `SnapshotPersistence` 保存/恢复 snapshot。

7. **测试**：
   - 为新增框架模块编写对应的 `*.test.ts`，例如 `IoLogWriter.ts` -> `IoLogWriter.test.ts`；
   - 为应用层 Operation 编写测试（例如 `ptzOperations.test.ts`），验证状态更新与 CLI 请求；
   - 在 `ui-desktop/` 子项目中运行 `npm run ci`（详见下文）。

### 3.4 UI 子项目构建与测试

在 `ui-desktop/` 下：

- 构建：

```bash
cd ui-desktop
npm install
npm run build
```

- 运行框架测试：

```bash
npm test    # 等价于 node --test dist/app/framework/**/*.test.js
```

- CI 流程（建议在根仓库 CI 配置中调用）：

```bash
npm run ci  # 等价于 npm run build && npm test
```

> 要求：每新增一个 framework 模块或应用 Operation，都必须有对应的测试，并保证 `npm run ci` 通过。

---

## 4. Commit & Pull Request Guidelines

- Follow the succinct, action-led pattern from history (e.g., `Implemented StreamingService functionality`). Use English imperative mood.
- Each commit should bundle one logical unit of work; avoid mixing refactors with feature changes.
- Pull requests must summarize behavior changes, link related issues, and include CLI output or screenshots when UX changes affect operators.

---

## 5. Security & Configuration Tips

- Keep real camera credentials out of Git; prefer local `.env` files that are already ignored.
- Scrub logs and configuration snapshots before sharing, especially IP addresses or access tokens.
- When adding new config knobs, document defaults in `docs/` and ensure sensitive fields never enter `dist/` bundles.
