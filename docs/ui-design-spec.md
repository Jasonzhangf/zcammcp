# ZCAM Camera Control UI 设计规范（草案）

> 目的：统一 UI 控件/容器的语义、数据流和开发流程，作为后续 Electron/TS 实现和新控件开发的基础文档。

当前主界面 HTML 草稿：`docs/ui-main-draft.html`。本规范描述的是这份 HTML 背后的“语义层”和“数据层”，而不是视觉细节。

---

## 1. 术语与总体设计目标

- **容器（Container）**：UI 中的基本节点，一个 `<div>`、一个按钮、一个卡片都视为容器。控件是有特定角色的容器。
- **控件（Control）**：与用户交互、可读写状态的容器，例如 slider、toggle、按钮等。
- **路径（Path）**：唯一标识一个容器的字符串，形如 `zcam.camera.pages.main.ptz.focus`。
- **种类（Kind）**：按功能分类的“逻辑父亲”，例如 `ptz.*`、`exposure.*`、`whiteBalance.*`。

总体目标：

1. 所有 UI 元素都是容器，且有唯一父容器（a, b）。
2. 容器访问支持绝对路径和相对路径（c）。
3. 容器有 `normal` / `debug` 模式和高亮属性（d）。
4. 显示数据与实际数据严格分离，通过绑定键映射（e）。
5. 一个页面只有一个数据中心，所有写操作通过统一的 Operation 进行，UI 只负责显示（f, g）。
6. CLI 通信只有一条管道，所有容器通过统一协议记录 I/O 和快照（g, h）。
7. 容器有 UI 父亲（布局树）和种类父亲（功能树）两种分组视角（i）。
8. 消息传递与操作支持完整的 replay 机制，可记录 JSON log、回放 debug 和 monkey 操作（j）。

下面按层次设计：HTML 容器规范 → 数据中心与 Operation → CLI 通信与日志 → 分组与 replay → 新控件开发流程。

---

## 1.1 路径与目录结构映射

为了让控件/页面 DOM 结构在代码目录中有清晰的层次映射，我们约定：

- 所有页面路径以 `zcam.camera.pages` 为前缀，例如：
  - `zcam.camera.pages.main` → 主控制页面；
  - 未来可以有 `zcam.camera.pages.settings` 等。

- 对应的 TypeScript 目录结构：

```text
ui-desktop/
  src/
    app/
      pages/
        <page>/                # e.g. main
          index.tsx            # 页面入口
          <section>/           # e.g. status / ptz / imageControl / shortcuts
            <Component>.tsx    # 具体卡片或分组组件
```

### 路径到目录的规则

1. 页面级：
   - 路径：`zcam.camera.pages.<page>`
   - 目录：`src/app/pages/<page>/`，例如：
     - `zcam.camera.pages.main` → `src/app/pages/main/`。

2. 分区/卡片级：
   - 路径：`zcam.camera.pages.main.status` / `...ptz` / `...imageControl` / `...shortcuts`。
   - 目录：
     - `zcam.camera.pages.main.status` → `src/app/pages/main/status/StatusCard.tsx`；
     - `zcam.camera.pages.main.ptz` → `src/app/pages/main/ptz/PtzCard.tsx`；
     - `zcam.camera.pages.main.imageControl` → `src/app/pages/main/imageControl/ImageControlCard.tsx`；
     - `zcam.camera.pages.main.shortcuts` → `src/app/pages/main/shortcuts/ShortcutsCard.tsx`。

3. 分组/子区级：
   - 路径：`zcam.camera.pages.main.ptz.focusGroup` → 子区/分组组件；
   - 组件文件：放在其父目录下，例如：

```text
src/app/pages/main/ptz/FocusGroup.tsx              # zcam.camera.pages.main.ptz.focusGroup
src/app/pages/main/imageControl/ExposureSection.tsx # zcam.camera.pages.main.exposure
src/app/pages/main/imageControl/WhiteBalanceSection.tsx
src/app/pages/main/imageControl/ImageSection.tsx
```

