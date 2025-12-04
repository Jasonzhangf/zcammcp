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
    - `container/`：ContainerNode 等容器元数据
    - `state/`：PageStore / CameraState / UiState
    - `operations/`：OperationRegistry
    - `transport/`：CliChannel 抽象 + mock 实现
    - `persistence/`：PagePersistence / PreferencesPersistence / SnapshotPersistence
    - `logging/`：IoLogWriter 等日志模块
    - `ui/`：PageShell/PageShellConfig/CoreModal/ControlConfig 等通用 UI 能力
  - `src/app/controls/`：**控件层（新推荐）**
    - 独立业务控件模块，每个控件自包含“配置 + UI + PageStore 调用”，彼此隔离
    - 示例：
      - `controls/ptz/ZoomSlider/`、`controls/ptz/FocusGroup/`
      - `controls/image/ShutterSelect/`、`controls/image/IsoSelect/`
  - `src/app/pages/`：页面与区域实现（按 data-node-path 对应目录层级）
    - `main/status/StatusCard.tsx` → `zcam.camera.pages.main.status`
    - `main/ptz/PtzCard.tsx` → `zcam.camera.pages.main.ptz`（装配 PTZ 控件）
    - `main/imageControl/ImageControlCard.tsx` → `zcam.camera.pages.main.imageControl`（装配图像控件）
    - `main/shortcuts/...` 等
  - `docs/`：未来可加入 UI 单独文档（如调试指南）

---

## 2. MCP Server 开发说明（根项目）

（保持原有内容不变）

- TypeScript sources live in `src/`; shared managers sit under `src/core` and camera services under `src/services`.
- ...（略）

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
        ui/                   # PageShell / PageShellConfig / CoreModal / ControlConfig 等
      controls/               # 业务控件层: 可复用且彼此隔离
        ptz/
          ZoomSlider/...
          FocusGroup/...
        image/
          ShutterSelect/...
          IsoSelect/...
      pages/                  # 页面与区域实现, 按路径映射目录
        main/
          index.tsx           # MainPage 入口
          status/StatusCard.tsx      # zcam.camera.pages.main.status
          ptz/PtzCard.tsx            # zcam.camera.pages.main.ptz (装配 PTZ 控件)
          imageControl/ImageControlCard.tsx  # zcam.camera.pages.main.imageControl (装配图像控件)
          shortcuts/...              # 后续
