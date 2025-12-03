# Z CAM CLI 手动验证追踪

此文档用于跟踪 `cli/` 目录下官方 CLI 的分批测试执行情况。每批测试完成后请在对应表格中记录结果，确保覆盖所有核心功能。

## 批次概览

| 批次 | 目标 | 状态 | 备注 |
| ---- | ---- | ---- | ---- |
| 1 | 基础连接与相机信息 (`camera info/status`) | ✅ 完成 | 2024-?? camera info/status/timeout 验证 |
| 2 | PTZ 控制 (`control ptz/zoom/focus...`) | ✅ 完成 | 运行 query/move/zoom/stop/非法方向 |
| 3 | 录制控制 (`record start/stop/status`) | ⚠️ 部分通过 | `record status` 正常；start/stop 返回 code=-1（需确认相机模式/权限） |
| 4 | 流媒体 (`stream rtmp/srt/ndi...`) | ⚠️ 部分通过 | `stream rtmp query` 正常；start 返回 code=-1 |
| 5 | 预设管理 (`preset save/recall/list`) | ⚠️ 部分通过 | save/recall 返回 code=0，list API 响应为空 |
| 6 | 配置与收藏 (`config favorites`/多相机场景) | ☐ 未执行 |  |
| 7 | 错误注入（超时、无效 host、权限/参数错误） | ☐ 未执行 |  |

请在执行后将「状态」更新为 ✅ 并在「备注」说明主要发现或引用下方详细记录。

---

## 批次 1：基础连接

| 命令 | 期望 | 执行时间 | 结果 | 备注 |
| ---- | ---- | ---- | ---- | ---- |
| `node cli/src/index.js --host 192.168.9.59 --port 80 --timeout 10000 --json camera info` | 返回 `/info` JSON | 2024-?? | ✅ | 返回完整信息（类型/固件/feature），说明与相机连通 |
| `node cli/src/index.js --host 192.168.9.59 --port 80 --timeout 10000 camera info` | 默认表格输出 | 2024-?? | ✅ | 表格列出 cameraName/nickName/feature 等 |
| `node cli/src/index.js --host 192.168.9.59 --port 80 --timeout 10000 camera status` | 显示 `/camera_status` | 2024-?? | ✅ | 输出 isp/sync/https 等状态 |
| `node cli/src/index.js --host 192.168.9.59 --port 80 --timeout 1 camera info` | 超时或参数错误提示 | 2024-?? | ⚠️ | 由于 CLI 强制最小 timeout=1000，命令被参数校验拒绝（提示“无效的超时时间: 1”），说明验证生效；如需测试实际超时，可用 >1000 的值并断开网络 |

## 批次 2：PTZ 控制

| 命令 | 期望 | 执行时间 | 结果 | 备注 |
| ---- | ---- | ---- | ---- | ---- |
| `node cli/src/index.js --host 192.168.9.59 ... control ptz query` | 表格显示 connected/status | 2024-?? | ✅ | 返回 connected=true/flip=true 等字段 |
| `node cli/src/index.js --host 192.168.9.59 ... control ptz move up 5` | code=0 | 2024-?? | ✅ | 相机响应 {code:0}；随后执行 stop |
| `node cli/src/index.js --host 192.168.9.59 ... control ptz stop` | 停止成功 | 2024-?? | ✅ | 返回 code=0 |
| `node cli/src/index.js --host 192.168.9.59 ... control zoom in 3` | 启动变焦 | 2024-?? | ✅ | 变焦后可执行 `control zoom stop` |
| `node cli/src/index.js --host 192.168.9.59 ... control zoom stop` | 停止变焦 | 2024-?? | ✅ | code=0 |
| `node cli/src/index.js --host 192.168.9.59 ... control ptz move foo 5` | 参数校验失败 | 2024-?? | ✅ | CLI 提示“无效的方向: foo ...” |

## 批次 3：录制控制

| 命令 | 期望 | 执行时间 | 结果 | 备注 |
| ---- | ---- | ---- | ---- | ---- |
| `node cli/src/index.js --host 192.168.9.59 ... record status` | 显示录制状态 | 2024-?? | ✅ | 返回 code=0 |
| `node cli/src/index.js --host 192.168.9.59 ... record start` | 相机进入录制 | 2024-?? | ⚠️ | 返回 code=-1，怀疑当前模式不允许；需在相机 UI 确认 |
| `node cli/src/index.js --host 192.168.9.59 ... record stop` | 停止录制 | 2024-?? | ⚠️ | 同上，code=-1 |

## 批次 4：流媒体

| 命令 | 期望 | 执行时间 | 结果 | 备注 |
| ---- | ---- | ---- | ---- | ---- |
| 命令 | 期望 | 执行时间 | 结果 | 备注 |
| ---- | ---- | ---- | ---- | ---- |
| `node cli/src/index.js --host 192.168.9.59 ... stream rtmp start` | 启动推流 | 2024-?? | ⚠️ | 返回 code=-1，待确认相机推流配置 |
| `node cli/src/index.js --host 192.168.9.59 ... stream rtmp query 1` | 查看状态 | 2024-?? | ✅ | 返回 url/key/status=idle，说明查询成功 |
| `node cli/src/index.js --host 192.168.9.59 ... stream rtmp stop 1` | 停止推流 | 2024-?? | ⚠️ | code=-1，与 start 相同，需排查 |

## 批次 5：预设

| 命令 | 期望 | 执行时间 | 结果 | 备注 |
| ---- | ---- | ---- | ---- | ---- |
| 命令 | 期望 | 执行时间 | 结果 | 备注 |
| ---- | ---- | ---- | ---- | ---- |
| `node cli/src/index.js --host 192.168.9.59 ... preset save 1 TestPreset` | 成功保存 | 2024-?? | ✅ | 返回 code=0 |
| `node cli/src/index.js --host 192.168.9.59 ... preset list` | 列出预设 | 2024-?? | ⚠️ | CLI 输出 `No data`，推测相机未返回列表 |
| `node cli/src/index.js --host 192.168.9.59 ... preset recall 1` | 调用成功 | 2024-?? | ✅ | 返回 code=0 |

## 批次 6：配置与收藏

| 命令 | 期望 | 执行时间 | 结果 | 备注 |
| ---- | ---- | ---- | ---- | ---- |
| `... config favorites add` | 收藏写入成功 | | | |
| `... config favorites list` | 显示收藏 | | | |
| 多相机切换 | 配置历史记录更新 | | | |

## 批次 7：错误注入

| 场景 | 命令 | 期望 | 执行时间 | 结果 | 备注 |
| ---- | ---- | ---- | ---- | ---- | ---- |
| 无效 IP | `--host 192.168.9.123 camera info` | 连接错误提示 | | | |
| 超时 | `--timeout 1 camera info` | 超时错误 | | | |
| 无效参数 | `control ptz move foo 5` | 参数校验错误 | | | |

---

**记录方式**  
- 「结果」栏建议填写 ✅ / ⚠️ / ❌；若发现问题，请在「备注」写上命令输出或链接到 issue。  
- 如需附加截图或日志，可放到 `docs/cli-test-plan` 同级目录并在备注中注明。