4. 控件级（Slider/Button/Toggle 等）：
   - 视为容器，但通常不单独新建目录，直接定义在所属 Card/Section 文件中；
   - 多次复用的基础控件放在 `src/app/components/` 下，例如：

```text
src/app/components/SliderField.tsx
src/app/components/ToggleSwitch.tsx
src/app/components/GridDropdown.tsx
```

### ContainerNode 与目录的关系

- 每个页面/卡片/分组组件文件（例如 `PtzCard.tsx`、`FocusGroup.tsx`）应导出：
  1. 对应的 `ContainerNode` 元数据（path/kind/role 等）；
  2. 对应的视图组件（React/Vue 组件）。

示例：`src/app/pages/main/ptz/PtzCard.tsx`：

```ts
// 映射路径: zcam.camera.pages.main.ptz
import type { ContainerNode } from '../../framework/container/ContainerNode';

export const ptzCardNode: ContainerNode = {
  path: 'zcam.camera.pages.main.ptz',
  role: 'container',
  kind: 'ptz.card',
  selectable: true,
  children: [], // 由布局树在 app 层组装
};

export function PtzCard() {
  // 具体 UI 渲染逻辑后续从 ui-main-draft.html 迁移
  return null;
}
```

- 主页面布局树（`mainLayoutTree`）在 `src/app/pages/main/mainLayoutTree.ts` 中组装：

```ts
export const mainLayoutTree: ContainerNode = {
  path: 'zcam.camera.pages.main',
  role: 'page',
  kind: 'page.main',
  selectable: false,
  children: [statusCardNode, ptzCardNode, imageControlCardNode, shortcutsCardNode],
};
```

这样容器路径、DOM 结构和目录结构一一对应，方便排查问题和做 replay。

---

## 2. HTML 容器规范

### 2.1 统一的 data-* 属性

每个容器（包括控件和纯布局容器）应携带以下属性（至少部分）：

```html
<div
  data-node-path="zcam.camera.pages.main.ptz.focus"   
  data-node-role="control"                            
  data-node-kind="ptz.focus"                          
  data-selectable="true"                              
  data-debug-mode="normal"                            
  data-highlight="none"                               
  data-bind-key="cameraState.ptz.focus.view"          
  data-value-key="cameraState.ptz.focus.value"        
  data-operation-id="ptz.setFocus"                    
  data-log-io="true"                                  
  data-log-snapshot="true"                            
>
  <!-- 具体 UI 内容 -->
</div>
```

字段说明：

- `data-node-path`（必选）
  - 唯一标识容器的绝对路径，例如 `zcam.camera.pages.main.ptz.focus`。
  - UI 父子关系通过 path 层级推导：父节点为去掉最后一段的路径。

- `data-node-role`
  - 角色枚举：`page` | `container` | `control` | `group`。
  - 示例：
    - 页级容器：`data-node-role="page"`，如 `zcam.camera.pages.main`；
    - PTZ 卡片：`container`；
    - Focus 滑块：`control`；
    - 曝光子区：`group`。

- `data-node-kind`
  - 种类标识，用于“种类父亲”分组，例如：
    - `ptz.position`、`ptz.zoom`、`ptz.focus`；
    - `exposure.shutter`、`exposure.iso`；
    - `whiteBalance.temperature` 等。
  - 用于按功能批量处理（例如：调试时高亮所有曝光相关控件）。

- `data-selectable`
  - `true` | `false`，表示是否可以被选择。
  - 被选择时，可以导出当前容器对应的数据结构（见 3.3 选择导出）。

- `data-debug-mode`
  - `normal` | `debug`，调试工具可根据该值切换额外信息显示（如边框、辅助文本）。

- `data-highlight`
  - `none` | `hover` | `active` | `error` | `replay` …
  - 用 CSS 定义不同高亮状态，replay/monkey 时可动态设置。

- `data-bind-key`（显示数据绑定键）
  - 显示用的“View 数据”绑定键，可以与真实值不同。例如：
    - `cameraState.exposure.shutter.view` → 文本 "1/60"；
    - `cameraState.whiteBalance.temperature.view` → 文本 "5600K"。

