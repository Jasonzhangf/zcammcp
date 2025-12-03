# ZCAM Camera Control UI & Camera Bridge 设计草案

> 状态：草案（根据评审再细化和调整）

本设计将桌面 UI 和 camera-bridge 分拆成两个相对独立的模块，先把接口和边界定清楚，后续可以在不破坏协议的前提下迭代实现细节（HTTP / UVC / Mock 等）。

统一约定：所有 UI 内部路径前缀使用 `zcam.camera`。

---

## 1. 顶层目标

- 提供一个跨平台（macOS / Windows）的桌面相机控制 UI，具备浮窗、悬浮球、贴边等交互形态。
- UI 与具体相机实现解耦，通过一个独立的 `camera-bridge` CLI 子进程进行通信。
- UI 内部使用类似 DOM 的容器树和路径访问方式（`zcam.camera.xxx.yyy`），实现页面化 + 容器化布局。
- UI 显示（View）与数据（State）严格分离，全局仅维护一棵状态树。

后续更详细的 UI 设计将基于本文件的结构和命名继续展开。

---

## 2. 模块划分

### 2.1 桌面 UI（Electron + TS）

桌面 UI 由两部分组成：

1. Electron 主进程
   - 创建/管理主窗口（浮窗、悬浮球、贴边、托盘菜单）。
   - 启动并管理 `camera-bridge` 子进程（后续可以按需要接入实际后端）。
   - 提供 IPC 通道给渲染进程（UI）与 `camera-bridge` 交互。

2. 渲染进程（前端 UI）
   - 使用 React/Vue/其他框架皆可，但内部统一抽象为“虚拟 UI 容器树”。
   - 维护一棵全局状态树 `AppState`，包含 UI 状态和相机状态。
   - 通过 `CommandBus` 将用户操作转换为对 `camera-bridge` 的命令调用。

### 2.2 Camera Bridge CLI

`camera-bridge` 是一个独立的 Node/TS CLI 程序，负责：

- 与真实相机（HTTP / UVC / 其他）或 Mock 相机交互；
- 对外暴露稳定的 JSON-Lines 协议接口，用于被 UI 子进程通过 stdio 调用；
- 将不同后端实现屏蔽在统一的命令/事件模型之后。

在当前阶段，我们只需要把 `camera-bridge` 的接口和命令格式设计好，实际实现可以先 mock 为主。

---

## 3. UI 设计（第一阶段）

本节先做 UI 的总体结构设计，后续会在单独文档里展开交互细节和组件级设计。

### 3.1 运行时形态与窗口状态机

UI 运行时有三种窗口形态，由 Electron 主进程管理：

- `panel` 模式：
  - 标准浮动面板（always-on-top，可调整大小）。
  - 可贴边：拖动到屏幕边缘时自动吸附。

- `ball` 模式（悬浮球）：
  - 同一窗口，但内容渲染为圆形/小方块，透明背景。
  - 支持拖动（由渲染进程捕获鼠标事件并通过 IPC 通知主进程更新窗口位置）。
  - 松手时若距离左右屏幕边缘小于阈值则吸附。
  - 点击球体切换回 `panel` 模式。

- `hidden` 模式：
  - 窗口隐藏，系统托盘图标控制显示/隐藏。

状态机示意：

- `panel -> ball`：点击“最小化为球”按钮；
- `ball -> panel`：单击悬浮球；
- `panel|ball <-> hidden`：从托盘菜单切换。

### 3.2 UI 状态树（AppState）

UI 使用一个全局状态树 `AppState` 表示所有状态，示例结构：

```ts
interface AppState {
  ui: {
    windowMode: 'panel' | 'ball' | 'hidden';
    currentPage: string; // e.g. 'zcam.camera.pages.main'
    layoutTree: UiNodeBase; // 虚拟 UI 容器树
    dragging: boolean;
    dockedEdge?: 'left' | 'right' | null;
  };

  cameras: {
    list: CameraSummary[];
    currentId?: string;
    byId: Record<string, CameraDetail>;
  };

  cameraState: {
    ptz: { pan: number; tilt: number; zoom: number; moving: boolean };
    exposure: {
      mode: 'auto' | 'manual';
      shutter: number;
      iso: number;
      gain: number;
    };
    whiteBalance: {
      mode: 'auto' | 'manual';
      temperature: number;
    };
    image: {
      brightness: number;
      contrast: number;
      saturation: number;
      sharpness: number;
    };
    recording: {
      status: 'idle' | 'recording' | 'paused';
      remainSeconds?: number;
    };
    streaming: {
      status: 'idle' | 'streaming';
      profile?: string;
    };
  };

  backend: {
    connected: boolean;
    lastError?: string;
    inFlightCommands: Record<string, { ts: number; command: string }>;
  };
}
```

