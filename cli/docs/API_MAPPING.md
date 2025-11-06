# Z CAM CLI API 映射文档

本文档详细说明了 CLI 命令与 Z CAM HTTP API 的映射关系。

## 映射规则

### 1. URL构建规则
- 基础URL: `http://{host}:{port}`
- GET请求: 直接拼接查询参数
- POST请求: 使用JSON body

### 2. 参数编码规则
- 字符串参数: 使用 `encodeURIComponent()`
- 数值参数: 直接拼接
- 布尔参数: 转换为 `1/0` 或 `on/off`

## 详细映射表

### camera 模块

| CLI命令 | HTTP方法 | API端点 | 参数映射 |
|---------|----------|---------|----------|
| `zcam camera info` | GET | `/info` | 无 |
| `zcam camera mode` | GET | `/ctrl/mode` | 无 |
| `zcam camera nickname` | GET | `/ctrl/nick_name` | 无 |
| `zcam camera nickname <name>` | GET | `/ctrl/nick_name` | `action=set&name={encodeURIComponent(name)}` |
| `zcam camera status` | GET | `/camera_status` | 无 |
| `zcam camera commit` | GET | `/commit_info` | 无 |
| `zcam camera goto-rec` | GET | `/ctrl/mode` | `action=to_rec` |

### control 模块

#### PTZ控制
| CLI命令 | HTTP方法 | API端点 | 参数映射 |
|---------|----------|---------|----------|
| `zcam control ptz query` | GET | `/ctrl/pt` | `action=query` |
| `zcam control ptz query --detail` | GET | `/ctrl/pt` | `action=query&detail=y` |
| `zcam control ptz move <dir> <speed>` | GET | `/ctrl/pt` | `action={dir}&fspeed={speed}` |
| `zcam control ptz pt-move <pan> <tilt>` | GET | `/ctrl/pt` | `action=pt&pan_speed={pan}&tilt_speed={tilt}` |
| `zcam control ptz stop` | GET | `/ctrl/pt` | `action=stop` |
| `zcam control ptz stop-all` | GET | `/ctrl/pt` | `action=stop_all` |
| `zcam control ptz home` | GET | `/ctrl/pt` | `action=home` |
| `zcam control ptz reset` | GET | `/ctrl/pt` | `action=reset` |

#### 变焦控制
| CLI命令 | HTTP方法 | API端点 | 参数映射 |
|---------|----------|---------|----------|
| `zcam control zoom in <speed>` | GET | `/ctrl/lens` | `action=zoomin&fspeed={speed}` |
| `zcam control zoom out <speed>` | GET | `/ctrl/lens` | `action=zoomout&fspeed={speed}` |
| `zcam control zoom stop` | GET | `/ctrl/lens` | `action=zoomstop` |
| `zcam control zoom status` | GET | `/ctrl/lens` | `action=z_status` |

#### 对焦控制
| CLI命令 | HTTP方法 | API端点 | 参数映射 |
|---------|----------|---------|----------|
| `zcam control focus near <speed>` | GET | `/ctrl/lens` | `action=focusnear&fspeed={speed}` |
| `zcam control focus far <speed>` | GET | `/ctrl/lens` | `action=focusfar&fspeed={speed}` |
| `zcam control focus stop` | GET | `/ctrl/lens` | `action=focusstop` |
| `zcam control focus status` | GET | `/ctrl/lens` | `action=f_status` |

#### 自动对焦
| CLI命令 | HTTP方法 | API端点 | 参数映射 |
|---------|----------|---------|----------|
| `zcam control af one-push` | GET | `/ctrl/af` | 无 |
| `zcam control af mode <mode>` | GET | `/ctrl/set` | `focus={mode}` |
| `zcam control af roi <x> <y>` | GET | `/ctrl/af` | `action=update_roi_center&x={x}&y={y}` |
| `zcam control af caf <enable>` | GET | `/ctrl/set` | `caf={enable}` |

### preset 模块

| CLI命令 | HTTP方法 | API端点 | 参数映射 |
|---------|----------|---------|----------|
| `zcam preset recall <index>` | GET | `/ctrl/preset` | `action=recall&index={index}` |
| `zcam preset save <index>` | GET | `/ctrl/preset` | `action=set&index={index}` |
| `zcam preset delete <index>` | GET | `/ctrl/preset` | `action=del&index={index}` |
| `zcam preset info <index>` | GET | `/ctrl/preset` | `action=get_info&index={index}` |
| `zcam preset config name <index> <name>` | GET | `/ctrl/preset` | `action=set_name&index={index}&new_name={encodeURIComponent(name)}` |
| `zcam preset config speed <index> <speed>` | GET | `/ctrl/preset` | `action=preset_speed&index={index}&preset_speed={speed}` |

### record 模块