- `data-value-key`（实际值绑定键）
  - 实际控制用的数据绑定键：
    - `cameraState.exposure.shutter.value` → 逻辑值 1/60 对应的整数 60 或枚举 index；
    - `cameraState.whiteBalance.temperature.value` → 数值 5600。
  - 显示/实际分离：UI 渲染时只读取 `data-bind-key` 对应的值；写操作使用 `data-value-key`。

- `data-operation-id`
  - 该容器进行写操作时调用的 Operation 标识，例如 `ptz.setFocus`、`exposure.setIso`。

- `data-log-io` / `data-log-snapshot`
  - `true` 表示该容器的操作/状态需要被纳入 I/O 日志和快照记录。

> 注：在哪些容器上添加哪些字段，可以按控件类型灵活选择，但 `data-node-path` 和 `data-node-role` 必须存在。

### 2.2 绝对路径与相对路径

- 绝对路径：`zcam.camera.pages.main.ptz.focus`；
- 相对路径：逻辑层可按类似 Unix 路径解析：
  - `./slider` → 当前容器下的 `slider` 子容器；
  - `../zoom` → 同一父容器下的 `zoom` 控件；
  - `../../status` → 上两级的某个 sibling。

在 HTML 中只记录绝对路径，JS 中提供 `resolveRelativePath(basePath, relative)` 辅助函数处理相对路径。

### 2.3 Focus 限位控件示例

以 Focus 区为例的完整容器设计（来自 `ui-main-draft.html`）：

```html
<!-- Focus 外框容器 -->
<div
  data-node-path="zcam.camera.pages.main.ptz.focusGroup"
  data-node-role="group"
  data-node-kind="ptz.focusGroup"
  data-selectable="true"
  class="zcam-ptz-focus-wrap"
>
  <!-- Focus 滑块 + AF/MF -->
  <div
    class="zcam-slider-row"
    data-node-path="zcam.camera.pages.main.ptz.focus"
    data-node-role="control"
    data-node-kind="ptz.focus"
    data-selectable="true"
    data-bind-key="cameraState.ptz.focus.view"
    data-value-key="cameraState.ptz.focus.value"
    data-operation-id="ptz.setFocus"
  >
    <label>Focus</label>
    <input type="range" min="0" max="100" value="40" />
    <!-- 显示值 -->
    <div class="zcam-slider-meta">
      <span class="zcam-slider-value">40</span>
      <span class="zcam-slider-range">0 - 100</span>
    </div>
    <!-- AF/MF 开关 -->
    <div
      class="zcam-toggle-group"
      data-node-path="zcam.camera.pages.main.ptz.focusMode"
      data-node-role="control"
      data-node-kind="ptz.focusMode"
      data-selectable="true"
      data-bind-key="cameraState.ptz.focusMode.view"   
      data-value-key="cameraState.ptz.focusMode.value" 
      data-operation-id="ptz.setFocusMode"
    >
      <div
        class="zcam-toggle zcam-toggle-on"
        data-log-io="true"
      >
        <div class="zcam-toggle-knob"></div>
      </div>
      <span class="zcam-toggle-label-on">AF</span>
    </div>
  </div>

  <!-- Focus 限位：远 / 近 -->
  <div
    class="zcam-ptz-focus-limit-row"
    data-node-path="zcam.camera.pages.main.ptz.focusLimit"
    data-node-role="group"
    data-node-kind="ptz.focusLimit"
    data-selectable="true"
  >
    <span class="zcam-ptz-focus-limit-label">Focus 限位</span>
    <div class="zcam-ptz-focus-limit-buttons">
      <button
        class="zcam-ptz-focus-limit-btn"
        data-node-path="zcam.camera.pages.main.ptz.focusFar"
        data-node-role="control"
        data-node-kind="ptz.focusFar"
        data-selectable="true"
        data-operation-id="ptz.gotoFocusFar"
      >
        远
      </button>
      <button
        class="zcam-ptz-focus-limit-btn"
        data-node-path="zcam.camera.pages.main.ptz.focusNear"
        data-node-role="control"
        data-node-kind="ptz.focusNear"
        data-selectable="true"
        data-operation-id="ptz.gotoFocusNear"
      >
        近
      </button>
    </div>
  </div>
</div>
```