> 要点：
> - 所有 UI 控件只绑定到 `AppState`（尤其是 `cameraState`）上的字段，不直接做网络/CLI 调用。
> - 任何对相机的操作都通过命令总线（CommandBus）发给 `camera-bridge`，由返回结果更新状态树。

### 3.3 虚拟 UI 容器树与路径命名

UI 内部维护一棵“虚拟 UI 树”，类似 DOM，但更明确地限制尺寸和对齐：

```ts
type NodePath = string; // 例如 'zcam.camera.pages.main.ptz.panSlider'

interface BoxConstraints {
  width?: number;
  height?: number;
  maxWidth?: number;
  maxHeight?: number;
  minWidth?: number;
  minHeight?: number;
}

interface UiNodeBase {
  id: string;        // 局部节点名，如 'panSlider'
  path: NodePath;    // 全路径，如 'zcam.camera.pages.main.ptz.panSlider'
  type: 'page' | 'container' | 'control';
  box: BoxConstraints;
  align?: 'center' | 'start' | 'end' | 'stretch';
  children?: UiNodeBase[];
}

interface ControlNode extends UiNodeBase {
  controlType:
    | 'slider'
    | 'button'
    | 'toggle'
    | 'dropdown'
    | 'label'
    | 'group';
  bindKey?: string; // 例如 'cameraState.ptz.pan'
}
```

路径命名规则：

- 所有路径以 `zcam.camera` 作为前缀；
- 页面节点：`zcam.camera.pages.main`、`zcam.camera.pages.settings` 等；
- 容器节点：`zcam.camera.pages.main.ptzPanel`、`zcam.camera.pages.main.imagePanel`；
- 控件节点：`zcam.camera.pages.main.ptzPanel.panSlider` 等。

### 3.4 布局规则与尺寸约束

布局引擎基本规则：

1. 每个节点都有 `box` 约束；
2. 子节点的 `width/height` 不得超过父节点的最终尺寸：
   - `child.width = min(child.width, parent.width)`
   - `child.height = min(child.height, parent.height)`
3. `align` 指定在父容器中的对齐方式：
   - 默认 `center`：子容器居中；
   - `start`/`end`：在对应方向对齐；
   - `stretch`：填满父容器剩余空间（仍受 max 限制）。
4. 当父容器尺寸变化（窗口缩放/贴边/模式切换）时，整个 UI 树重新布局，实现自适应。

> 后续详细 UI 设计文档会定义每个页面的具体节点树（包括 PTZ 面板、曝光面板、预设列表等），并给出示例布局参数。

### 3.5 命令总线与 UI 交互模式

UI 不直接操作相机，而是发出“命令”：

```ts
interface UiCommand {
  name: string; // 如 'ptz.move', 'exposure.setMode'
  params: Record<string, unknown>;
}

type CommandHandler = (cmd: UiCommand) => Promise<void>;
```

工作流：

1. 控件事件（例如拖动 PTZ 滑条）触发 `dispatchCommand({ name: 'ptz.move', params: { pan, tilt } })`；
2. `CommandBus` 将命令编码为 JSON 请求，通过 IPC 发送给主进程；
3. 主进程的 `CliBackend` 将请求转发给 `camera-bridge` 子进程；
4. `camera-bridge` 返回结果或错误；
5. 渲染进程根据结果更新 `AppState`（例如更新 `cameraState.ptz`）。

> 这个模式保证了“UI 显示和数据分离”，以及所有外部 IO 通过统一管道进行。

---

## 4. Camera Bridge 设计（第一阶段）

本阶段目标：

- 定义 `camera-bridge` CLI 的对外协议与内部结构；
- 实现最小可用的 mock 版本，支持 UI 联调；
- 保留将来接入 HTTP / UVC / 其他后端的扩展点。

