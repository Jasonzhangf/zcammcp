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
- **StateHost 服务**：UI 启动时在 `127.0.0.1:${ZCAM_STATE_PORT||6224}` 暴露 HTTP 状态服务，维护 `window/ui/cli/services` 状态树；所有 `zcam ui window ...` 命令通过 `/command`、`/state` 与 Electron 主进程闭环。

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

1. [x] `cycle` 命令增加滚动条规则（默认开启）。
2. [x] `cycle` 增加恢复后控件 heartbeat 检查（比如 `statusCard` 的 `updated`）。
3. [ ] `cycle --json` 输出，便于 CI 聚合结果。
4. [ ] 扩大消息系统：贴边、全屏、Dock 等窗口行为也通过命令控制。
5. [ ] 控件层增加更多自动化规则（例如 slider 是否超出范围、modal 是否关闭）。

> 下一步：根据实际需求，优先完成 TODO #1/#2，逐步完善“自动回环测试系统”。

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd sync
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds

## VI. 任务管理与 Beads 工作流

本项目使用 `bd` (beads) 进行任务管理，遵循以下规则：

### 6.1 分支策略
- **main 分支**：受保护分支，必须通过测试矩阵才能推送
- **功能分支**：每个 feature 必须建立独立分支，命名格式：
  - `feature/<功能名>` - 新功能开发
  - `epic/<主题名>` - 大型史诗任务
  - `fix/<问题描述>` - 问题修复
  - `refactor/<重构描述>` - 代码重构

### 6.2 推送门限 (Push Gate)
```bash
# pre-push hook 强制执行
# 推送前本地必须通过测试矩阵
./scripts/run-push-gate-tests.sh
```

**矩阵检查项：**
1. CLI 单元测试
2. UI Desktop 单元测试  
3. UI Cycle 端到端测试

**规则：**
- ✓ 功能分支：可推送远端，但合并到 main 前必须通过矩阵
- ✗ main 分支：未通过测试矩阵禁止推送
- 测试报告有效期：30 分钟

### 6.3 代码分析
代码分析优先使用 `lsp-code-analysis` skill：
```bash
# 1. 更新 LSP 索引
./scripts/update-lsp-index.sh

# 2. 启动 LSP 服务
lsp server start /Volumes/extension/code/zcammcp

# 3. 使用语义导航
lsp definition <file> <line> <column>
lsp references <file> <line> <column>
lsp symbols <file>
```

### 6.4 Beads 命令速查
```bash
# 查看任务状态
bd status
bd list

# 创建任务
bd create --title "任务标题" --body "详细描述"

# 创建史诗任务
bd epic create --title "UI CLI 化重构" --body "..."

# 添加子任务
bd epic add-child <epic-id> <child-id>

# 查看依赖图
bd graph

# 标记任务状态
bd set-state <id> in_progress
bd close <id>

# 同步到 git
bd sync
```

## VII. 技能引用 (Skills)

本项目可用 Codex Skills：

- **lsp-code-analysis**：语义代码分析，用于导航、重构、符号查找
  - 路径：`/Users/fanzhang/.codex/skills/lsp-code-analysis/SKILL.md`

- **frontend-code-review**：前端代码审查，检查性能、代码质量
  - 路径：`/Users/fanzhang/.codex/skills/frontend-code-review/SKILL.md`

- **reviewing-code**：通用代码审查
  - 路径：`/Users/fanzhang/.codex/skills/reviewing-code/SKILL.md`

使用技能时，先阅读 SKILL.md 了解工作流程。

## VIII. 当前 Epic：UI CLI 化重构

**分支**: `epic/ui-cli-refactor`

### 目标
1. **UI CLI 化**：UI 每个功能都能通过 CLI 控制
2. **状态管理分离**：UI 与状态管理解耦
3. **生命周期管理**：控件生命周期可观测、可测试
4. **性能优化**：单线程约束下的渲染优化

### 子任务
见 beads 任务列表 (`bd list`)

### 开发流程
1. 在此分支开发功能
2. 运行 `./scripts/run-push-gate-tests.sh` 通过测试矩阵
3. 提交并推送：`git push origin epic/ui-cli-refactor`
4. 功能完成后创建 PR 合并到 main