这里：

- Focus 滑块：显示值为 40（view），实际值为 [0,100] 的数（value），写操作调用 `ptz.setFocus`；
- AF/MF 开关：显示为 AF/ MF 文本，实际值可能是布尔或枚举 `{ AF, MF }`，写操作为 `ptz.setFocusMode`；
- FocusFar / FocusNear 按钮：
  - 单击：调用 `ptz.gotoFocusFar` / `ptz.gotoFocusNear`；
  - 长按：调用 `ptz.saveFocusFar` / `ptz.saveFocusNear`（通过 JS 逻辑扩展）。

---

## 3. 页面数据中心与显示/实际数据分离

### 3.1 页面唯一数据中心（f）

每个页面有一个 `PageStore` 作为数据中心：

```ts
interface CameraState {
  ptz: {
    pan: number;
    tilt: number;
    zoom: number;
    focus: number;
    focusMode: 'AF' | 'MF';
    focusFarLimit?: number;
    focusNearLimit?: number;
  };
  exposure: {
    shutter: { value: number; view: string }; // 60, "1/60"
    iso: { value: number; view: string };     // 800, "ISO 800"
    aeEnabled: boolean;
  };
  whiteBalance: {
    temperature: { value: number; view: string }; // 5600, "5600K"
    awbEnabled: boolean;
  };
  image: {
    brightness: number;
    contrast: number;
    saturation: number;
  };
  // ... 录制 / 推流等
}

interface UiState {
  selectedNodes: string[];
  debugMode: 'normal' | 'debug';
  highlightMap: Record<string, 'none' | 'hover' | 'active' | 'error' | 'replay'>;
}

interface PageStore {
  path: string;                // "zcam.camera.pages.main"
  cameraState: CameraState;    // 真实数据
  viewState: {
    camera: CameraState;       // 可以与 cameraState 区分，用于扩展格式化逻辑
    ui: UiState;
  };
  operations: OperationRegistry;
}
```

### 3.2 显示值 vs 实际值（显示/实际分离）

对于像快门、ISO、色温等字段：

- **实际值**：用于控制的 canonical 值（整数/枚举）：
  - shutter.value: 60
  - iso.value: 800
  - temperature.value: 5600

- **显示值**：用于 UI 展示的格式化字符串或映射文本：
  - shutter.view: "1/60"
  - iso.view: "ISO 800"
  - temperature.view: "5600K"

UI 渲染逻辑：

1. 从 `data-bind-key` 读显示值：
   - `cameraState.exposure.shutter.view` → 显示在按钮或 label 上；
2. 从 `data-value-key` 读实际值，用于决定 slider 位置或内部逻辑：
   - slider 初始值为 shutter.value / 一定映射；
3. 当用户选择新值（如在模态中点击 "1/120"）时：
   - Operation 接收的是逻辑值（如 `value: 120`）；
   - Operation 更新 `shutter.value = 120`，同时重新生成 `shutter.view = "1/120"`；
   - UI 再次渲染时，显示新的 `view`。

这样可以覆盖：

- 不同显示形式（中英文、带单位/不带单位）完全不影响实际控制值；
- 同一个逻辑值可以有多个显示形式（debug 模式下可以显示 "60 (1/60)" 之类）。

### 3.3 选择导出当前结构体（a）

当 `data-selectable="true"` 且用户在 debug 模式下选择一个容器时：

1. 从 `data-node-path` 找到对应节点；
2. 从数据中心（`PageStore.cameraState` 和 `viewState`）取出对应子树结构；
3. 导出为 JSON，例如：

```json
{
  "nodePath": "zcam.camera.pages.main.ptz.focusGroup",
  "cameraState": {
    "focus": { "value": 40, "view": "40" },
    "focusMode": { "value": "AF", "view": "AF" },
    "focusFarLimit": 90,
    "focusNearLimit": 10
  },
  "uiState": {
    "highlight": "replay",
    "debugMode": "debug"
  }
}
```

