# Z CAM CLI

一个用于控制 Z CAM 相机的命令行工具，基于官方 HTTP API 开发。

## 安装

```bash
npm install -g zcam-cli
```

## 快速开始

```bash
# 连接相机
zcam camera info --host 192.168.1.100

# PTZ控制
zcam control ptz move up 5

# 开始录制
zcam record start

# RTMP推流
zcam stream rtmp start rtmp://live.example.com/live streamkey
```

## 功能模块

### 1. camera - 相机基础管理
```bash
zcam camera info                           # 相机信息
zcam camera status                         # 运行状态
zcam camera nickname "Studio Camera 1"     # 设置昵称
zcam camera time get                       # 获取时间
zcam camera time set "2024-01-01" "12:00:00" # 设置时间
zcam camera user me                        # 当前用户
zcam camera user list                      # 用户列表
```

### 2. control - 运动控制
```bash
# PTZ控制
zcam control ptz query                     # 查询位置
zcam control ptz move up 5                 # 向上移动
zcam control ptz move down 3               # 向下移动
zcam control ptz move left 4               # 向左移动
zcam control ptz move right 4              # 向右移动
zcam control ptz home                      # 回到原点
zcam control ptz stop                      # 停止移动

# 变焦控制
zcam control zoom in 5                     # 放大
zcam control zoom out 3                    # 缩小
zcam control zoom stop                     # 停止变焦

# 对焦控制
zcam control focus near 4                  # 近焦
zcam control focus far 4                   # 远焦
zcam control focus stop                    # 停止对焦

# 自动对焦
zcam control af one-push                   # 单次对焦
zcam control af mode auto                  # 设置AF模式
zcam control af caf enable                 # 启用CAF
```

### 3. preset - 预设管理
```bash
zcam preset recall 1                       # 调用预设1
zcam preset save 1                         # 保存到预设1
zcam preset delete 1                       # 删除预设1
zcam preset list                           # 预设列表
zcam preset config name 1 "会议室全景"      # 设置预设名称
zcam preset config speed 1 5               # 设置预设速度
```

### 4. record - 录制控制
```bash
zcam record start                          # 开始录制
zcam record stop                           # 停止录制
zcam record status                         # 录制状态
zcam record format resolution 3840x2160    # 设置分辨率
zcam record format fps 30                  # 设置帧率
zcam record format codec h264              # 设置编码器
zcam record photo capture                  # 拍照
zcam record playback query                 # 回放查询
```

### 5. stream - 流媒体
```bash
# RTMP推流
zcam stream rtmp start rtmp://live.example.com/live streamkey123
zcam stream rtmp stop 1                    # 停止流1
zcam stream rtmp query 1                   # 查询流1状态

# SRT推流
zcam stream srt start srt://server:1234    # 启动SRT
zcam stream srt stop                       # 停止SRT

# NDI推流
zcam stream ndi query                      # NDI状态
zcam stream ndi set "Studio-Cam" "Stream1" "Group1" # NDI配置

# RTSP设置
zcam stream rtsp query                     # RTSP状态
zcam stream rtsp set-auth on               # 启用认证

# 流设置
zcam stream setting bitrate 1 5000         # 设置码率
zcam stream setting resolution 1 1920x1080 # 设置分辨率
```

### 6. image - 图像视频设置
```bash
# 曝光控制
zcam image exposure ev 1.0                 # EV补偿
zcam image exposure iris 4                 # 光圈
zcam image exposure iso 800                # ISO
zcam image exposure shutter 100            # 快门速度

# 白平衡
zcam image whitebalance mode auto          # AWB模式
zcam image whitebalance mode manual        # 手动模式
zcam image whitebalance manual kelvin 5600 # 色温
zcam image whitebalance one-push           # 一键白平衡

# 图像调整
zcam image adjust brightness 50            # 亮度
zcam image adjust contrast 60              # 对比度
zcam image adjust saturation 70            # 饱和度

# 视频设置
zcam image video encoder h264              # 编码器
zcam image video bitrate high              # 码率级别
zcam image video rotation 0                # 旋转角度

# 音频设置
zcam image audio encoder aac               # 音频编码
zcam image audio gain 10                   # 增益
zcam image audio level 80                  # 音量
```

### 7. system - 系统管理
```bash
zcam system temperature                    # 系统温度
zcam system led on                         # 开启LED
zcam system led off                        # 关闭LED
zcam system power reboot                   # 重启
zcam system power shutdown                 # 关机
zcam system power standby                  # 待机
zcam system security https on              # 启用HTTPS
zcam system files list /DCIM/              # 文件列表
zcam system files delete /DCIM/clip.mp4    # 删除文件
zcam system upgrade check                  # 检查升级
zcam system upgrade run                    # 执行升级
```

### 8. network - 网络配置
```bash
zcam network ethernet info                 # 网络信息
zcam network ethernet static 192.168.1.100 255.255.255.0 192.168.1.1 8.8.8.8
zcam network wifi query                    # WiFi状态
zcam network wifi enable                   # 启用WiFi
zcam network ip-manager allow add 192.168.1.50    # 添加白名单
zcam network ip-manager deny add 192.168.1.100     # 添加黑名单
```

## 全局参数

```bash
--host <ip>              # 相机IP地址 (默认: 192.168.1.100)
--port <port>            # HTTP端口 (默认: 80)
--timeout <ms>           # 请求超时时间 (默认: 20000)
--json                   # JSON格式输出
--verbose                # 详细输出
--help                   # 帮助信息
--version                # 版本信息
```

## 配置文件

创建配置文件 `~/.zcamrc`:

```ini
[default]
host = 192.168.1.100
port = 80
timeout = 20000
output = table

[studio]
host = 192.168.1.101
timeout = 30000

[live_cam]
host = 192.168.1.102
output = json
```

使用配置:

```bash
zcam --profile studio camera info
zcam --profile live_cam record status
```

## API映射

本CLI基于Z CAM官方HTTP API开发，API映射关系：

| CLI命令 | API端点 |
|---------|---------|
| camera info | `/info` |
| control ptz move | `/ctrl/pt?action=up&fspeed=5` |
| record start | `/ctrl/rec?action=start` |
| stream rtmp start | `/ctrl/rtmp?action=start&url=...` |
| image exposure ev | `/ctrl/set?ev=1.0` |

## 开发

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 测试
npm test

# 构建
npm run build

# 发布
npm publish
```

## 许可证

MIT License