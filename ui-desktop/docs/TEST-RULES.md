# UI Desktop 自动测试规则（消息驱动）

## 一、测试目标

验证“主窗口 → 缩小成球 → 双击球 → 恢复主窗口”这一完整链路：
- 所有动作由**消息驱动**（无人工点击）。
- 全程通过**DevReport 消息流**感知状态变化。
- 每一步都有**超时与规则检查**，失败即中断并给出原因。

## 二、测试命令

```bash
zcam ui dev cycle [--timeout <ms>] [--loop <n>]
```

- `--timeout`：单阶段最大等待时间（默认 5000 ms）。
- `--loop`：连续跑 N 轮（默认 1），用于压测。

## 三、测试阶段与规则

### 阶段 1：缩小为球（Shrink）

1. 发消息：`{ target: 'broadcast', cmd: 'ui.window.shrinkToBall' }`
2. 等待 DevReport：
   - `controlId === 'ball'` 且 `type === 'mounted'`。
3. **规则 A（滚动条）**：
   - 必须 `scrollInfo.hasHorizontalScrollbar === false` 且 `hasVerticalScrollbar === false`。
   - 若任一为 true → **FAIL**（提示“球窗口出现滚动条”）。
4. **规则 B（超时）**：
   - 若 5 秒内未收到 `ball.mounted` → **FAIL**（提示“等待 ball 挂载超时”）。

### 阶段 2：模拟双击球恢复（Double-Click）

1. 发消息：`{ target: 'broadcast', cmd: 'ui.ball.doubleClick' }`
2. 等待 DevReport：
   - `controlId === 'ball'` 且 `type === 'unmounted'`。
3. **规则 C（超时）**：
   - 若 5 秒内未收到 `ball.unmounted` → **FAIL**（提示“等待 ball 卸载超时”）。

### 阶段 3：恢复后主 UI 可用性（可选扩展）

1. 发消息：`{ target: 'broadcast', cmd: 'highlight', controlId: 'zcam.camera.pages.main.status' }`
2. 等待 DevReport：
   - `controlId === 'zcam.camera.pages.main.status'` 且 `type === 'updated'`（或 `interaction`）。
3. **规则 D（可用性）**：
   - 若 3 秒内无响应 → **WARN**（提示“主窗口恢复后关键控件无响应”）。
   - 本轮仍算 **PASS**，但记录警告。

## 四、结果判定与输出

- **PASS**：阶段 1、2 均在超时内完成，且未触发规则 A/B/C；阶段 3 可选通过。
- **FAIL**：任一阶段超时或规则 A/B/C 触发；CLI 退出码 ≠ 0。

**输出示例（单轮成功）**：

```text
步骤 1: 请求窗口缩小为悬浮球
步骤 2: 等待 ball 挂载 (DevReport mounted: controlId=ball)...
[2025-12-07T08:50:12.123Z] ✓ [ball] mounted 用时 34ms rect={x:1120,y:560,w:72,h:72} scroll(h=false,v=false)
步骤 3: 发送 ball.doubleClick (restoreFromBall) 命令
步骤 4: 等待 ball 卸载 (DevReport unmounted: controlId=ball)...
[2025-12-07T08:50:13.456Z] ✓ [ball] unmounted 用时 12ms
✓ 回环测试完成: shrink -> ball mounted -> restore -> ball unmounted
```

**输出示例（失败）**：

```text
步骤 1: 请求窗口缩小为悬浮球
步骤 2: 等待 ball 挂载 (DevReport mounted: controlId=ball)...
[2025-12-07T08:51:00.000Z] ✗ [ball] mounted 滚动条检测失败: hasHorizontalScrollbar=true
✗ 回环测试失败: 球窗口出现滚动条
```

## 五、压测与统计

```bash
zcam ui dev cycle --loop 100 --timeout 5000
```

- 连续跑 100 轮，每轮独立计时。
- 最终输出：
  - 总轮次、成功数、失败数、成功率（%）。
  - 平均耗时（shrink→mounted、doubleClick→unmounted）。
  - 失败原因分布（滚动条、超时、其他）。

## 六、CI 集成建议

- 在 GitHub Actions / Jenkins 中增加一步：
  ```yaml
  - name: UI Desktop 回环测试
    run: |
      cd ui-desktop && npm run build && npm run build:electron
      NODE_ENV=development npm run electron &
      sleep 10
      cd ../cli && npm start -- ui dev cycle --loop 50 --timeout 5000
  ```
- 若 exit code ≠ 0 → 标记构建失败。
- 可将 `--json` 输出保存为 artifact，用于趋势分析。

## 七、规则更新流程

1. 新增规则 → 在本文档“阶段”与“规则”小节补充说明。
2. 实现规则 → 在 `cli/src/modules/ui.js` 的 `cycle` 命令里增加对应判断逻辑。
3. 文档同步 → 更新本文档，并在 PR 描述中引用规则编号（如“规则 A”）。
4. 回归验证 → 本地跑 `zcam ui dev cycle --loop 10` 确认无 regression。

---

> 本文档与 `DEV-PLAN.md`、`FUNCTIONS.md` 一起构成 UI Desktop 的完整测试与功能说明。任何消息协议或规则变更请在此记录。