---

## 4. Operation 与 CLI 通信

### 4.1 Operation 定义（g）

```ts
interface OperationContext {
  pagePath: string;
  nodePath: string;
  kind: string;
  timestamp: number;
  cameraState: CameraState;
  uiState: UiState;
}

interface OperationPayload {
  value?: unknown;
  params?: Record<string, unknown>;
}

interface CliRequest {
  id: string;
  command: string;
  params: Record<string, unknown>;
}

interface CliResponse {
  id: string;
  ok: boolean;
  data?: unknown;
  error?: string;
}

interface OperationResult {
  newStatePartial?: Partial<CameraState>;
  cliRequest?: CliRequest;
}

type OperationHandler = (
  ctx: OperationContext,
  payload: OperationPayload
) => Promise<OperationResult>;

interface OperationDefinition {
  id: string;           // e.g. "ptz.setFocus"
  cliCommand: string;   // e.g. "ptz.focus"
  handler: OperationHandler;
}

interface OperationRegistry {
  run(id: string, ctx: OperationContext, payload: OperationPayload): Promise<OperationResult>;
}
```

UI 只需要知道：

- `data-operation-id` → 用于调用 `OperationRegistry.run(...)`；
- Operation 内部完成：
  - 逻辑校验（例如 Focus 不能超过限位）；
  - CLI 请求构造；
  - 更新 CameraState。

### 4.2 统一 CLI 通道（g, h）

所有 Operation 发出的 CLI 请求通过单一管道：

- 对接 `camera-bridge`：通过 stdin/stdout 的 JSON Lines 协议；
- 在 Operation 层不做网络/HTTP，统一写 `cliCommand` 和 `params`。

统一记录 I/O 日志（见下）。

---

## 5. I/O 日志、快照与 Replay（h, j）

### 5.1 I/O 日志结构

```ts
interface IoLogEntry {
  ts: number;
  dir: 'out' | 'in';
  pagePath: string;
  nodePath: string;
  operationId: string;
  request?: CliRequest;
  response?: CliResponse;
}
```

规则：

- 每次 Operation 调用：
  - 记录 `dir: 'out'` 的 `IoLogEntry`（发出 CLI 请求）；
  - 收到 CLI 响应时记录 `dir: 'in'` 的 `IoLogEntry`；
- 如果某个容器 `data-log-io="true"`，则强制纳入日志。

### 5.2 Replay & Monkey

Replay 事件结构：

```ts
interface ReplayEvent {
  ts: number;
  nodePath: string;
  operationId: string;
  payload: OperationPayload;
  beforeState: CameraState;
  afterState: CameraState;
  cliRequest?: CliRequest;
  cliResponse?: CliResponse;
}
```

Replay 流程：

1. 从 JSON log 读取 `ReplayEvent` 序列；
2. 对于每个事件：
   - 将 `PageStore.cameraState` 设置为 `beforeState`；
   - 高亮 `nodePath` 对应容器：`data-highlight="replay"`；
   - 可选地重放 CLI 请求（或仅模拟状态变化）；
   - 更新为 `afterState`；
3. 在 debug UI 中可逐步前进/后退。

Monkey 模式：

- 从历史 `ReplayEvent` 中抽样或随机排列，自动执行若干事件，观察 UI 响应和边界情况。

---

## 6. 分组：UI 父亲与种类父亲（i）

### 6.1 UI 父亲（布局树）

由 `data-node-path` 的层级结构定义：

- 父节点：`parentPath = path.substring(0, path.lastIndexOf('.'))`；
- 子节点：所有以 `parentPath + '.'` 开头的 path。

例如：

- `zcam.camera.pages.main` → 页面父节点；
- `zcam.camera.pages.main.ptz` → PTZ 卡片；
- `zcam.camera.pages.main.ptz.focus` → PTZ 内部的 Focus 控件。

UI 布局树用于：

- 计算布局（嵌套盒模型）；
- 局部渲染（只重绘某个子树）。

### 6.2 种类父亲（功能树）