| CLI命令 | HTTP方法 | API端点 | 参数映射 |
|---------|----------|---------|----------|
| `zcam record start` | GET | `/ctrl/rec` | `action=start` |
| `zcam record stop` | GET | `/ctrl/rec` | `action=stop` |
| `zcam record status` | GET | `/ctrl/rec` | `action=query` |
| `zcam record remain` | GET | `/ctrl/rec` | `action=remain` |
| `zcam record format resolution <res>` | GET | `/ctrl/set` | `resolution={res}` |
| `zcam record format fps <fps>` | GET | `/ctrl/set` | `rec_fps={fps}` |
| `zcam record format codec <codec>` | GET | `/ctrl/set` | `video_encoder={codec}` |
| `zcam record photo capture` | GET | `/ctrl/still` | `action=cap` |
| `zcam record playback query` | GET | `/ctrl/pb` | `action=query` |

### stream 模块

#### RTMP流
| CLI命令 | HTTP方法 | API端点 | 参数映射 |
|---------|----------|---------|----------|
| `zcam stream rtmp start <url> <key>` | GET | `/ctrl/rtmp` | `action=start&url={encodeURIComponent(url)}&key={encodeURIComponent(key)}` |
| `zcam stream rtmp stop <index>` | GET | `/ctrl/rtmp` | `action=stop&index={index}` |
| `zcam stream rtmp query <index>` | GET | `/ctrl/rtmp` | `action=query&index={index}` |
| `zcam stream rtmp set <url> <key>` | GET | `/ctrl/rtmp` | `action=set&url={encodeURIComponent(url)}&key={encodeURIComponent(key)}` |

#### SRT流
| CLI命令 | HTTP方法 | API端点 | 参数映射 |
|---------|----------|---------|----------|
| `zcam stream srt start <url>` | GET | `/ctrl/srt` | `action=start&url={encodeURIComponent(url)}` |
| `zcam stream srt stop` | GET | `/ctrl/srt` | `action=stop` |
| `zcam stream srt query` | GET | `/ctrl/srt` | `action=query` |
| `zcam stream srt set <params>` | GET | `/ctrl/srt` | 动态参数构建 |

#### NDI流
| CLI命令 | HTTP方法 | API端点 | 参数映射 |
|---------|----------|---------|----------|
| `zcam stream ndi query` | GET | `/ctrl/ndi` | `action=query` |
| `zcam stream ndi set <params>` | GET | `/ctrl/ndi` | 动态参数构建 |

#### 流设置
| CLI命令 | HTTP方法 | API端点 | 参数映射 |
|---------|----------|---------|----------|
| `zcam stream setting bitrate <index> <bitrate>` | GET | `/ctrl/stream_setting` | `index=stream{index}&bitrate={bitrate}` |
| `zcam stream setting resolution <index> <resolution>` | GET | `/ctrl/set` | `stream_resolution={resolution}` |
| `zcam stream setting fps <index> <fps>` | GET | `/ctrl/set` | `stream_fps={fps}` |

### image 模块

#### 曝光控制
| CLI命令 | HTTP方法 | API端点 | 参数映射 |
|---------|----------|---------|----------|
| `zcam image exposure ev <value>` | GET | `/ctrl/set` | `ev={value}` |
| `zcam image exposure iris <value>` | GET | `/ctrl/set` | `iris={value}` |
| `zcam image exposure iso <value>` | GET | `/ctrl/set` | `iso={value}` |
| `zcam image exposure shutter <value>` | GET | `/ctrl/set` | `shutter_angle={value}` |
| `zcam image exposure anti-flicker <mode>` | GET | `/ctrl/set` | `flicker={mode}` |
| `zcam image exposure meter-mode <mode>` | GET | `/ctrl/set` | `meter_mode={mode}` |

#### 白平衡
| CLI命令 | HTTP方法 | API端点 | 参数映射 |
|---------|----------|---------|----------|
| `zcam image whitebalance mode <mode>` | GET | `/ctrl/set` | `wb={mode}` |
| `zcam image whitebalance manual kelvin <value>` | GET | `/ctrl/set` | `mwb={value}` |
| `zcam image whitebalance manual tint <value>` | GET | `/ctrl/set` | `tint={value}` |
| `zcam image whitebalance one-push` | GET | `/ctrl/wb` | `action=one_push` |

#### 图像调整
| CLI命令 | HTTP方法 | API端点 | 参数映射 |
|---------|----------|---------|----------|
| `zcam image adjust brightness <value>` | GET | `/ctrl/set` | `brightness={value}` |
| `zcam image adjust contrast <value>` | GET | `/ctrl/set` | `contrast={value}` |
| `zcam image adjust saturation <value>` | GET | `/ctrl/set` | `saturation={value}` |
| `zcam image adjust sharpness <value>` | GET | `/ctrl/set` | `sharpness={value}` |
| `zcam image adjust hue <value>` | GET | `/ctrl/set` | `hue={value}` |

#### 视频设置
| CLI命令 | HTTP方法 | API端点 | 参数映射 |
|---------|----------|---------|----------|
| `zcam image video encoder <encoder>` | GET | `/ctrl/set` | `video_encoder={encoder}` |
| `zcam image video bitrate <level>` | GET | `/ctrl/set` | `bitrate_level={level}` |
| `zcam image video rotation <rotation>` | GET | `/ctrl/set` | `vid_rot={rotation}` |

