# UI Desktop 功能总览

## 一、窗口行为

### 1.1 主窗口
- **尺寸**：默认 1200×720，可拖放缩放，自动记忆最后位置。
- **最小化**：最小化到任务栏，图标点击恢复。
- **缩小成球**：点击 ⚪ 按钮（或消息 `ui.window.shrinkToBall`）→ 主窗口隐藏，72×72 悬浮球出现，始终置顶。
- **恢复**：双击球（或消息 `ui.ball.doubleClick`/`ui.window.restoreFromBall`）→ 球销毁，主窗口恢复到原尺寸/位置。
- **贴边隐藏**：点击 ⇔ 按钮 → 窗口贴边（右/左）自动隐藏，鼠标靠近时滑出。
- **关闭**：点击 × 按钮 → 应用退出。
- **单实例**：第二次启动自动聚焦已有窗口，不会重复打开。

### 1.2 悬浮球（Ball）
- **尺寸**：72×72 像素，圆角 12 px，渐变背景，中心放置 Logo。
- **行为**：
  - 可拖动（`WebkitAppRegion: drag`）。
  - 双击任意位置 → 恢复主窗口。
  - 点击 Logo 也可恢复。
  - 始终置顶，无边框、透明背景，无滚动条。
- **Dev 上报**：自动上报 `mounted/updated/unmounted` 与滚动条信息，供 CLI 观测。

## 二、控件层（BaseControl）

所有业务控件统一继承 `BaseControl`，自动具备：

| 能力 | 说明 |
|------|------|
| 生命周期上报 | `mounted/updated/unmounted` + DOM 尺寸 + 滚动条 |
| 交互耗时 | `wrapInteraction(fn)` 自动测量并上报 `responseMs` |
| 错误捕获 | `wrapInteraction` 内异常 → `DevReport { type: 'error' }` |
| Dev 命令响应 | `ping/measure/highlight` 以及窗口级 `ui.window.*` / `ui.ball.*` |
| 滚动条检测 | `scrollInfo.hasHorizontalScrollbar / hasVerticalScrollbar` |

### 2.1 已迁移控件

| 控件 | 文件 | 备注 |
|------|------|------|
| Slider（滑块） | `src/app/components/SliderControl.tsx` + `src/app/framework/ui/controls/SliderControl.ts` | 支持 `disabled`，自动上报交互耗时 |
| Toggle（开关） | `src/app/components/ToggleControl.tsx` + `src/app/framework/ui/controls/ToggleControl.ts` | 同上 |
| 快门选择（模态） | `src/app/controls/image/ShutterSelect/ShutterSelect.tsx` + `ShutterSelectControl.ts` | 基于 `ModalSelectControlBase` |
| ISO 选择（模态） | `src/app/controls/image/IsoSelect/IsoSelect.tsx` + `IsoSelectControl.ts` | 同上 |
| 球窗口 | `src/app/pages/ball/BallClient.ts` | 极轻量，只关注整体尺寸/滚动条/交互 |

### 2.2 控件目录（后续新增按此结构）

```
src/app/controls/
├─ image/
│  ├─ ShutterSelect/
│  ├─ IsoSelect/
│  ├─ BrightnessSlider/
│  ├─ ContrastSlider/
│  ├─ SaturationSlider/
├─ ptz/
│  ├─ ZoomSlider/
│  ├─ SpeedSlider/
│  ├─ FocusSlider/
│  ├─ FocusToggle/
│  ├─ TemperatureSlider/
```

**规则**：
- 每个控件一个目录，目录内包含：
  - `config.ts`：描述 nodePath、操作 ID、选项、读值/格式化函数。
  - `xxxControl.ts`：继承 `BaseControl` 的纯 DOM 实现。
  - `xxxSelect.tsx`：React 包装，负责实例化与挂载/卸载。
- 目录层级与 `data-node-path` 对应，便于定位与调试。

## 三、消息系统（DevChannel）

### 3.1 观测消息（UI → 主进程 → CLI）

- **协议**：`DevReportPayload`（JSON 每行一条）。
- **通道**：TCP Dev Socket（默认 6223）。
- **内容**：
  - 控件生命周期（mounted/updated/unmounted）。
  - 交互事件（event + responseMs）。
  - 错误（error 文本）。
  - 滚动条信息（hasHorizontalScrollbar / hasVerticalScrollbar）。

### 3.2 控制消息（CLI → 主进程 → UI）

- **协议**：`DevCommand`（通过 Dev Socket 下发）。
- **命令**：
  - `ping`：控件回 pong。
  - `measure` / `dumpState`：立即重测并上报。
  - `highlight`：给控件加红框 2 秒。
  - `ui.window.shrinkToBall`：主窗口缩小成球。
  - `ui.window.restoreFromBall`：主窗口从球恢复。
  - `ui.ball.doubleClick`：模拟双击球恢复。

### 3.3 使用方式

```bash
# 实时监控
cd cli
zcam ui dev watch

# 高亮控件
zcam ui dev highlight "zcam.camera.pages.main.exposure.shutter"

# 自驱动回环测试（缩成球 → 双击恢复 → 验证）
zcam ui dev cycle --timeout 5000 --loop 10
```

## 四、CLI 命令速查

| 命令 | 说明 |
|------|------|
| `zcam ui dev watch` | 实时监听所有 DevReport，打印尺寸、滚动条、交互耗时、错误 |
| `zcam ui dev ping` | 广播 ping，验证通道连通 |
| `zcam ui dev highlight <controlId>` | 高亮指定控件，便于定位 |
| `zcam ui dev cycle [--timeout <ms>] [--loop <n>]` | 自动执行 shrinkToBall → 等待 ball mounted → doubleClick → 等待 ball unmounted，输出每轮耗时与成功/失败 |

## 五、测试规则（已固化）

1. **ball 窗口不得出现滚动条**  
   - 在 `ball mounted` 事件中检查 `scrollInfo.hasHorizontalScrollbar/hasVerticalScrollbar`。
   - 若任一为 true，则本轮测试失败，并提示“球窗口出现滚动条”。

2. **缩成球与恢复必须在超时内完成**  
   - 默认 5 秒，可通过 `--timeout` 调整。
   - 任一阶段超时 → 失败。

3. **恢复后主窗口应可交互**（可选扩展）  
   - 可在恢复后再发 `highlight` 给关键控件，确认 `updated`/`interaction` 出现。

4. **多轮压测**  
   - `--loop N`：连续跑 N 轮，统计成功率与平均耗时。

## 六、开发与维护建议

- 新增控件必须继承 `BaseControl`，并确保 `mounted/updated/unmounted` 上报完整。
- 新增窗口级行为（如贴边/全屏）时，在 `DevCommand` 里加一条 `ui.window.*`，并在对应页面订阅处理。
- 每次改动后，用 `zcam ui dev cycle --loop 10` 跑一轮，确认无滚动条、无超时、无错误。
- 若出现新滚动条或布局异常，优先通过 `DevReport` 中的 `scrollInfo` 定位，再修复 CSS 或尺寸逻辑。
- 本文档与 `DEV-PLAN.md` 同步更新，任何消息协议或规则变更请在此记录。

---

> 本文档随代码演进同步更新。在每次改动 `DevCommand` / `DevReportPayload` / 控件行为后，请同步在此说明影响。
