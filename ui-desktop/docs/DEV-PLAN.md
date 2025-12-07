# UI Desktop 可观测与自驱动测试计划

## 一、概览

本 UI Desktop 子项目现在支持：
- 所有业务控件继承 `BaseControl`，自动通过 `DevChannel` 上报 DOM 尺寸、滚动条、交互耗时、错误等。
- 主进程通过 `control:dev-report` IPC + `Dev Socket` 与 CLI 打通，形成可观测流。
- 支持通过 **消息驱动** 的方式远程触发 UI 动作（如 `shrinkToBall`、`doubleClick`）与自驱动的回环测试（`cycle`）。

下面列出核心文件与职责，以及现有的 CLI 命令和用法。

## 二、核心文件与职责

### 2.1 消息系统框架层

| 文件 | 职责 | 备注 |
|------|------|------|
| `src/app/framework/ui/BaseControl.ts` | 控件基类，生命周期、滚动/交互/错误上报、处理 `DevCommand`（如 `ping/measure/highlight/ui.window.*`） | 所有 UI 控件 |
| `src/app/framework/ui/DevChannelImpl.ts` | 渲染进程侧实现 `DevChannel`，把事件转发给主进程 IPC | React 组件 |
| `src/app/framework/ui/controls/` | 具体控件类（Slider/Toggle/ModalSelect）继承 `BaseControl` | `SliderControl` / `ToggleControl` / `ModalSelectControl` |
| `electron.main.ts` | 主进程：`control:dev-report` 接收 + 通过 `electron.dev-socket.ts` 发给 CLI | UI 窗口事件广播 |
| `electron.dev-socket.ts` | TCP 服务，将 CLI 发来的 `command` 转发到所有渲染进程；把 DevReport 写给所有 CLI 客户 | CLI ↔ Electron 之间的消息网关 |
| `cli/src/modules/ui.js` | CLI 命令：`zcam ui dev watch/ping/highlight/cycle` | CLI 可观测与测试驱动 |

### 2.2 UI 控件层（已有部分）

| 类型 | 文件 | 说明 |
|------|------|------|
| 滑块 | `src/app/components/SliderControl.tsx` / `src/app/framework/ui/controls/SliderControl.ts` | 包装 + DOM 实现 |
| 开关 | `src/app/components/ToggleControl.tsx` / `src/app/framework/ui/controls/ToggleControl.ts` | 包装 + DOM 实现 |
| 模态选择 | `src/app/controls/image/ShutterSelect/ShutterSelect.tsx` / `src/app/controls/image/ShutterSelect/ShutterSelectControl.ts` | 基于 `ModalSelectControlBase` |
| 模态选择 | `src/app/controls/image/IsoSelect/IsoSelect.tsx` / `src/app/controls/image/IsoSelect/IsoSelectControl.ts` | 基于 `ModalSelectControlBase` |
| 球窗控件 | `src/app/pages/ball/BallClient.ts` | 极轻量 Ball 窗口层，自动上报 mounted/updated/unmounted/interaction、滚动条信息 | `ui.desktop.pages.ball` |

### 2.3 页面层（使用控件）

| 文件 | 说明 |
|------|------|
| `src/app/pages/main/index.tsx` | 主窗口，订阅 `ui.window.shrinkToBall` / `ui.window.restoreFromBall` 实现消息驱动的收缩/恢复 |
| `src/app/pages/ball/index.tsx` | 悬浮球页面，引用 `BallClient` |
| `src/app/pages/main/.../*Card.tsx` | 把上述控件组合使用，保持页面结构纯粹、不直接调业务 API |

## 三、Dev 通道与消息协议

### 3.1 DevReportPayload（UI → 主进程 → CLI）

```ts
export type DevReportPayload =
  | { type: 'mounted'; controlId: string; ts: number; rect: DOMRect; scrollInfo?: ScrollInfo }
  | { type: 'updated'; controlId: string; ts: number; rect: DOMRect; scrollInfo?: ScrollInfo }
  | { type: 'unmounted'; controlId: string; ts: number }
  | { type: 'interaction'; controlId: string; ts: number; event: string; responseMs?: number }
  | { type: 'error'; controlId: string; ts: number; error: string };
```

- `ScrollInfo`：`{ hasHorizontalScrollbar, hasVerticalScrollbar, scrollWidth, scrollHeight, clientWidth, clientHeight }`
- 所有的 UI 控件（包括 Ball）在生命周期中都会通过 `DevChannelImpl` 自动发出 `devReport`。

### 3.2 DevCommand（CLI / 主进程 → UI）

```ts
export interface DevCommand {
  controlId?: string; // undefined 表示广播
  cmd:
    | 'ping'
    | 'dumpState'
    | 'measure'
    | 'highlight'
    // UI 窗口级测试命令
    | 'ui.window.shrinkToBall'
    | 'ui.window.restoreFromBall'
    | 'ui.ball.doubleClick';
  payload?: any;
}
```

- `ping`：控件应回 `interaction { event: 'pong' }`。
- `measure` / `dumpState`：控件应立即重测尺寸并发出 `updated`。
- `highlight`：控件应在容器上加红色虚线边框 2 秒，便于定位。
- `ui.window.*`：窗口级命令，由主窗口订阅并执行 `window.electronAPI.*`。
- `ui.ball.doubleClick`：由球窗口订阅并执行 `restoreFromBall`，用于自驱动测试。

