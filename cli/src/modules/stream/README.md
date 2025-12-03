# Stream 模块

流媒体模块提供相机的流媒体推流功能，支持 RTMP、SRT、NDI、RTSP 等多种推流协议和流设置管理。

## 架构设计

```
modules/stream/
├── index.js      # 命令行接口定义
└── service.js    # 业务逻辑实现
```

## 文件说明

### index.js - 命令行接口
**作用**: 定义流媒体模块的所有命令行接口和参数。

**命令结构**:
```
stream
├── rtmp                    # RTMP 推流子命令
│   ├── start [url] [key]   # 启动 RTMP 推流
│   ├── stop <index>        # 停止 RTMP 推流
│   ├── query <index>       # 查询 RTMP 流状态
│   ├── set <url> <key>     # 设置 RTMP 推流参数
│   └── auto-restart <on/off>  # 设置 RTMP 自动重启
├── srt                     # SRT 推流子命令
│   ├── start <url>         # 启动 SRT 推流
│   ├── stop                # 停止 SRT 推流
│   ├── query               # 查询 SRT 流状态
│   ├── set [params...]     # 设置 SRT 参数
│   ├── auto-restart <on/off>  # 设置 SRT 自动重启
│   └── set-url <url>       # 设置 SRT URL
├── ndi                     # NDI 推流子命令
│   ├── query               # 查询 NDI 流状态
│   └── set [params...]     # 设置 NDI 参数
├── rtsp                    # RTSP 设置子命令
│   ├── query               # 查询 RTSP 状态
│   └── set-auth <on/off>   # 设置 RTSP 认证
└── setting                 # 流设置子命令
    ├── bitrate <index> <bitrate>  # 设置流码率
    ├── resolution <index> <resolution>  # 设置流分辨率
    ├── fps <index> <fps>    # 设置流帧率
    ├── encoder <index> <encoder>  # 设置流编码器
    └── performance <index>  # 查询流性能
```

### service.js - 业务逻辑
**作用**: 实现流媒体相关的 API 调用和业务逻辑。

**主要功能**:
- RTMP/SRT/NDI/RTSP 推流控制
- 流参数配置和管理
- 推流状态监控
- 性能统计和优化
- 多路流管理

## 命令详解

### RTMP 推流

#### stream rtmp start [url] [key]
**功能**: 启动 RTMP 推流
```bash
# 使用预设参数启动
zcam stream rtmp start

# 指定推流地址和密钥
zcam stream rtmp start rtmp://live.example.com/live streamkey123

# 启动指定流通道
zcam stream rtmp start rtmp://live.example.com/live streamkey123 --index 1
```

#### stream rtmp stop <index>
**功能**: 停止 RTMP 推流
```bash
zcam stream rtmp stop 1
```

#### stream rtmp query <index>
**功能**: 查询 RTMP 流状态
```bash
zcam stream rtmp query 1 --json
```

**返回数据**:
```json
{
  "index": 1,
  "status": "streaming",
  "url": "rtmp://live.example.com/live",
  "bitrate": 5000000,
  "resolution": "1920x1080",
  "fps": 30,
  "encoder": "h264",
  "start_time": "2024-01-15T10:30:00Z",
  "duration": 3600,
  "bytes_sent": 1073741824,
  "dropped_frames": 0
}
```

### SRT 推流

#### stream srt start <url>
**功能**: 启动 SRT 推流
```bash
zcam stream srt start srt://receiver.example.com:5000?streamid=live1
```

#### stream srt set [mode] [passphrase] [pbkeylen] [latency] [ttl]
**功能**: 设置 SRT 参数
```bash
zcam stream srt set caller password123 16 120 64
```

**参数说明**:
- `mode`: 通话模式 (caller/listener/rendezvous)
- `passphrase`: 加密密码
- `pbkeylen`: 密钥长度 (16/24/32)
- `latency`: 延迟时间 (毫秒)
- `ttl`: 生存时间

### 流设置

#### stream setting bitrate <index> <bitrate>
**功能**: 设置流码率
```bash
zcam stream setting bitrate 1 5000000  # 5 Mbps
zcam stream setting bitrate 1 8000000  # 8 Mbps
```

#### stream setting resolution <index> <resolution>
**功能**: 设置流分辨率
```bash
zcam stream setting resolution 1 1920x1080
zcam stream setting resolution 1 1280x720
```

### 使用示例

```javascript
const { createExactAPI } = require('../../core/exact-api');
const StreamService = require('./service');

const api = createExactAPI({
  host: '192.168.1.100',
  port: 80,
  timeout: 30000
});

const streamService = new StreamService();

// 启动 RTMP 推流
await streamService.startRtmpStream(api, 'rtmp://live.example.com/live', 'streamkey123');
console.log('RTMP 推流已启动');

// 监控推流状态
const monitorStream = async () => {
  const status = await streamService.getRtmpStreamStatus(api, 1);
  console.log(`推流状态: ${status.status}`);
  console.log(`码率: ${status.bitrate} bps`);
  console.log(`丢帧: ${status.dropped_frames}`);
  
  if (status.status === 'streaming') {
    setTimeout(monitorStream, 5000);
  }
};

monitorStream();

// 设置流参数
await streamService.setStreamBitrate(api, 1, 6000000);
await streamService.setStreamResolution(api, 1, '1920x1080');
await streamService.setStreamFps(api, 1, 30);
```

## 最佳实践

1. **网络优化**: 根据网络条件选择合适的码率和分辨率
2. **多路流管理**: 合理配置多路流避免资源冲突
3. **状态监控**: 实时监控推流状态和性能指标
4. **故障恢复**: 配置自动重启功能提高可靠性
5. **安全设置**: 使用加密和认证保护推流安全

## 注意事项

1. **网络带宽**: 确保上行带宽满足推流需求
2. **编码性能**: 高码率和高分辨率需要更多处理资源
3. **协议兼容**: 确保接收端支持相应的推流协议
4. **延迟优化**: SRT 协议适合低延迟场景
5. **连接稳定**: 网络不稳定时考虑降低码率