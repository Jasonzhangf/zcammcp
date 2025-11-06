# Z CAM CLI

Z CAM 相机控制命令行工具，支持完整的相机管理和控制功能。

## 功能特性

- 📷 **相机基础管理** - 信息查询、昵称管理、状态监控
- 🎥 **录制控制** - 开始/停止录制、格式设置、剩余时间查询
- 📹 **流媒体控制** - RTMP推流、分辨率设置、编码配置
- 🎚️ **图像调整** - 亮度、对比度、饱和度、锐度控制
- ⚖️ **曝光控制** - ISO、快门速度、光圈、增益控制
- 🎨 **白平衡控制** - 模式切换、色温调整、手动白平衡
- 🔄 **PTZ云台控制** - 平移、俯仰、变焦控制
- 📍 **预设位置管理** - 保存、调用、管理预设位置
- 🌐 **网络管理** - 网络配置、WiFi设置、连接状态
- ⚙️ **系统管理** - 时间同步、固件升级、用户管理
- 💾 **配置管理** - 收藏相机、配置持久化、多配置文件

## 安装

```bash
npm install -g zcam-cli
```

## 快速开始

### 基础连接

```bash
# 查看相机信息（默认IP: 192.168.1.100）
zcam camera info

# 指定相机IP
zcam --host 192.168.9.59 camera info

# JSON格式输出
zcam camera info --json
```

### 相机管理

```bash
# 设置相机昵称
zcam camera nickname "我的相机"

# 查看相机状态
zcam camera status

# 获取当前用户信息
zcam camera user me
```

### 录制控制

```bash
# 切换到录制模式
zcam camera goto-rec

# 开始录制
zcam record start

# 停止录制
zcam record stop

# 查询录制状态
zcam record status

# 查询剩余录制时间
zcam record remain
```

### 流媒体设置

```bash
# 查询流设置
zcam stream query

# 设置流参数
zcam stream set stream1 1920 1080 8000000 30 h264

# 启用RTMP推流
zcam stream rtmp enable

# 禁用RTMP推流
zcam stream rtmp disable
```

### 图像调整

```bash
# 调整亮度
zcam image brightness 60

# 调整对比度
zcam image contrast 50

# 调整饱和度
zcam image saturation 50

# 查看所有图像设置
zcam image get-all
```

### 曝光控制

```bash
# 设置ISO
zcam exposure iso 800

# 设置快门速度
zcam exposure shutter 60

# 设置光圈
zcam exposure iris 5.6

# 设置自动光圈
zcam exposure auto-iris on
```

### PTZ控制

```bash
# 云台向上移动
zcam ptz move up 5

# 云台向左移动
zcam ptz move left 3

# 变焦
zcam ptz zoom in
zcam ptz zoom out

# 停止云台移动
zcam ptz stop
```

### 预设位置

```bash
# 保存当前位置为预设1
zcam preset save 1

# 调用预设1
zcam preset recall 1

# 查看所有预设
zcam preset list
```

### 配置管理

```bash
# 添加相机到收藏
zcam config favorite-add studio-cam 192.168.9.59

# 切换到收藏的相机
zcam config use-camera studio-cam

# 列出收藏的相机
zcam config favorite-list

# 显示当前配置
zcam config show
```

## 命令参考

### 全局选项

```bash
--host <ip>        # 相机IP地址
--port <port>      # HTTP端口 (默认: 80)
--timeout <ms>     # 请求超时时间 (默认: 30000)
--json             # JSON格式输出
--output <format>  # 输出格式: table, json, csv
--verbose          # 详细输出
--help             # 显示帮助信息
```

### 模块命令

#### camera - 相机基础管理
```bash
info               # 获取相机信息
mode               # 获取工作模式
nickname [name]    # 设置/获取昵称
status             # 获取运行状态
commit             # 提交设置
goto-rec           # 切换到录制模式
time               # 时间管理子命令
user               # 用户管理子命令
```

#### record - 录制控制
```bash
start              # 开始录制
stop               # 停止录制
status             # 查询录制状态
remain             # 查询剩余时间
format             # 设置录制格式
split              # 设置分段录制
```

#### stream - 流媒体控制
```bash
query              # 查询流设置
set                # 设置流参数
rtmp               # RTMP推流控制
srt                # SRT推流控制
webrtc             # WebRTC流控制
```

#### image - 图像调整
```bash
brightness <value> # 亮度 (0-100)
contrast <value>   # 对比度 (0-100)
saturation <value> # 饱和度 (0-100)
sharpness <value>  # 锐度 (0-100)
hue <value>        # 色调 (0-100)
get-all            # 获取所有图像设置
reset              # 重置为默认值
```

#### exposure - 曝光控制
```bash
iso <value>        # ISO感光度
shutter <value>    # 快门速度
iris <value>       # 光圈值
gain <value>       # 增益
exp-comp <value>   # 曝光补偿
auto-iris <on/off> # 自动光圈
get-all            # 获取所有曝光设置
```

#### whitebalance - 白平衡控制
```bash
mode <mode>        # 白平衡模式
temperature <value> # 色温值
tint <value>       # 色调偏移
get-all            # 获取所有白平衡设置
```

#### ptz - PTZ云台控制
```bash
move <dir> <speed> # 移动云台
zoom <in/out/stop> # 变焦控制
focus <mode>       # 对焦模式
position           # 获取当前位置
limits             # 设置移动限制
```

#### preset - 预设位置管理
```bash
save <index>       # 保存预设
recall <index>     # 调用预设
list               # 列出所有预设
delete <index>     # 删除预设
rename <index> <name> # 重命名预设
```

#### network - 网络管理
```bash
status             # 网络状态
ethernet           # 有线网络设置
wifi               # WiFi设置
ap                 # 热点设置
bandwidth          # 带宽测试
```

#### config - 配置管理
```bash
show               # 显示当前配置
favorite-add       # 添加收藏相机
favorite-remove    # 删除收藏相机
favorite-list      # 列出收藏相机
use-camera         # 切换相机
reset              # 重置配置
```

## 配置文件

配置文件存储在 `~/.zcam/` 目录下：

- `config.json` - 主配置文件
- `cameras.json` - 收藏的相机列表
- `favorites.json` - 收藏设置

### 配置示例

```json
{
  "default": {
    "host": "192.168.1.100",
    "port": 80,
    "timeout": 30000,
    "output": "table",
    "verbose": false
  },
  "studio": {
    "host": "192.168.9.59",
    "port": 80,
    "timeout": 15000,
    "output": "json"
  }
}
```

## 支持的相机型号

- Z CAM E2
- Z CAM E2-M4
- Z CAM E2-S6
- Z CAM E2-F6
- Z CAM E2-F8
- Z CAM E2C
- Z CAM E2C-F8
- Z CAM E2G
- Z CAM E2-X
- Z CAM E2-XE
- Z CAM E2-PTZ

## API文档

完整API文档请参考 [ZCAM_API_COMPLETE.md](./ZCAM_API_COMPLETE.md)

## 开发

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 构建

```bash
npm run build
```

### 测试

```bash
npm test
```

## 贡献

欢迎提交 Issue 和 Pull Request。

## 许可证

MIT License