```

路径与目录映射规则详见 `docs/ui-design-spec.md` 的 “路径与目录结构映射” 一节。

### 3.2 UI 设计哲学：框架 / 控件 / 页面三层

**框架层 (`framework/`)**

- 负责通用能力，不包含 ZCAM 具体业务：
  - `PageStore`：管理 `cameraState` / `uiState`，对外提供 `runOperation` 入口。
  - `OperationRegistry`：根据 `operationId` 调用业务 Operation，并返回 `newStatePartial` 与 CLI 请求。
  - `CliChannel`：唯一 CLI 通道抽象，负责请求/响应。
  - `ControlConfig`：描述控件的通用配置模型（不含业务细节）：
    - `SliderControlConfig`：滑块控件配置（范围、读值、显示）。
    - 后续可扩展：`ToggleControlConfig`、`ModalSelectControlConfig` 等。
  - `CoreModal`：通用模态框组件，支持 `anchorRef` 锚点定位（以控件中心对齐），不关心里面具体选项。
  - `PageShell`/`PageShellConfig`：页面外壳，处理浮窗、贴边隐藏、最小化球等“容器行为”，不参与 PTZ/Image 业务。

> 约束：`framework/` 不出现 shutter/ISO/PTZ 等业务字面量，只操作字符串 `nodePath` / `kind` / `operationId` 和 `ViewState`。

**控件层 (`controls/`)**

- 每个控件是一个独立的小模块，具有**自己的目录、配置、UI 实现**，彼此隔离：
  - 典型目录结构：

    ```text
    controls/image/ShutterSelect/
      config.ts            # 控件配置 (nodePath/kind/operationId/options/readValue/formatValue)
      ShutterSelect.tsx    # 控件 UI + PageStore 调用, 使用 CoreModal
      ShutterSelect.test.ts (可选)
    ```

- 控件层的职责：
  - 通过 `usePageStore` / `useViewState` 调用框架能力；
  - 读取自身配置（默认 config 可在 `config.ts` 中定义）；
  - 渲染具体 UI（按钮、滑块、模态等）；
  - 通过 `store.runOperation(nodePath, kind, operationId, payload)` 调用业务 Operation；
  - 不直接依赖其它控件模块，不修改 `PageStore` / `OperationRegistry` 行为。

- 示例：
  - `controls/image/ShutterSelect/`：
    - 使用 `CoreModal` + `anchorRef`，实现以按钮中心为锚点的快门选择模态；
    - 通过配置的 `operationId = 'exposure.setShutter'` 调用 `exposureOperations`。
  - `controls/image/IsoSelect/`：
    - 同样使用 `CoreModal`，提供 ISO 选项；
  - `controls/ptz/ZoomSlider/`：
    - 使用 `SliderControlConfig` + `SliderControl` 渲染 Zoom 滑块；
    - 通过配置的 `operationId = 'ptz.setZoom'` 调用 PTZ Operation。

> 约束：每个控件只关心自己的 config + UI，不修改其它控件或公共控件接口，避免联动破坏。

**页面层 (`pages/`)**

- 页面负责布局与装配，不写业务逻辑：
  - 定义页面级容器结构 (`MainPage`, `PtzCard`, `ImageControlCard`)，并通过 `ContainerNode.path/kind` 标记 DOM；
  - 在合适的位置挂载控件模块：
    - 例如 `ImageControlCard` 中只负责摆放 `ShutterSelect` / `IsoSelect` / 图像调节滑块；
    - PTZ 区域的 `PtzCard` 中摆放 `ZoomSlider` / `FocusGroup` 等控件。
  - 页面不直接调用 `runOperation`，不关心具体 CLI 命令字符串，只依赖控件模块。

- 示例布局（图像卡片中快门/ISO 并排）：

  ```tsx
  <div
    className="zcam-field-row zcam-field-row-dual"
    data-path="zcam.camera.pages.main.exposure.shutterIso"
  >
    <label>快门 / ISO</label>  {/* 如不需要可移除 */}
    <div className="zcam-field-dual-buttons">
      <ShutterSelect />
      <IsoSelect />
    </div>
  </div>
  ```

- 配套样式（示意）：

  ```css
  .zcam-field-row-dual {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .zcam-field-dual-buttons {
    display: flex;
    gap: 6px;
  }

  .zcam-field-dual-buttons .zcam-grid-trigger {
    min-width: 56px;
    max-width: 72px;
  }
  ```

> 约束：`pages/` 层不出现 `store.runOperation(...)` 等逻辑代码，只负责排版和容器标记。

### 3.3 控件设计理念（Shutter / ISO 作为参考模板）

以图像控制中的“快门时间”和“ISO”为例，控件设计遵循以下理念：

1. **控件独立、目录独立**：
   - `controls/image/ShutterSelect/` 与 `controls/image/IsoSelect/` 互不直接依赖；
   - 每个控件有自己的配置文件和 UI 文件，修改一个控件不会影响 PTZ 或其它图像控件。

2. **以控件为锚点的模态交互**：
   - 控件内部使用 `CoreModal` + `anchorRef`，实现“以当前按钮中心”为定位基准的模态框；
   - 点击快门/ISO 按钮：打开模态 → 选中某个选项 → 通过 `runOperation` 写入状态并调用 CLI。

3. **配置驱动而非硬编码**：
   - 每个控件暴露一个 `defaultConfig`，描述：
     - `nodePath` / `kind` / `operationId`
     - `options`（候选值及显示文本）
     - `readValue(view)` / `formatValue(view)`（如何从状态读显示值）
   - 控件 UI 只依赖 config，不内嵌具体数字（如 1/60、800 等），方便将来按机型或 Preset 调整选项。

4. **页面通过控件组合实现“快门/ISO 同行横排 + 无额外标签”**：
   - 页面层只决定布局（是否有行 label、并排还是分行），控件的交互完全由控件模块负责；
   - 图像卡片中快门/ISO 行可以根据设计需要删掉左侧 label，仅保留两颗按钮控件。

### 3.4 UI 开发流程（更新版）

在已有 3.3 流程基础上，增加“控件层”的步骤：

1. **设计容器与路径（不变）**：
   - 在 `docs/ui-design-spec.md` 中为新区域确定 `data-node-path` / `data-node-kind`；
   - 确定区域属于哪个页面/分区/分组（与目录结构对应）。

2. **定义业务 Operation（不变）**：
   - 在 `app/operations/xxxOperations.ts` 中新增 OperationDefinition（如 `exposure.setShutter`）；
   - 处理数值裁剪 / 显示值映射 / 构造 CLI 请求。

3. **在 `controls/` 下创建控件模块（新增）**：
   - 例如 `controls/image/ShutterSelect/`；
   - 在 `config.ts` 中为控件定义 `nodePath` / `kind` / `operationId` / `options` / `readValue`；
   - 在 `ShutterSelect.tsx` 中：
     - 使用 `usePageStore` / `useViewState`；
     - 使用 `CoreModal` + `anchorRef` 实现弹框；
     - 调用 `store.runOperation(...)` 写入状态并触发 CLI。

4. **在 `pages/` 中装配控件（更新）**：
   - 页面组件（如 `ImageControlCard.tsx`）不再直接写快门/ISO 的业务逻辑；
   - 只负责引用 `<ShutterSelect />` / `<IsoSelect />` 并以 CSS/HTML 控制布局（同行/分行、是否显示 label 等）。

5. **测试（不变，鼓励为控件增加单测）**：
   - 框架层测试仍覆盖 PageStore/持久化/日志等；
   - 控件层可为关键控件编写测试，例如验证 config.readValue/formatValue 和 `runOperation` 调用路径；
   - 运行 `npm run ci` 保证框架与控件行为稳定。

---

## 4. Commit & Pull Request Guidelines

（保持原有内容，可视情况补充“控件层变更”说明要求）

---

## 5. Security & Configuration Tips

（保持原有内容不变）
