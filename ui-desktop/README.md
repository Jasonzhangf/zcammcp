# ui-desktop - ZCAM Desktop UI

`ui-desktop/` 是 ZCAM 相机控制的桌面 UI 子项目，基于 TypeScript + Electron (后续接入)，通过唯一 CLI 管道与相机通信。

本目录分为两层：

- `src/app/framework/`：UI 框架层，定义容器模型、页面数据中心、操作机制、CLI 通道和持久化/日志，不包含 ZCAM 业务逻辑。
- `src/app/pages/`：具体的页面和控件实现（PTZ、曝光、白平衡、快捷栏等），通过路径和 kind 映射到框架。

详细设计见仓库根目录 `docs/ui-design-spec.md`。

## 快速命令

```bash
cd ui-desktop
npm install
npm run build   # 编译 TypeScript 到 dist/
npm test        # 运行框架层测试
npm run ci      # build + test, 供 CI 调用
```

## 目录结构概览

```text
ui-desktop/
  src/app/
    framework/
      container/          # ContainerNode 定义
      state/              # PageStore / CameraState / UiState
      operations/         # OperationRegistry
      transport/          # CliChannel 抽象 + mock
      persistence/        # PagePersistence / PreferencesPersistence / SnapshotPersistence
      logging/            # IoLogWriter 等
    pages/
      main/
        index.tsx         # MainPage 入口
        status/StatusCard.tsx
        ptz/PtzCard.tsx
        # 后续: imageControl / shortcuts 等
```

新控件开发流程请参考 `docs/ui-design-spec.md` 第 7 节“新控件开发流程”，以及 `AGENTS.md` 中的 UI 开发规范。

