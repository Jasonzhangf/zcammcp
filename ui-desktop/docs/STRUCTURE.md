# ui-desktop 目录结构（简版）

```
ui-desktop/
├─ src/                      # TypeScript 源码
│  ├─ app/
│  │  ├─ components/         # React 包装组件 (PageShell/Slider/Toggle/Modal 等)
│  │  ├─ controls/           # 业务控件目录 (image/*, ptz/*)
│  │  ├─ framework/
│  │  │  ├─ container/       # ContainerNode 元数据
│  │  │  ├─ operations/      # OperationRegistry + 业务操作
│  │  │  ├─ state/           # PageStore / ViewState
│  │  │  ├─ ui/              # 框架 UI (BaseControl、DevChannel 等)
│  │  │  └─ transport/       # CLI 通道抽象
│  │  ├─ hooks/              # usePageStore 等
│  │  └─ pages/
│  │     ├─ main/            # 主页面 (status/ptz/imageControl...)
│  │     └─ ball/            # 悬浮球页面
│  └─ styles/                # 全局样式
├─ assets/                   # 静态资源 (ball HTML/logo 等)
├─ dist-web/                 # Vite 构建产物 (index.html + bundle)
├─ dist/                     # ts-node build 输出 (electron 主/预加载)
├─ docs/                     # 文档 (结构说明 / 测试计划等)
├─ scripts/                  # start-dev / one-key-package 等脚本
├─ electron.main.ts          # Electron 主进程入口
├─ electron.preload.ts       # 预加载脚本（暴露 electronAPI）
├─ vite.config.mts           # Vite 配置
└─ package.json / tsconfig.json
```