由 `data-node-kind` 决定：

- `ptz.*` → 所有 PTZ 类容器；
- `exposure.*` → 所有曝光相关控件；
- `whiteBalance.*` → 白平衡控件；
- `shortcut.*` → 快捷相关控件。

使用场景：

- 按功能启用/禁用一类控件（比如只允许调焦点，不允许调曝光）；
- debug 时高亮一类控件（例如白平衡所有相关控件加绿色边框）。

---

## 7. 新控件开发流程

以“新增一个曝光参数控件”为例，规范新控件开发步骤。

### 步骤 1：在 HTML 中定义容器

1. 选择 UI 父亲路径，例如 `zcam.camera.pages.main.imageControl` 下新增 `exposure.someParam`。
2. 在 `ui-main-draft.html` 中添加对应 DOM 片段：

```html
<div
  class="zcam-field-row"
  data-node-path="zcam.camera.pages.main.exposure.someParam"
  data-node-role="control"
  data-node-kind="exposure.someParam"
  data-selectable="true"
  data-bind-key="cameraState.exposure.someParam.view"
  data-value-key="cameraState.exposure.someParam.value"
  data-operation-id="exposure.setSomeParam"
>
  <label>Some</label>
  <input type="range" min="0" max="100" value="50" />
  <div class="zcam-slider-meta">
    <span class="zcam-slider-value">50</span>
    <span class="zcam-slider-range">0 - 100</span>
  </div>
</div>
```

### 步骤 2：在数据中心中增加字段

1. 在 `CameraState.exposure` 中增加字段：

```ts
interface CameraState {
  exposure: {
    someParam: { value: number; view: string };
    // ...已有字段
  };
}
```

2. 初始化时，为 `value` 和 `view` 提供默认值。

### 步骤 3：定义 Operation

1. 在 OperationRegistry 中添加 `exposure.setSomeParam` 定义：

```ts
const setSomeParam: OperationDefinition = {
  id: 'exposure.setSomeParam',
  cliCommand: 'exposure.setSomeParam',
  async handler(ctx, payload) {
    const raw = payload.value as number;
    const clamped = Math.max(0, Math.min(100, raw));

    const request: CliRequest = {
      id: uuid(),
      command: 'exposure.setSomeParam',
      params: { value: clamped },
    };

    return {
      newStatePartial: {
        exposure: {
          ...ctx.cameraState.exposure,
          someParam: {
            value: clamped,
            view: `${clamped}`,
          },
        },
      },
      cliRequest: request,
    };
  },
};
```

2. 将该 Operation 注册到 `PageStore.operations`。

### 步骤 4：接入 CLI

1. 在 `camera-bridge` 中增加对应命令：
   - `exposure.setSomeParam` → 调用 HTTP/UVC 或 Mock 后端；
2. 确保 CLI 返回的响应可以更新 CameraState（必要时可由后台轮询更新）。

### 步骤 5：启用日志与快照

1. 若该控件重要，设置：

```html
data-log-io="true" data-log-snapshot="true"
```

2. 验证：
   - 执行操作后，I/O 日志中存在对应条目；
   - Replay 能重现该参数的变化。

### 步骤 6：Debug 与 Replay 验证

1. 在 debug 模式下选择该控件容器（`data-selectable="true"`），检查导出的结构体是否包含：
   - `cameraState.exposure.someParam`；
   - 对应的 UI 状态信息；
2. 回放一段包含此控件操作的 JSON log，检查：
   - 高亮是否正确（`data-highlight="replay"`）；
   - 状态变化是否按预期重放。

---

## 8. 运行时持久化设计（~/.zcam）

根据你的要求，UI 框架需要统一管理运行时持久化，而不是各个控件自行读写文件。所有持久化内容放在用户主目录下的 `~/.zcam/zcammcp-ui/`，由框架层模块负责读写，应用层只通过接口使用。

### 8.1 目录布局

建议目录结构如下：

