# PTZ UI 设计说明

本目录下是主界面 PTZ 分区的 UI 实现 (`PtzCard` / `FocusGroup`)，结合页面框架中的 PageStore/ControlConfig 实现配置驱动的控件渲染。

## 1. 控件结构

- 方向区域 (`PtzCard.tsx`)
  - 九宫格方向键: 数据路径 `zcam.camera.pages.main.ptz.move*`，后续通过 Operation 发送按住移动/松开停止的命令。
  - Zoom/Speed 滑块: 通过 `SliderControl` 渲染, 配置见 `zoomSliderConfig`/`speedSliderConfig`。

- Focus 区域 (`FocusGroup.tsx`)
  - Focus slider: `SliderControl` + `SliderControlConfig`，横向布局，绑定 `ptz.setFocus`。
  - AF/MF 开关: 本地 UI 状态 + 后续接入 `ptz.setFocusMode` Operation。
  - Focus 限位: "远"/"近" 两个 preset 按钮 + "编辑" 开关，后续通过 Operation 更新 preset 值。

## 2. 控件配置 (ControlConfig)

所有控件配置都从 `BaseControlConfig` 派生，包含:

- `nodePath`: 容器路径, 如 `zcam.camera.pages.main.ptz.zoom`；
- `kind`: 功能种类, 如 `ptz.zoom`；
- `label`: 控件标签；
- `operationId`: 写操作 id, 由 `OperationRegistry` 注册。

Slider 使用 `SliderControlConfig`:

- `orientation`: `'vertical' | 'horizontal'`，决定控件是竖向还是横向；
- `size`: `'small' | 'medium' | 'large'`，决定控件宽度；
- `valueRange`: `{ min, max, step }`；
- `readValue(view: ViewState)`: 从 PageStore 的 ViewState 中读当前值；
- `formatValue?`: 可选显示文本转换。

## 3. Focus 行为

- AF 模式:
  - Focus slider 被禁用 (`disabled=true`)，只显示实际值，不响应拖动/滚轮；
  - 后续通过订阅相机状态 (WebSocket) 自动更新数值。

- MF 模式:
  - Focus slider 解锁，可拖动，`runOperation(ptz.setFocus)` 写入设定值；
  - 每次操作的设定值会用于更新限位 preset (见下一节)。

- 限位编辑模式:
  - 打开 "编辑" 开关后自动切 MF；
  - 点击 "远" 或 "近" 跳到对应 preset 值，用户可以用 slider 微调；
  - 调整后不需要显式保存，最新值即作为新的 preset；
  - 关闭 "编辑" 时自动切回 AF, 并发送一次汇总的 focus ranged 更新操作。

## 4. Setting vs Status 订阅模型 (草案)

后续将按以下模式扩展:

- PageStore 中的 `cameraState` 将区分设定值 (setting) 和实际状态 (status)，例如:
  - `cameraState.ptz.focus = { value: number; actual: number; view: string }`；
- WebSocket / 相机服务通过专用入口将 status 更新到 `actual` 字段；
- 控件的 `readValue` 选择使用 setting 或 status:
  - Focus slider 在 AF 模式使用 `actual`，在 MF 编辑模式使用 `value`；
  - 其他 slider 类似，可通过在配置中约定字段来解析。

该订阅机制和字段约定将记录在 `docs/ui-design-spec.md` 中，并在实现时保持与 PTZ 控件行为一致。

