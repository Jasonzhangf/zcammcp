## ZCAM CLI Service Daemon

`service/cli-daemon/cli-service.cjs` 是一个常驻 Node 服务，用于统一调度 `zcam` CLI 命令并缓存执行结果。它的作用：

1. **监听 HTTP 接口**（默认 `http://127.0.0.1:6291`）：
   - `GET /health`：健康检查。
   - `GET /state`：返回最近一次命令的状态、stdout/stderr。
   - `POST /run`：执行 CLI 命令。请求体示例：
     ```json
     {
       "args": ["uvc", "status", "--json"],
       "timeoutMs": 10000,
       "expectJson": true
     }
     ```

2. **内部通过 `spawn node <cli/src/index.js ...>` 调用真实 CLI**，并将结果缓存在内存里，方便 Electron / 测试脚本获取。

3. **与 UI/Electron 集成**：`electron.main.cjs` 会在启动时自动确保该服务运行，再通过 `CLI service -> RealCliChannel` 间接执行所有命令。这样 UI 控件触发的操作对用户仍是透明的，但我们可以在 `/state` 或 StateHost 中追踪每次调用。

### 启动
```powershell
cd D:\github\zcammcp
node service\cli-daemon\cli-service.cjs
```

Environment 变量：
- `ZCAM_CLI_SERVICE_HOST` / `ZCAM_CLI_SERVICE_PORT`：监听地址/端口（默认 `127.0.0.1:6291`）。
- `ZCAM_CLI_ROOT` / `ZCAM_CLI_ENTRY` / `ZCAM_NODE_BIN`：自定义 CLI 路径或 Node 可执行文件。
- `ZCAM_CLI_TIMEOUT`：单次命令默认超时（毫秒）。
- `ZCAM_CLI_ALLOW_ORIGIN`：可选，设置 `Access-Control-Allow-Origin`（默认 `*`），方便浏览器模式下的 UI 直接通过 HTTP 调用该服务。

将来可通过 `sc.exe`、`nssm` 等方式把该脚本注册为 Windows 系统服务，实现真正的开机自启。Electron 应用也会在启动时自动检查/拉起此服务。*** End Patch*** End Patch to=functions.apply_patch зия Remarks:	Errznychного
