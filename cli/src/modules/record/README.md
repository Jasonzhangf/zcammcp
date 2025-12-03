# Record 模块

录制模块提供相机的录制控制功能，包括录制启停、格式设置、时间码管理、拍照和回放等。

## 架构设计

```
modules/record/
├── index.js      # 命令行接口定义
└── service.js    # 业务逻辑实现
```

## 文件说明

### index.js - 命令行接口
**作用**: 定义录制模块的所有命令行接口和参数。

**命令结构**:
```
record
├── start                   # 开始录制
├── stop                    # 停止录制
├── status                  # 查询录制状态
├── remain                  # 查询剩余录制时间
├── repair-status           # 查询修复状态
├── tc                      # 时间码控制子命令
│   ├── query              # 查询时间码
│   ├── reset              # 重置时间码
│   ├── set-current        # 设置为当前时间
│   └── set <timecode>     # 手动设置时间码
├── format                  # 格式设置子命令
│   ├── resolution <res>   # 设置分辨率
│   ├── fps <fps>          # 设置录制帧率
│   ├── codec <codec>      # 设置编码器
│   ├── file <format>      # 设置文件格式
│   ├── rotation <angle>   # 设置文件旋转角度
│   └── split-duration <seconds>  # 设置分段录制时长
├── meta                    # 元数据设置子命令
│   ├── enable <on/off>    # 启用/禁用录制元数据
│   ├── camera-id <id>     # 设置相机ID
│   └── reelname <name>    # 设置卷名
├── photo                   # 拍照功能子命令
│   └── capture            # 拍摄照片
└── playback                # 回放功能子命令
    └── query              # 查询回放状态
```

### service.js - 业务逻辑
**作用**: 实现录制相关的 API 调用和业务逻辑。

**主要功能**:
- 录制控制和状态监控
- 视频格式和参数设置
- 时间码管理和同步
- 拍照功能控制
- 元数据管理
- 回放状态查询

## 命令详解

### 基础录制控制

#### record start
**功能**: 开始录制
```bash
zcam record start
zcam record start --filename "interview_001"
```

**参数说明**:
- `--filename <name>`: 指定文件名（可选）
- `--duration <seconds>`: 录制时长（可选）

#### record stop
**功能**: 停止录制
```bash
zcam record stop
```

#### record status
**功能**: 查询录制状态
```bash
zcam record status
zcam record status --json
```

**返回数据**:
```json
{
  "recording": true,
  "start_time": "2024-01-15T10:30:00Z",
  "duration": 120,
  "file_size": 1073741824,
  "filename": "ZCAM_001.mov",
  "remaining_time": 3600,
  "storage_status": "recording"
}
```

#### record remain
**功能**: 查询剩余录制时间
```bash
zcam record remain
```

### 时间码控制

#### record tc query
**功能**: 查询当前时间码
```bash
zcam record tc query
```

#### record tc reset
**功能**: 重置时间码
```bash
zcam record tc reset
```

#### record tc set-current
**功能**: 设置为当前时间
```bash
zcam record tc set-current
```

#### record tc set <timecode>
**功能**: 手动设置时间码
```bash
zcam record tc set "10:30:00:00"
```

**时间码格式**: HH:MM:SS:FF

### 格式设置

#### record format resolution <resolution>
**功能**: 设置录制分辨率
```bash
zcam record format resolution 3840x2160
zcam record format resolution 1920x1080
zcam record format resolution 1280x720
```

**支持分辨率**:
- `3840x2160`: 4K UHD
- `1920x1080`: Full HD
- `1280x720`: HD
- `4096x2160`: Cinema 4K

#### record format fps <fps>
**功能**: 设置录制帧率
```bash
zcam record format fps 24
zcam record format fps 30
zcam record format fps 60
```

**支持帧率**: 24, 25, 30, 50, 60 fps

#### record format codec <codec>
**功能**: 设置视频编码器
```bash
zcam record format codec h264
zcam record format codec h265
```

#### record format file <format>
**功能**: 设置文件格式
```bash
zcam record format file mov
zcam record format file mp4
```

### 使用示例

```javascript
const { createExactAPI } = require('../../core/exact-api');
const RecordService = require('./service');

const api = createExactAPI({
  host: '192.168.1.100',
  port: 80,
  timeout: 30000
});

const recordService = new RecordService();

// 开始录制
await recordService.startRecording(api);
console.log('录制已开始');

// 监控录制状态
const monitorRecording = async () => {
  const status = await recordService.getRecordingStatus(api);
  if (status.recording) {
    console.log(`录制中: ${status.duration}秒, 文件大小: ${formatFileSize(status.file_size)}`);
    setTimeout(monitorRecording, 5000);
  } else {
    console.log('录制已停止');
  }
};

monitorRecording();

// 设置录制格式
await recordService.setResolution(api, '3840x2160');
await recordService.setRecordingFps(api, 30);
await recordService.setVideoEncoder(api, 'h265');
```

## 最佳实践

1. **格式选择**: 根据存储空间和质量需求选择合适的分辨率和编码器
2. **时间码同步**: 在多机位拍摄时确保时间码同步
3. **存储监控**: 定期检查剩余录制时间和存储状态
4. **文件管理**: 使用有意义的文件名便于后期管理
5. **元数据设置**: 正确设置元数据便于素材管理

## 注意事项

1. **存储空间**: 确保有足够的存储空间进行录制
2. **格式兼容性**: 某些格式组合可能不被特定型号支持
3. **时间码精度**: 时间码精度受相机内部时钟影响
4. **文件大小**: 长时间录制会产生大文件，注意文件系统限制