#### 音频设置
| CLI命令 | HTTP方法 | API端点 | 参数映射 |
|---------|----------|---------|----------|
| `zcam image audio encoder <encoder>` | GET | `/ctrl/set` | `primary_audio={encoder}` |
| `zcam image audio gain <value>` | GET | `/ctrl/set` | `audio_input_gain={value}` |
| `zcam image audio level <value>` | GET | `/ctrl/set` | `audio_input_level={value}` |
| `zcam image audio noise-reduction <enable>` | GET | `/ctrl/set` | `audio_noise_reduction={enable}` |

### system 模块

| CLI命令 | HTTP方法 | API端点 | 参数映射 |
|---------|----------|---------|----------|
| `zcam system temperature` | GET | `/ctrl/temperature` | 无 |
| `zcam system led <enable>` | GET | `/ctrl/set` | `led={enable}` |
| `zcam system color-bar <enable>` | GET | `/ctrl/set` | `color_bar_enable={enable}` |
| `zcam system power reboot` | GET | `/ctrl/reboot` | 无 |
| `zcam system power shutdown` | GET | `/ctrl/shutdown` | 无 |
| `zcam system power standby` | GET | `/ctrl/mode` | `action=to_standby` |
| `zcam system power wakeup` | GET | `/ctrl/mode` | `action=exit_standby` |
| `zcam system security https <enable>` | GET | `/ctrl/set` | `https_on={enable}` |
| `zcam system files list <folder>` | GET | `/DCIM/{folder}/` | 无 |
| `zcam system files delete <file>` | GET | `/DCIM/{file}` | `act=rm` |
| `zcam system upgrade check` | GET | `/ctrl/upgrade` | `action=fw_check` |
| `zcam system upgrade run` | GET | `/ctrl/upgrade` | `action=run` |

### network 模块

| CLI命令 | HTTP方法 | API端点 | 参数映射 |
|---------|----------|---------|----------|
| `zcam network ethernet info` | GET | `/ctrl/network` | `action=info` |
| `zcam network ethernet static <ip> <mask> <gw> <dns>` | GET | `/ctrl/network` | `action=set&mode=static&ipaddr={ip}&netmask={mask}&gateway={gw}&dns={dns}` |
| `zcam network wifi query` | GET | `/ctrl/wifi_ctrl` | `action=query` |
| `zcam network wifi enable <enable>` | GET | `/ctrl/set` | `wifi={enable}` |
| `zcam network ip-manager allow add <ip>` | GET | `/ipac/allowlist/add` | `ip={ip}` |
| `zcam network ip-manager allow delete <ip>` | GET | `/ipac/allowlist/delete` | `ip={ip}` |
| `zcam network ip-manager deny add <ip>` | GET | `/ipac/denylist/add` | `ip={ip}` |
| `zcam network ip-manager deny delete <ip>` | GET | `/ipac/denylist/delete` | `ip={ip}` |

## 特殊处理

### 1. 布尔值转换
```javascript
function convertBoolean(value) {
  if (typeof value === 'boolean') {
    return value ? '1' : '0';
  }
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    if (['on', 'true', '1', 'yes', 'enable'].includes(lower)) {
      return '1';
    }
    if (['off', 'false', '0', 'no', 'disable'].includes(lower)) {
      return '0';
    }
  }
  return value;
}
```

### 2. 方向映射
```javascript
const directionMap = {
  'up': 'up',
  'down': 'down',
  'left': 'left',
  'right': 'right',
  'up-left': 'upleft',
  'up-right': 'upright',
  'down-left': 'downleft',
  'down-right': 'downright'
};
```

### 3. 复杂参数构建
对于需要多个参数的命令（如NDI设置），使用 URLSearchParams 构建：

```javascript
function buildNDIParams(params) {
  const searchParams = new URLSearchParams();
  searchParams.append('action', 'set');

  if (params.machine) {
    searchParams.append('machine', encodeURIComponent(params.machine));
  }
  if (params.stream) {
    searchParams.append('stream', encodeURIComponent(params.stream));
  }
  // ... 其他参数

  return searchParams.toString();
}
```

## 错误响应映射

| HTTP状态码 | CLI错误类型 | 处理方式 |
|------------|-------------|----------|
| 200 | 成功 | 正常返回 |
| 401 | 认证错误 | 提示检查用户名密码 |
| 403 | 权限错误 | 提示权限不足 |
| 404 | API不存在 | 提示检查固件版本 |
| 500 | 服务器错误 | 提示相机内部错误 |
| 超时 | 连接错误 | 提示检查网络连接 |

## 版本兼容性

不同Z CAM固件版本可能支持不同的API端点。CLI会自动检测相机固件版本并适配相应的API。

- **E2固件 v3.0+**: 支持所有功能
- **E2固件 v2.x**: 部分高级功能不可用
- **其他型号**: 功能支持情况有所不同