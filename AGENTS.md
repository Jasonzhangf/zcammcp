# AGENTS — UI Desktop 研发计划与自动化测试计划

> 最近更新：2025-12-08

## I. 项目结构（UI Desktop）

```
ui-desktop/
├─ src/app/                  # React / TS 源码
│  ├─ components/            # PageShell、WindowControls 等通用组件
│  ├─ controls/              # 业务控件 (image/ptz/...)（当前最小窗口样例中未启用复杂控件）
│  ├─ framework/             # PageStore、UiSceneStore、WindowCommands、OperationRegistry 等
│  ├─ hooks/                 # usePageStore/useViewState 等
│  └─ pages/                 # main/ball 等页面
├─ assets/                   # 静态资源（球窗口 HTML、logo 等）
├─ dist-web/                 # Vite build 产物（index.html + bundle）
├─ dist/                     # electron 主进程 + preload 编译产物
├─ docs/                     # 功能说明、结构、测试计划
│  ├─ STRUCTURE.md           # 目录结构
│  ├─ FUNCTIONS.md           # 功能总览
│  ├─ DEV-PLAN.md            # 可观测与消息系统落地状态
│  └─ TEST-RULES.md          # 自动化测试规则
├─ electron.main.cjs         # Electron 主进程（窗口管理，CJS）
├─ electron.preload.cjs      # 预加载脚本（向 window 暴露 electronAPI，CJS）
├─ scripts/start-dev.sh      # 启动 Vite + Electron（开发模式）
└─ package.json / tsconfig.json
```

## II. 功能与消息系统现状

### 2.1 控件可观测性（已完成）
- 所有控件继承 `BaseControl`，自动上报：
  - `mounted/updated/unmounted` + DOMRect + ScrollInfo。
  - `interaction` (事件 + 响应耗时 ms)。
  - `error`（异常断言）。
  - `hasHorizontalScrollbar/hasVerticalScrollbar`。
- `DevCommand` 支持 `ping/dumpState/measure/highlight` + 窗口级命令 `ui.window.*`。
- `DevChannelImpl` 把控件事件通过 IPC → Dev Socket → CLI。

### 2.2 窗口与球行为
- 主窗口订阅 `ui.window.shrinkToBall / ui.window.restoreFromBall` 消息，自动收缩/恢复。
- 球窗口（BallPage）订阅 `ui.ball.doubleClick`，模拟双击恢复。
- BallClient 自动上报 `ball` 的 `mounted/unmounted/interaction` 与滚动条状态。

### 2.3 CLI 调试与测试命令
- `zcam ui dev watch`：实时打印 DevReport（含尺寸、滚动条、交互、错误）。
- `zcam ui dev ping`：验证通道连通。
- `zcam ui dev highlight <nodePath>`：高亮控件。
- `zcam ui dev cycle [--timeout <ms>] [--loop <n>]`：
  - 自动消息驱动：shrink → 等 ball.mounted → doubleClick → 等 ball.unmounted。
  - 每个阶段有超时、滚动条等规则；FAIL 则 CLI 退出码 ≠ 0。

## III. 自动化测试计划

详见 `ui-desktop/docs/DEV-PLAN.md` 与 `ui-desktop/docs/TEST-RULES.md`，核心要点：

1. **缩小为球阶段**：
   - 发 `ui.window.shrinkToBall`。
   - 等 `ball.mounted`，检查 `scrollInfo` 无滚动条。
   - 超时或出现滚动条 → FAIL。

2. **恢复阶段**：
   - 发 `ui.ball.doubleClick`（模拟双击球）。
   - 等 `ball.unmounted`。
   - 超时 → FAIL。

3. **可选扩展**：恢复后高亮关键控件，确保 UI 仍响应。

4. **压测**：`--loop N` 连跑 N 轮，统计成功率与耗时。

5. **CI 建议**：
   ```yaml
   - name: Build UI Desktop
     run: |
       cd ui-desktop
       npm run build
       npm run build:electron
       NODE_ENV=development npm run electron &
       sleep 10
   - name: Run UI Cycle Tests
     run: |
       cd cli
       npm start -- ui dev cycle --loop 50 --timeout 5000
   ```

## IV. 维护规则

- **消息协议**：如有改动 `DevReport/DevCommand`，同步更新 `DEV-PLAN.md` / `TEST-RULES.md` / `FUNCTIONS.md`。
- **控件开发**：新增控件必须继承 `BaseControl`，目录结构遵守 `controls/<domain>/<ControlName>/`。
- **窗口行为**：所有窗口级动作通过 `DevCommand` 消息驱动，按钮点击只是某种消息发送方式。
- **测试**：每次功能改动至少本地跑 `zcam ui dev cycle --loop 10`，确保可观测和恢复链路无回归。
- **文档**：更新功能或测试策略时，同步维护 `docs/*.md`，保持 AGENT、开发计划、测试规则一致。

## V. TODO / Roadmap

1. [ ] `cycle` 命令增加滚动条规则（默认开启）。
2. [ ] `cycle` 增加恢复后控件 heartbeat 检查（比如 `statusCard` 的 `updated`）。
3. [ ] `cycle --json` 输出，便于 CI 聚合结果。
4. [ ] 扩大消息系统：贴边、全屏、Dock 等窗口行为也通过命令控制。
5. [ ] 控件层增加更多自动化规则（例如 slider 是否超出范围、modal 是否关闭）。

> 下一步：根据实际需求，优先完成 TODO #1/#2，逐步完善“自动回环测试系统”。
