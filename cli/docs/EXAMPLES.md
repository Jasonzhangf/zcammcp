# Z CAM CLI 使用示例

本文档提供了 Z CAM CLI 的详细使用示例，涵盖所有主要功能。

## 基础配置

### 1. 设置默认相机
```bash
# 临时指定相机IP
zcam camera info --host 192.168.1.100

# 使用配置文件
cat ~/.zcamrc
[default]
host = 192.168.1.100
port = 80
timeout = 20000

zcam camera info  # 使用配置文件中的相机
```

### 2. 多相机配置
```bash
# 配置文件设置
cat ~/.zcamrc
[studio_cam]
host = 192.168.1.101
port = 80

[live_cam]
host = 192.168.1.102
port = 8080

# 使用不同配置
zcam --profile studio_cam camera info
zcam --profile live_cam record status
```

## 相机基础操作

### 1. 查看相机信息
```bash
# 获取相机基本信息
zcam camera info

# JSON格式输出
zcam camera info --json

# 获取相机运行状态
zcam camera status

# 获取相机模式
zcam camera mode

# 设置相机昵称
zcam camera nickname "Studio Camera 1"

# 获取相机昵称
zcam camera nickname
```

### 2. 用户管理
```bash
# 当前用户信息
zcam camera user me

# 用户列表
zcam camera user list

# 添加用户
zcam camera user add operator password123 operator

# 删除用户
zcam camera user delete operator

# 修改密码
zcam camera user password admin oldpass newpass
```

## PTZ云台控制

### 1. 基础移动控制
```bash
# 查询当前位置
zcam control ptz query

# 详细位置信息
zcam control ptz query --detail

# 方向移动（速度范围1-9）
zcam control ptz move up 5
zcam control ptz move down 3
zcam control ptz move left 4
zcam control ptz move right 4
zcam control ptz move up-left 3
zcam control ptz move up-right 3
zcam control ptz move down-left 3
zcam control ptz move down-right 3

# PTZ精确控制
zcam control ptz pt-move 5 4  # pan=5, tilt=4

# 停止移动
zcam control ptz stop
zcam control ptz stop-all

# 回到原点
zcam control ptz home

# 重置PTZ
zcam control ptz reset
```

### 2. 高级PTZ功能
```bash
# 设置移动限制
zcam control ptz limit enable
zcam control ptz limit disable

# 速度模式设置
zcam control ptz speed-mode normal
zcam control ptz speed-mode precision

# 图像翻转
zcam control ptz flip on
zcam control ptz flip off

# 隐私模式
zcam control ptz privacy on
zcam control ptz privacy off
```

## 镜头控制

### 1. 变焦控制
```bash
# 变焦操作（速度1-9）
zcam control zoom in 5
zcam control zoom out 3
zcam control zoom stop

# 查询变焦状态
zcam control zoom status

# 变焦模式
zcam control zoom mode optical
zcam control zoom mode digital
```

### 2. 对焦控制
```bash
# 手动对焦
zcam control focus near 4
zcam control focus far 4
zcam control focus stop

# 查询对焦状态
zcam control focus status
```

### 3. 自动对焦
```bash
# 单次对焦
zcam control af one-push

# 对焦模式
zcam control af mode auto    # AF模式
zcam control af mode manual  # MF模式

# ROI区域对焦
zcam control af roi 960 540   # 设置ROI中心点

# 连续自动对焦
zcam control af caf enable
zcam control af caf disable

# CAF敏感度
zcam control af caf-sensitivity 3

# 实时CAF
zcam control af live-caf enable

# MF辅助
zcam control af mf-assist enable
```

## 预设位置管理

### 1. 基础预设操作
```bash
# 保存当前位置到预设
zcam preset save 1

# 调用预设位置
zcam preset recall 1

# 删除预设
zcam preset delete 1

# 查询预设信息
zcam preset info 1

# 预设列表
zcam preset list
```

### 2. 预设配置
```bash
# 设置预设名称
zcam preset config name 1 "会议室全景"

# 设置预设速度（1-9）
zcam preset config speed 1 5

# 设置预设时间（秒）
zcam preset config time 1 3.5

# 预设调用模式
zcam preset config mode normal
zcam preset config mode smooth

# 冻结画面
zcam preset config freeze on
zcam preset config freeze off
```

### 3. 预设应用场景
```bash
# 批量设置会议室预设
zcam preset save 1 && zcam preset config name 1 "讲师特写"
zcam preset save 2 && zcam preset config name 2 "观众全景"
zcam preset save 3 && zcam preset config name 3 "白板拍摄"

# 快速切换场景
zcam preset recall 1  # 讲师特写
zcam preset recall 2  # 观众全景
zcam preset recall 3  # 白板拍摄
```