```text
~/.zcam/
  zcammcp-ui/
    state/          # 页面级状态 (cameraState + uiState)
    prefs/          # 用户偏好 / 布局配置 / 快捷设置
    logs/
      io/           # I/O 日志 (Operation + CLI)
      replay/       # replay 脚本 (ReplayEvent 序列)
    snapshots/
      main/         # 主页面快照
      settings/     # 其他页面快照 (例如设置页)
```

### 8.2 页面状态持久化 (state/)

由 `PagePersistence` 模块负责，该模块已经有初步实现：

- 默认路径：`~/.zcam/zcammcp-ui/state/`；
- 文件名：将 `pagePath` 中的 `.` 替换为 `_`，例如：
  - `zcam.camera.pages.main` → `zcam_camera_pages_main.json`；
- 文件内容：

```ts
export interface PersistedPageState {
  pagePath: string;          // e.g. "zcam.camera.pages.main"
  cameraState: CameraState;  // 真实控制数据
  uiState: UiState;          // UI 状态 (选中、debug、高亮等)
  savedAt: number;           // Unix 时间戳
}
```

使用方式（应用层）：

```ts
const persistence = new PagePersistence(); // 默认 ~/.zcam/zcammcp-ui/state
const saved = await persistence.load('zcam.camera.pages.main');

const store = new PageStore({
  path: 'zcam.camera.pages.main',
  operations,
  cli,
  initialCameraState: saved?.cameraState ?? defaultCameraState,
  initialUiState: saved?.uiState ?? defaultUiState,
});

// 在适当时机 (操作后/定时) 持久化
await persistence.save(store.path, store.cameraState, store.uiState);
```

### 8.3 用户偏好 / 布局 / 快捷设置 (prefs/)

应用层面有三类偏好需要持久化：

1. 全局 UI 偏好 (主题、语言、窗口模式等)；
2. 每个页面的布局配置 (哪些区域显示、顺序、折叠状态等)；
3. 每个页面的快捷设置 (快捷按钮对应哪些控件/Operation)。

建议文件划分：

```text
~/.zcam/zcammcp-ui/prefs/ui-preferences.json
~/.zcam/zcammcp-ui/prefs/layout-main.json
~/.zcam/zcammcp-ui/prefs/shortcuts-main.json
```

示例结构（仅示意，具体字段由应用层定义）：

- UI 偏好：

```json
{
  "theme": "dark",
  "language": "zh-CN",
  "window": {
    "alwaysOnTop": true,
    "defaultMode": "panel"
  }
}
```

- 主页面布局配置：

```json
{
  "pagePath": "zcam.camera.pages.main",
  "visibleSections": ["status", "ptz", "imageControl", "shortcuts"],
  "sectionOrder": ["status", "ptz", "imageControl", "shortcuts"],
  "ptz": {
    "showFocusGroup": true
  }
}
```

- 主页面快捷设置：

```json
{
  "pagePath": "zcam.camera.pages.main",
  "shortcuts": [
    {
      "id": "shortcut-1",
      "label": "快捷1",
      "boundNodes": [
        "zcam.camera.pages.main.ptz.focusGroup",
        "zcam.camera.pages.main.exposure.shutter"
      ],
      "operations": [
        { "operationId": "ptz.gotoPreset", "params": { "presetId": 1 } },
        { "operationId": "exposure.setShutter", "params": { "value": 60 } }
      ]
    }
  ]
}
```

框架层应提供 `PreferencesPersistence` 接口（设计）：

```ts
interface UiPreferences { /* 主题/语言/窗口等 */ }
interface PageLayoutConfig { /* visibleSections/sectionOrder/局部配置 */ }
interface PageShortcutsConfig { /* 如上 shortcuts */ }

class PreferencesPersistence {
  constructor(baseDir?: string) { /* 默认 ~/.zcam/zcammcp-ui/prefs */ }

  loadUiPreferences(): Promise<UiPreferences | undefined>;
  saveUiPreferences(prefs: UiPreferences): Promise<void>;

  loadLayout(pagePath: string): Promise<PageLayoutConfig | undefined>;
  saveLayout(pagePath: string, config: PageLayoutConfig): Promise<void>;

  loadShortcuts(pagePath: string): Promise<PageShortcutsConfig | undefined>;
  saveShortcuts(pagePath: string, config: PageShortcutsConfig): Promise<void>;
}
```

