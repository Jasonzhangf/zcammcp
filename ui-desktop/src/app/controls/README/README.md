# Controls Layer

本目录用于存放 **业务控件模块**，每个控件独立成小模块，具备如下特征：

- 有自己的目录: 例如 `image/ShutterSelect/`、`image/IsoSelect/`、`ptz/ZoomSlider/`。
- 目录内包含:
  - `config.ts` (或同类文件): 控件配置 (nodePath/kind/operationId/options/readValue/formatValue)。
  - `Control.tsx` (控件主组件): 负责 UI + PageStore 调用, 通过框架层能力运行业务操作。
  - `*.test.ts` (可选): 单元测试, 覆盖 config 和交互逻辑。
- 控件模块彼此隔离, 不直接相互 import。
- 控件模块不修改 `framework/` 层 API, 只使用其公开能力 (`PageStore`, `OperationRegistry`, `CoreModal` 等)。

页面层 (`pages/`) 不再直接编写控制逻辑, 而是通过引用控件模块并组合布局来完成 UI。