---

## 四、CLI 命令与使用

### 4.1 实时监控（观测模式）

```bash
cd ui-desktop
npm run build && npm run build:electron   # 开发模式自动启动 Dev Socket
./scripts/start-dev.sh

# 另一个终端
cd cli
npm start -- ui dev watch
```

- 所有 `DevReport` 将在 CLI 终端打印，包含：
  - `mounted / updated`：控件 ID + rect + 滚动条信息（`h`/`v` 布尔）。
  - `interaction`：事件名 + 响应耗时（ms）。
  - `error`：错误消息与控件 ID。
- 可用于：
  - 确认某控件是否存在滚动条。
  - 调试交互性能、定位卡顿或无响应控件。

### 4.2 Ping / 高亮 / 手动指令

```bash
zcam ui dev ping
zcam ui dev highlight "zcam.camera.pages.main.exposure.shutter"
```

- `ping`：广播 `ping`，各控件回 `pong`。
- `highlight`：给指定控件加红框，便于在 UI 里定位。

### 4.3 自驱动的回环测试（消息驱动 + 规则验证）

```bash
# 单轮完整验证
zcam ui dev cycle --timeout 5000

# 连续多轮（示例：跑 10 轮）
zcam ui dev cycle --loop 10 --timeout 5000
```

**执行逻辑（已在 CLI 中实现）**：

1. **步骤 1**  
   - 发 `ui.window.shrinkToBall` 命令。  
   - 等待 `ball.mounted`（超时则报错）。  
   - 可选：检查 `scrollInfo` 是否出现滚动条。

2. **步骤 2**  
   - 发 `ui.ball.doubleClick` 命令。  
   - 等待 `ball.unmounted`。  

3. **结果判定**  
   - 若全部步骤在超时内完成且无 `error` / 不合规滚动条 → 输出 **✓ 成功** 并用时统计。  
   - 否则输出 **✗ 失败** 并给出具体阶段和原因。

4. **输出示例**  

```text
步骤 1: 请求窗口缩小为悬浮球
步骤 2: 等待 ball 挂载 (DevReport mounted: controlId=ball)...
[2025-12-07T08:50:12.123Z] ✓ [ball] mounted 用时 34ms rect={x:1120,y:560,w:72,h:72} scroll(h=false,v=false)
步骤 3: 发送 ball.doubleClick (restoreFromBall) 命令
步骤 4: 等待 ball 卸载 (DevReport unmounted: controlId=ball)...
[2025-12-07T08:50:13.456Z] ✓ [ball] unmounted 用时 12ms
✓ 回环测试完成: shrink -> ball mounted -> restore -> ball unmounted
```

---

## 五、自驱动测试扩展方向（可选）

基于已实现的消息驱动机制，可进一步实现：

1. **增加滚动条规则**  
   - 在步骤 2（等待 ball mounted）中检查 `hasHorizontalScrollbar/hasVerticalScrollbar`，若出现则判定失败。

2. **关键控件状态检查**  
   - 在恢复后可再发 `highlight` 或 `measure` 给某些控件，通过 DevReport 的 `updated`/`interaction` 确认主 UI 是否可交互。

3. **压测与报告**  
   - `zcam ui dev stress --loops 1000`：统计成功率、平均耗时、失败原因分布。

4. **多语言支持与规则模板**  
   - 将测试规则描述保存为 JSON/YAML，CLI 加载并按规则执行，支持 CI 集成。

---

## 六、完整闭环的启动与验证流程

### 6.1 启动 Electron UI（含 Dev Socket）

```bash
cd ui-desktop
npm run build
npm run build:electron
NODE_ENV=development npm run electron
# 这会同时启动 UI Dev Socket（默认 6223），并把 DevReport 流透给 CLI
```

### 6.2 运行自驱回环测试

```bash
cd cli
zcam ui dev cycle --timeout 5000
```

预期输出应包含：
- `ball mounted` 与 `ball unmounted` 两条 DevReport 消息。
- 各阶段的耗时。
- 成功/失败的判定结论。

---

## 七、后续文档与维护建议

- 本文档 (`DEV-PLAN.md`) 与 `AGENTS.md` 一起构成 UI Desktop 的完整技术指引。
- 每当新增窗口级命令或关键业务命令时，在本文档附录扩展 `DevCommand`。
- 每当新增或修改核心 UI 行为（比如新增模态或滚动规则），在本文档同步写一条“测试验证规则”，以保证自测覆盖。
- CLI 的 `zcam ui dev` 模块可继续增加子命令（`stress`、`rules`、`report`），以支撑更复杂的自动化用例。

---

## 八、补充：命令行参数与配置

- `ZCAM_UI_DEV_PORT`：默认 `6223`，可调整端口或冲突场景。
- `--timeout`（ms）：`cycle` 各阶段的最大等待时间，默认 `5000`。
- `--loop`：指定循环次数，用于压测或批量 CI 测试。
- `--json`：计划支持将测试结果以 JSON 输出，便于 CI 聚合与比较。

---

> 本文档随代码演进同步更新。在每次改动 `DevCommand` / `DevReportPayload` / `DevChannel` 逻辑后，请同步在此说明影响。