## 录制控制

### 1. 基础录制操作
```bash
# 开始录制
zcam record start

# 停止录制
zcam record stop

# 查询录制状态
zcam record status

# 查询剩余时间
zcam record remain

# 查询修复状态
zcam record repair-status
```

### 2. 录制格式设置
```bash
# 分辨率设置
zcam record format resolution 3840x2160  # 4K
zcam record format resolution 1920x1080  # 1080p
zcam record format resolution 1280x720   # 720p

# 帧率设置
zcam record format fps 30
zcam record format fps 60
zcam record format fps 24

# 编码器设置
zcam record format codec h264
zcam record format codec h265

# 文件格式
zcam record format file mov
zcam record format file mp4
```

### 3. 高级录制设置
```bash
# 项目帧率
zcam record project-fps 30

# VFR控制
zcam record vfr enable
zcam record vfr disable

# 文件旋转
zcam record file-rotation 0
zcam record file-rotation 90
zcam record file-rotation 180
zcam record file-rotation 270

# 分段录制
zcam record split-duration 600  # 10分钟一段

# 预卷录制
zcam record preroll enable
zcam record preroll-duration 5  # 5秒预卷
```

### 4. 时间码控制
```bash
# 查询时间码
zcam record tc query

# 重置时间码
zcam record tc reset

# 设置为当前时间
zcam record tc set-current

# 手动设置时间码
zcam record tc set "01:00:00:00"
```

### 5. 元数据设置
```bash
# 启用录制元数据
zcam record meta enable

# 设置相机ID
zcam record meta camera-id "CAM001"

# 设置卷名
zcam record meta reelname "INTERVIEW_001"
```

### 6. 拍照功能
```bash
# 拍照
zcam record photo capture

# 连续拍照脚本
for i in {1..10}; do
  echo "拍摄第 $i 张照片"
  zcam record photo capture
  sleep 2
done
```

## 流媒体推流

### 1. RTMP推流
```bash
# 启动RTMP推流
zcam stream rtmp start rtmp://live.example.com/live/streamkey123

# 停止RTMP推流
zcam stream rtmp stop 1

# 查询RTMP状态
zcam stream rtmp query 1

# 设置RTMP参数
zcam stream rtmp set rtmp://live.example.com/live newstreamkey

# 自动重启
zcam stream rtmp auto-restart on
zcam stream rtmp auto-restart off
```

### 2. SRT推流
```bash
# 启动SRT推流
zcam stream srt start srt://server.example.com:1234

# 停止SRT推流
zcam stream srt stop

# 查询SRT状态
zcam stream srt query

# 配置SRT参数
zcam stream srt set caller mypassword 0 1200 8
```

### 3. NDI推流
```bash
# 查询NDI状态
zcam stream ndi query

# 配置NDI
zcam stream ndi set "Studio-Cam-1" "Stream1" "Group1" 16 1 192.168.1.0 "" 239.255.0.0 "" "" "NDI-Bridge" "password" "bridge.example.com" 5961
```

### 4. RTSP设置
```bash
# 查询RTSP状态
zcam stream rtsp query

# 设置RTSP认证
zcam stream rtsp set-auth on
zcam stream rtsp set-auth off
```

### 5. 流媒体设置
```bash
# 设置码率
zcam stream setting bitrate 1 5000  # 5Mbps
zcam stream setting bitrate 2 10000 # 10Mbps

# 设置分辨率
zcam stream setting resolution 1 1920x1080
zcam stream setting resolution 2 1280x720

# 设置帧率
zcam stream setting fps 1 30
zcam stream setting fps 2 60

# 设置编码器
zcam stream setting encoder 1 h264
zcam stream setting encoder 1 h265

# 性能监控
zcam stream performance 1
```

## 图像和视频设置

### 1. 曝光控制
```bash
# EV补偿
zcam image exposure ev 1.0    # +1 EV
zcam image exposure ev -0.5   # -0.5 EV

# 光圈控制
zcam image exposure iris 4    # F4
zcam image exposure iris 8    # F8

# ISO设置
zcam image exposure iso 100
zcam image exposure iso 800
zcam image exposure iso 3200

# 快门速度
zcam image exposure shutter 180    # 180度快门
zcam image exposure shutter 90     # 90度快门

# 快门操作模式
zcam image exposure operation angle
zcam image exposure operation speed

# 电子ND
zcam image exposure electronic-nd on
zcam image exposure electronic-nd off
```