### 4.1 进程与协议

`camera-bridge` 作为一个独立进程运行，UI 通过 `stdio` 与其通信：

- 启动方式示例：

  ```bash
  camera-bridge --backend=mock
  ```

- 协议采用 JSON Lines：每行一个 JSON 对象，UTF-8 文本。
- 消息类型：
  - `command`：UI 发来的请求；
  - `result`：命令响应；
  - `event`：后端主动推送的状态变更。

请求示例（command）：

```json
{
  "id": "uuid-123",
  "type": "command",
  "name": "ptz.move",
  "params": { "pan": 10, "tilt": 5 }
}
```

响应示例（result）：

```json
{
  "id": "uuid-123",
  "type": "result",
  "ok": true,
  "data": { "pan": 10, "tilt": 5 }
}
```

事件示例（event）：

```json
{
  "type": "event",
  "name": "camera.ptz.updated",
  "data": { "pan": 10, "tilt": 5, "zoom": 100 }
}
```

> 注意：
> - `id` 仅对 `command/result` 成对出现；
> - `event` 没有 `id`，用于推送异步状态（如录制状态变化）。

### 4.2 命令命名与参数（初步草案）

命令名使用点分层级，与 UI 的语义对应，但不直接等同于 UI 路径。

首批命令建议：

- `camera.list`：列出可用相机；
- `camera.select`：选择当前相机；
- `ptz.get` / `ptz.move` / `ptz.stop`；
- `exposure.get` / `exposure.setMode` / `exposure.set`；
- `whiteBalance.get` / `whiteBalance.setMode` / `whiteBalance.set`；
- `image.get` / `image.set`（亮度/对比度等）；
- `recording.get` / `recording.start` / `recording.stop`；
- `streaming.get` / `streaming.start` / `streaming.stop`。

每个命令的入参/出参会在后续 camera-bridge 专门文档中细化，这里先锁定命名空间和基本颗粒度。

### 4.3 内部结构与后端抽象

内部结构建议：

```ts
interface BackendDriver {
  init(): Promise<void>;
  shutdown(): Promise<void>;
  handleCommand(name: string, params: any): Promise<any>;
}

class MockBackend implements BackendDriver { /* ... */ }
class HttpBackend implements BackendDriver { /* 未来: 复用 ZCamHttpClient */ }
class UvcBackend implements BackendDriver { /* 未来: UVC 控制实现 */ }
```

`camera-bridge` 主程序：

1. 解析 CLI 参数，选择 `MockBackend` 等具体实现；
2. 初始化 backend；
3. 循环从 stdin 读取 JSON 行：
   - 解析为 command；
   - 调用 `backend.handleCommand()`；
   - 将结果写回 stdout（对应 result 消息）；
4. backend 在内部需要推送事件时，通过回调写入 stdout（event 消息）。

### 4.4 MockBackend 行为（第一阶段）

MockBackend 主要目标是支持 UI 联调，行为可以简化为：

- 内部维护一个 `MockCameraState`，结构和 UI 的 `cameraState` 相近；
- 当收到例如 `ptz.move` 命令时：
  - 更新内部状态；
  - 立即返回成功结果；
  - 同时发送 `camera.ptz.updated` 事件；
- 对录制/推流相关命令，简单切换状态并推送事件即可。

后续如果需要，可以在 Mock 中加入“渐变”行为（例如 PTZ 从旧值缓动到新值），用于 UI 动画测试。

---

## 5. 下一步工作建议

1. 审批本文件中对 UI 与 camera-bridge 的边界划分和命名约定（尤其是 `zcam.camera` 路径前缀、命令前缀）。
2. 在 UI 侧新建一个 Electron+TS 项目骨架，并预留：
   - 主进程：窗口状态机（panel/ball/hidden）、
   - 渲染进程：`AppState` 类型、`UiNodeBase` 定义、简单页面切换逻辑。
3. 为 `camera-bridge` 新建子项目目录（例如 `camera-bridge/`），放置：
   - 协议说明文档；
   - 命令列表草案；
   - 一个最小可运行的 `MockBackend` 实现。
4. 在此基础上，再编写一份更详细的 UI 交互与页面结构设计文档（包括各页面的容器树、控件、绑定字段），以便进入实际编码阶段。

