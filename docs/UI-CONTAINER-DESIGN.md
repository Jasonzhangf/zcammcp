# UI Container & Event System Design

## 1. Container Model
- **Data Structure**
  ```ts
  interface ContainerState {
    id: string;
    parentId?: string;
    kind: 'page' | 'group' | 'control';
    bounds: { x: number; y: number; width: number; height: number };
    visible: boolean;
    ui: {
      debugMode?: 'off' | 'outline' | 'verbose';
      background?: string;
      textColor?: string;
      opacity?: number;
      zIndex?: number;
    };
    data: Record<string, unknown>;
    errors: ContainerError[];
    updatedAt: number;
  }
  ```
- 页面（root）、组（PTZ、图像等）、控件（slider、button）都使用 ContainerState。
- `bounds` 采用相对父容器的坐标/尺寸；父容器更改时，根据子节点 constraints 自动计算布局，默认不重叠。
- `data` 用于模块业务状态（PTZ 值、图像参数）；框架不限制具体字段。

## 2. Subscriptions & CLI
- ContainerStore 提供 `subscribe(containerId, listener)`，React 组件通过 `useContainerState(id)` 仅监听自身容器。
- StateHost/CLI 扩展：
  - `container.setVisibility {id, visible}`
  - `container.setBounds {id, x, y, width, height}`
  - `container.setStyle {id, ui: {...}}`
  - `container.setData {id, patch}`
  - `container.getState {id}` 返回当前完整状态
- UI/CLI 可以通过这些接口动态控制每个容器的显示、位置、样式和业务状态，满足“独立订阅 + 独立控制”需求。

## 3. Error Center & Message Bus
- **ErrorStore**：容器调用 `reportError(id, error)` 后，ErrorStore 记录 `{ containerId, code, message, severity, timestamp }` 并广播；订阅方式与容器状态一致，也会同步到 StateHost `/state?channel=errors`。
- **MessageBus**：采用 `{ from, to?, topic, payload }` 的结构；支持广播（to 为空）或定向消息。提供 `subscribe(topic)`、`subscribeByTarget(id)` API。
- CLI/外部脚本也可通过 StateHost `/command` 发送消息，实现“from xxx to xxx”的交互链路。

## 4. Layout & Appearance
- 容器状态统一包含 `visible`、`bounds`、`ui.*` 等属性，CLI/消息可以即时修改（设置不可见、调试模式、背景色、字体色等）。
- 子容器继承父容器的约束，可通过配置实现自动对齐、不重叠或允许重叠等策略。
- 每个容器（包括控件）可单独设置外观/调试样式，方便在调试模式下高亮、描边或隐藏。

## 5. Integration Plan
1. 引入 ContainerStore，并在 PageStore 初始化时注册页面根容器。
2. PTZ/图像/快捷方式组改为容器节点，组件使用 `useContainerState` 渲染布局与状态。
3. 扩展 StateHost/CLI 支持 container 系列命令。
4. 接入 ErrorStore、MessageBus，确保订阅/广播流程一致。
5. 更新文档、Mock 模式与 CLI 测试用例。