### 2. 自动曝光设置
```bash
# AE速度
zcam image exposure ae-speed 3

# 录制中锁定AE
zcam image exposure lock-ae-in-rec on

# 逆光补偿
zcam image exposure backlight-comp on
zcam image exposure backlight-comp off

# 防闪烁
zcam image exposure anti-flicker 50   # 50Hz
zcam image exposure anti-flicker 60   # 60Hz

# 测光模式
zcam image exposure meter-mode center
zcam image exposure meter-mode average
zcam image exposure meter-mode spot
```

### 3. 白平衡控制
```bash
# 白平衡模式
zcam image whitebalance mode auto      # AWB
zcam image whitebalance mode manual    # 手动
zcam image whitebalance mode daylight   # 日光
zcam image whitebalance mode tungsten   # 钨丝灯
zcam image whitebalance mode fluorescent # 荧光灯

# 手动白平衡
zcam image whitebalance manual kelvin 5600  # 5600K色温
zcam image whitebalance manual tint 2      # +2色调

# RGB增益
zcam image whitebalance manual r 100
zcam image whitebalance manual g 100
zcam image whitebalance manual b 100

# 一键白平衡
zcam image whitebalance one-push

# AWB优先级
zcam image whitebalance awb-priority accuracy
zcam image whitebalance awb-priority speed
```

### 4. 图像调整
```bash
# 基础调整
zcam image adjust brightness 50    # 亮度
zcam image adjust contrast 60      # 对比度
zcam image adjust saturation 70    # 饱和度
zcam image adjust sharpness 5      # 锐度
zcam image adjust hue 0            # 色调

# 图像配置文件
zcam image adjust profile rec709   # Rec.709
zcam image adjust profile slog3    # S-Log3
zcam image adjust profile zlog2    # Z-Log2

# 降噪
zcam image adjust noise-reduction on
zcam image adjust noise-reduction off

# 亮度级别
zcam image adjust luma-level 0
```

### 5. 视频设置
```bash
# 视频编码器
zcam image video encoder h264
zcam image video encoder h265

# 码率级别
zcam image video bitrate low
zcam image video bitrate medium
zcam image video bitrate high
zcam image video bitrate max

# 合成模式
zcam image video compose-mode normal
zcam image video compose-mode anamorphic

# 视频旋转
zcam image video rotation 0
zcam image video rotation 90
zcam image video rotation 180
zcam image video rotation 270

# 视频延时摄影
zcam image video timelapse 1     # 1秒间隔
zcam image video timelapse 10    # 10秒间隔

# 电子防抖
zcam image video eis on
zcam image video eis off
```

### 6. 音频设置
```bash
# 音频编码器
zcam image audio encoder aac
zcam image audio encoder pcm

# 音频通道
zcam image audio channel stereo
zcam image audio channel mono

# 幻象电源
zcam image audio phantom 48    # 48V
zcam image audio phantom off

# 音频增益
zcam image audio input-gain 20    # 输入增益
zcam image audio output-gain 0    # 输出增益

# 音频电平
zcam image audio input-level 80

# 噪声抑制
zcam image audio noise-reduction on
zcam image audio noise-reduction off
```

## 系统管理

### 1. 电源管理
```bash
# 重启相机
zcam system power reboot

# 关机
zcam system power shutdown

# 待机
zcam system power standby

# 从待机唤醒
zcam system power wakeup

# 自动关机
zcam system auto-off 30    # 30分钟后关机
zcam system auto-off 0     # 禁用自动关机

# 自动待机
zcam system auto-standby 60    # 60分钟后待机
```

### 2. 系统状态
```bash
# 系统温度
zcam system temperature

# LED控制
zcam system led on
zcam system led off

# 彩条生成
zcam system color-bar on
zcam system color-bar off

# Tally亮度
zcam system tally 100    # 100%亮度
zcam system tally 0      # 关闭
```

### 3. 存储卡管理
```bash
# 检查存储卡
zcam system card present

# 查询格式化信息
zcam system card query-format

# 格式化存储卡
zcam system card format
```

### 4. 文件管理
```bash
# 列出文件夹
zcam system files list

# 列出文件夹内容
zcam system files list 100ZCAMU

# 删除文件
zcam system files delete 100ZCAMU/VIDEO001.MOV

# 批量删除文件
zcam system files delete 100ZCAMU/*.THM
```

### 5. 固件升级
```bash
# 检查升级
zcam system upgrade check

# 执行升级
zcam system upgrade run

# UI升级检查
zcam system upgrade ui-check
```

### 6. 安全设置
```bash
# HTTPS设置
zcam system security https on
zcam system security https off

# 认证设置
zcam system security auth on
zcam system security auth off

# 证书管理
zcam system security certificate generate
zcam system security certificate info
zcam system security certificate delete
```

## 网络配置

### 1. 以太网设置
```bash
# 查询网络信息
zcam network ethernet info

# 设置静态IP
zcam network ethernet static 192.168.1.100 255.255.255.0 192.168.1.1 8.8.8.8

# 设置DHCP
zcam network ethernet dhcp
```