应用层只需要处理 `UiPreferences/PageLayoutConfig/PageShortcutsConfig` 的具体字段含义，读写逻辑交给框架。

### 8.4 日志持久化 (logs/io, logs/replay)

#### 8.4.1 I/O 日志 (logs/io)

记录所有 Operation + CLI I/O，用于 debug 和后续 replay/分析。

目录：

```text
~/.zcam/zcammcp-ui/logs/io/main-YYYYMMDD.log
```

文件格式：一行一条 JSON（JSON Lines），结构使用前文的 `IoLogEntry`：

```ts
interface IoLogEntry {
  ts: number;
  dir: 'out' | 'in';
  pagePath: string;
  nodePath: string;
  operationId: string;
  request?: CliRequest;
  response?: CliResponse;
}
```

框架层可提供 `IoLogWriter`：

```ts
class IoLogWriter {
  append(entry: IoLogEntry): Promise<void>;
}
```

PageStore / OperationRegistry 在执行操作和收到 CLI 响应时调用 `append`，将日志写入当日日志文件。

#### 8.4.2 Replay 脚本 (logs/replay)

Replay 用于回放一系列操作和状态变化，结构为 `ReplayEvent[]`：

```text
~/.zcam/zcammcp-ui/logs/replay/main-YYYYMMDD-HHmmss.json
```

```ts
interface ReplayEvent {
  ts: number;
  nodePath: string;
  operationId: string;
  payload: OperationPayload;
  beforeState: CameraState;
  afterState: CameraState;
  cliRequest?: CliRequest;
  cliResponse?: CliResponse;
}
```

框架层的 `ReplayEngine` 负责：

- 从文件加载 `ReplayEvent[]`；
- 逐条设置 `PageStore.cameraState` 为 `beforeState` → 应用操作 → 检查 `afterState`；
- 在 replay 过程中设置相关容器的 `data-highlight="replay"` 用于 UI 高亮。

### 8.5 Snapshot 持久化 (snapshots/)

Snapshot 用于捕获某一时刻的完整页面状态，用于 debug、对比和 replay 的起始点。

目录示例：

```text
~/.zcam/zcammcp-ui/snapshots/main/20241101-101500.json
~/.zcam/zcammcp-ui/snapshots/main/20241101-103000.json
```

结构：

```json
{
  "pagePath": "zcam.camera.pages.main",
  "timestamp": 1730000000000,
  "cameraState": { /* 全量 CameraState */ },
  "uiState": { /* 全量 UiState */ }
}
```

框架层可提供 `SnapshotPersistence`：

```ts
class SnapshotPersistence {
  saveSnapshot(pagePath: string, camera: CameraState, ui: UiState): Promise<string>; // 返回文件名
  listSnapshots(pagePath: string): Promise<string[]>; // 列出指定页面的所有快照文件
  loadSnapshot(pagePath: string, fileName: string): Promise<{ cameraState: CameraState; uiState: UiState } | undefined>;
}
```

应用层可在 debug 面板中调用这些接口，进行快照保存与恢复。

---

## 9. 后续工作

1. 将本规范应用到现有 `docs/ui-main-draft.html`：
   - 为主要容器补充 `data-node-*` 属性；
   - 抽出 `.zcam-card-inner` 等 base class，统一内容对齐和分组边界。

2. 在 `docs/ui-main-draft.html` 末尾增加一个快门/ISO 模态框示例 DOM，采用本规范中的 `zcam-modal` + `zcam-option-grid` 风格，方便 UI 确认。

3. 在实现层（TS/Electron）中：按本规范实现 PageStore、OperationRegistry、CLI 通道、I/O 日志和 replay 机制，并验证 Focus 限位、PTZ 控制、曝光/白平衡等典型控件的完整链路。

4. 后续如需扩展其他页面（例如 `zcam.camera.pages.settings`），可复用相同的容器规范和数据中心模式，仅需定义新的 `CameraState` 子树和 Operation 集合。