### 2. WiFi设置
```bash
# 查询WiFi状态
zcam network wifi query

# 启用WiFi
zcam network wifi enable

# 禁用WiFi
zcam network wifi disable

# WiFi频道设置
zcam network wifi channel on
zcam network wifi channel off
```

### 3. IP访问控制
```bash
# 白名单管理
zcam network ip-manager allow enable
zcam network ip-manager allow add 192.168.1.50
zcam network ip-manager allow delete 192.168.1.50
zcam network ip-manager allow disable

# 黑名单管理
zcam network ip-manager deny enable
zcam network ip-manager deny add 192.168.1.100
zcam network ip-manager deny delete 192.168.1.100
zcam network ip-manager deny disable
```

## 实际应用场景

### 1. 直播场景配置
```bash
#!/bin/bash
# live_setup.sh - 直播配置脚本

echo "配置直播场景..."

# 1. 设置相机参数
zcam image exposure ev 0.5
zcam image whitebalance mode auto
zcam image adjust brightness 50
zcam image adjust contrast 60

# 2. 配置推流
STREAM_URL="rtmp://live.example.com/live"
STREAM_KEY="your_stream_key"

zcam stream rtmp set $STREAM_URL $STREAM_KEY
zcam stream setting bitrate 1 8000
zcam stream setting resolution 1 1920x1080
zcam stream setting fps 1 30

# 3. 设置预设位置
zcam preset save 1
zcam preset config name 1 "主讲人特写"
zcam preset save 2
zcam preset config name 2 "全景镜头"

echo "直播配置完成！"
```

### 2. 会议室自动化
```bash
#!/bin/bash
# meeting_room.sh - 会议室控制脚本

POSITION=$1  # 传入位置参数：1=主讲人, 2=观众, 3=白板

case $POSITION in
  1)
    echo "切换到主讲人特写"
    zcam preset recall 1
    zcam control zoom in 3
    ;;
  2)
    echo "切换到观众全景"
    zcam preset recall 2
    zcam control zoom out 5
    ;;
  3)
    echo "切换到白板拍摄"
    zcam preset recall 3
    zcam control focus far 2
    ;;
  *)
    echo "用法: $0 [1|2|3]"
    echo "1: 主讲人特写"
    echo "2: 观众全景"
    echo "3: 白板拍摄"
    exit 1
    ;;
esac

# 调整图像参数
zcam image exposure ev 0.3
zcam image whitebalance one-push

echo "场景切换完成"
```

### 3. 批量录制脚本
```bash
#!/bin/bash
# batch_record.sh - 批量录制脚本

DURATION=$1  # 录制时长（秒）
COUNT=$2     # 录制次数

if [ -z "$DURATION" ] || [ -z "$COUNT" ]; then
  echo "用法: $0 <录制时长> <录制次数>"
  echo "示例: $0 300 3  # 录制3次，每次5分钟"
  exit 1
fi

echo "开始批量录制：$COUNT 次，每次 $DURATION 秒"

for i in $(seq 1 $COUNT); do
  echo "开始第 $i 次录制..."
  zcam record start
  sleep $DURATION
  zcam record stop
  echo "第 $i 次录制完成"

  # 录制间隔
  if [ $i -lt $COUNT ]; then
    echo "等待 10 秒后开始下一次录制..."
    sleep 10
  fi
done

echo "所有录制完成！"
```

### 4. 设备状态监控
```bash
#!/bin/bash
# monitor.sh - 设备监控脚本

HOST="192.168.1.100"
INTERVAL=60  # 检查间隔（秒）

echo "开始监控相机 $HOST..."

while true; do
  echo "=== $(date) ==="

  # 检查连接状态
  if zcam camera info --host $HOST >/dev/null 2>&1; then
    echo "✅ 相机连接正常"

    # 获取状态信息
    TEMP=$(zcam system temperature --host $HOST --json | grep -o '"temperature":[^,]*' | cut -d: -f2)
    STATUS=$(zcam camera status --host $HOST --json | grep -o '"status":"[^"]*"' | cut -d'"' -f4)

    echo "温度: ${TEMP}°C"
    echo "状态: $STATUS"

    # 检查存储空间
    REMAIN=$(zcam record remain --host $HOST --json | grep -o '"remain":"[^"]*"' | cut -d'"' -f4)
    echo "剩余录制时间: $REMAIN"

  else
    echo "❌ 相机连接失败"
  fi

  echo "等待 $INTERVAL 秒..."
  sleep $INTERVAL
done
```

这些示例涵盖了 Z CAM CLI 的主要使用场景，可以根据实际需求进行调整和组合。