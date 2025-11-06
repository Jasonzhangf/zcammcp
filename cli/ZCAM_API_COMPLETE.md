# Z CAM E2 HTTP API 完整参考

## 基础信息
- **基础URL**: `http://<相机IP>:80`
- **响应格式**: JSON
- **状态码**: `code: 0` 表示成功，`code: 1` 表示失败
- **会话管理**: 大部分 `/ctrl/*` 命令需要会话控制权

## 1. 基础信息 API

### 获取相机信息
```http
GET /info
```

**响应示例**:
```json
{
  "cameraName": "P2-R1-18x_002216",
  "model": "e2ptz",
  "number": "1",
  "sw": "1.0.2",
  "hw": "2.0",
  "mac": "62:d3:9a:40:8a:77",
  "sn": "91PT0002216",
  "nickName": "P2-R1-18x",
  "eth_ip": "192.168.9.59",
  "ip": "192.168.9.59",
  "pixelLinkMode": "Single",
  "feature": {
    "product_catalog": "",
    "rebootAfterClearSettings": "0",
    "rebootAfterVideoSystem": "0",
    "upgradeWOCard": "1",
    "fwName": "*.zip",
    "fwCheck": "1",
    "md5Check": "1",
    "setCfgToAll": "0",
    "syncOnlyMaster": "1",
    "stopPreviewInSnap": "0",
    "stopPreviewInTimelapse": "0",
    "photoSupport": "1",
    "autoFraming": true,
    "ezFraming": true,
    "facedb": true,
    "wsSupport": "1",
    "release": true,
    "snapSupportExposureMode": "1",
    "ndi": true,
    "blComp": true,
    "preRoll": true,
    "aLineIn": true,
    "ezLink": true,
    "viscaSupport": true,
    "irService": true,
    "freeD": true,
    "sdiSupport": true,
    "dzoomDigital": true,
    "lens_ctrl_ptz": true,
    "snmpSupport": true,
    "advanceColor": true,
    "webrtcStream": true,
    "eisSupport": true,
    "genlockSupport": true,
    "tryIrisService": true,
    "aeMeteringWindow": true,
    "rtsp": true,
    "rtmp": true,
    "srt": true,
    "wifiSupport": false,
    "waitStableSupport": true,
    "snapSupportFmt": {
      "isAllFmt": "1",
      "fmt": ["4KP23.98", "4KP29.97", "4KP59.94", "1080P23.98", "1080P29.97", "1080P59.94", "4KP25", "4KP50", "1080P25", "1080P50", "4KP24", "1080P24"]
    },
    "timelapseSupportFmt": {
      "isAllFmt": "1",
      "fmt": ["4KP23.98", "4KP29.97", "4KP59.94", "1080P23.98", "1080P29.97", "1080P59.94", "4KP25", "4KP50", "1080P25", "1080P50", "4KP24", "1080P24"]
    }
  }
}
```

## 2. 会话管理 API

### 检查会话状态
```http
GET /ctrl/session
```

### 占用会话
```http
GET /ctrl/session?action=occupy
```

### 退出会话
```http
GET /ctrl/session?action=quit
```

**响应**:
- HTTP 409: 获取会话失败
- HTTP 200: 成功

## 3. 系统控制 API

### 设置日期时间
```http
GET /datetime?date=YYYY-MM-DD&time=hh:mm:ss
```

### 系统重启
```http
GET /ctrl/reboot
```

### 系统关机
```http
GET /ctrl/shutdown
```

### NTP时间同步
```http
GET /ctrl/sntp?action=start&ip_addr=192.168.1.1&port=123
GET /ctrl/sntp?action=stop
```

## 4. 工作模式 API

### 查询工作模式
```http
GET /ctrl/mode?action=query
```

**响应示例**:
```json
{
  "code": 0,
  "desc": "",
  "msg": "rec"  // rec, rec_ing, rec_paused, cap, pb, pb_ing, pb_paused
               // cap_tl_idle, cap_tl_ing, cap_burst, cap_snap_idle, cap_snap_ing
               // rec_tl_idle, rec_tl_ing, unknown
}
```

### 切换工作模式
```http
GET /ctrl/mode?action=to_rec        // 切换到录制模式
GET /ctrl/mode?action=to_pb         // 切换到播放模式
GET /ctrl/mode?action=to_standby    // 切换到待机模式
GET /ctrl/mode?action=exit_standby  // 退出待机模式
```

## 5. 录制控制 API

### 开始录制
```http
GET /ctrl/rec?action=start
```

### 停止录制
```http
GET /ctrl/rec?action=stop
```

### 查询录制状态
```http
GET /ctrl/rec?action=query
```

### 查询剩余录制时间
```http
GET /ctrl/rec?action=remain
```

### 查询修复状态
```http
GET /ctrl/rec?action=query_repairing
```

## 6. 相机设置 API

### 获取设置
```http
GET /ctrl/get?k=<key>
```

**响应格式**:
```json
{
  "code": 0,          // 0: 支持; -1: 不支持
  "desc": "...",
  "key": "...",       // 设置键名
  "type": 1,          // 1: 选择; 2: 范围; 3: 字符串
  "ro": 0,            // 1: 只读; 0: 可修改
  "value": "...",    // 当前值
  // 类型相关字段...
}
```

**设置类型**:
- **Choice (type=1)**:
  ```json
  {
    "code": 0,
    "key": "video_system",
    "type": 1,
    "ro": 0,
    "value": "NTSC",
    "opts": ["NTSC", "PAL", "CINEMA"]
  }
  ```

- **Range (type=2)**:
  ```json
  {
    "code": 0,
    "key": "contrast",
    "type": 2,
    "ro": 0,
    "value": 52,
    "min": 0,
    "max": 100,
    "step": 1
  }
  ```

- **String (type=3)**:
  ```json
  {
    "code": 0,
    "key": "sn",
    "type": 3,
    "ro": 1,
    "value": "329A0010009"
  }
  ```

### 设置参数
```http
GET /ctrl/set?<key>=<value>
```

**响应**:
```json
{
  "code": 0,  // 0: 成功
  "desc": "",
  "msg": ""
}
```

### 常用设置键 (参考 api.js 获取完整列表)
- `video_system`: 视频系统 (NTSC/PAL/CINEMA)
- `movfmt`: 电影格式
- `movvfr`: 可变帧率
- `iso`: ISO感光度
- `shutter`: 快门速度
- `iris`: 光圈
- `wb`: 白平衡
- `resolution`: 分辨率
- `fps`: 帧率

## 7. 网络设置 API

### 查询网络模式
```http
GET /ctrl/network?action=query
```

### 获取网络信息
```http
GET /ctrl/network?action=info
```

### 设置网络模式
```http
GET /ctrl/network?action=set&mode=Router                    // DHCP客户端
GET /ctrl/network?action=set&mode=Direct                    // DHCP服务器 (IP: 10.98.32.1)
GET /ctrl/network?action=set&mode=Static&ipaddr=192.168.1.100&netmask=255.255.255.0&gateway=192.168.1.1
GET /ctrl/network?action=set&mode=Static&ipaddr=192.168.1.100&netmask=255.255.255.0&gateway=192.168.1.1&dns=8.8.8.8
```

## 8. 流媒体设置 API

### 查询流设置
```http
GET /ctrl/stream_setting?action=query
```

### 设置流参数
```http
GET /ctrl/stream_setting?index=<stream>&width=<width>&height=<height>&bitrate=<bitrate>&fps=<fps>&venc=<encoder>
```

**参数说明**:
- `index`: `stream0` 或 `stream1`
- `width`: 视频宽度 (必须2像素对齐)
- `height`: 视频高度 (必须2像素对齐)
- `bitrate`: 比特率 (bps)
- `fps`: 帧率
- `venc`: 视频编码器 (h264, h265)
- `bitwidth`: H.265比特宽度 (8或10)

### 切换网络流源
```http
GET /ctrl/set?send_stream=Stream0
GET /ctrl/set?send_stream=Stream1
```

### 内置流服务
- **MJPEG over HTTP**: `GET /mjpeg_stream`
- **RTSP**: `rtsp://<IP>/live_stream`
- **RTMP**: 配置后推流
- **SRT**: 配置后推流

## 9. 对焦和变焦控制 API

### 自动对焦
```http
GET /ctrl/af
```

### 更新自动对焦ROI
```http
GET /ctrl/af?action=update_roi&x=<x>&y=<y>&w=<w>&h=<h>
GET /ctrl/af?action=update_roi_center&x=<x>&y=<y>
```

### 查询自动对焦ROI
```http
GET /ctrl/af?action=query
```

### 手动对焦控制
```http
GET /ctrl/set?mf_drive=<drive>        // -3 到 3
GET /ctrl/set?lens_focus_pos=<pos>  // 特定位置
GET /ctrl/set?focus=<mode>          // AF 或 MF
```

### 变焦控制
```http
GET /ctrl/set?lens_zoom=in          // 变近
GET /ctrl/set?lens_zoom=out         // 变远
GET /ctrl/set?lens_zoom=stop       // 停止
GET /ctrl/set?lens_zoom_pos=<pos>  // 特定位置
```

## 10. 云台控制 API

### 云台移动控制
```http
GET /ctrl/pt?action=<direction>&speed=<speed>
```

**方向选项**:
- `left`, `right`, `up`, `down`
- `leftup`, `leftdown`, `rightup`, `rightdown`
- `stop`

**速度范围**: 0-0x3f (0-63)

**注意**: UART角色必须设置为PelcoD

## 11. 存储卡管理 API

### 检查存储卡状态
```http
GET /ctrl/card?action=present
```

### 格式化存储卡
```http
GET /ctrl/card?action=format        // 自动选择文件系统
GET /ctrl/card?action=fat32         // 强制FAT32
GET /ctrl/card?action=exfat         // 强制exFAT
```

### 查询存储空间
```http
GET /ctrl/card?action=query_free    // 可用空间
GET /ctrl/card?action=query_total   // 总空间
```

## 12. 文件管理 API

### 列出文件夹
```http
GET /DCIM/
```

### 列出文件
```http
GET /DCIM/<folder>/
```

### 下载文件
```http
GET /DCIM/<folder>/<filename>
```

### 删除文件
```http
GET /DCIM/<folder>/<filename>?act=rm
```

### 获取缩略图
```http
GET /DCIM/<folder>/<filename>?act=thm
```

### 获取屏幕截图
```http
GET /DCIM/<folder>/<filename>?act=scr
```

### 获取文件信息
```http
GET /DCIM/<folder>/<filename>?act=info
```

### 获取文件创建时间
```http
GET /DCIM/<folder>/<filename>?act=ct
```

## 13. 图像高级设置 API

### Gamma控制
```http
GET /ctrl/gamma?action=get&option=gamma
GET /ctrl/gamma?action=set&option=gamma&base=<base>&power=<power>
```

### 黑电平控制
```http
GET /ctrl/gamma?action=get&option=black_level
GET /ctrl/gamma?action=set&option=black_level&enable=<enable>&level=<level>
```

### 黑Gamma控制
```http
GET /ctrl/gamma?action=get&option=black_gamma
GET /ctrl/gamma?action=set&option=black_gamma&enable=<enable>&range=<range>&level=<level>
```

### Knee控制
```http
GET /ctrl/gamma?action=get&option=knee
GET /ctrl/gamma?action=set&option=knee&enable=<enable>&point=<point>&slope=<slope>
```

### 手动黑电平补偿
```http
GET /ctrl/manual_blc?action=get
GET /ctrl/manual_blc?action=set&enable=<enable>&rggb=<r>,<gr>,<gb>,<b>
```

### 手动RGB增益
```http
GET /ctrl/get?k=mwb_r
GET /ctrl/get?k=mwb_g
GET /ctrl/get?k=mwb_b
GET /ctrl/set?mwb_r=<value>
GET /ctrl/set?mwb_g=<value>
GET /ctrl/set?mwb_b=<value>
```

### 手动白平衡 (CCT/Tint)
```http
GET /ctrl/get?k=mwb
GET /ctrl/get?k=tint
GET /ctrl/get?k=mwb_r_offset
GET /ctrl/get?k=mwb_g_offset
GET /ctrl/get?k=mwb_b_offset
GET /ctrl/set?mwb_r_offset=<offset>
GET /ctrl/set?mwb_g_offset=<offset>
GET /ctrl/set?mwb_b_offset=<offset>
```

### 黑电平控制
```http
GET /ctrl/black_level
GET /ctrl/black_level?enable=<enable>
GET /ctrl/black_level?master=<master>&r=<r>&g=<g>&b=<b>
```

## 14. WebSocket API

### 连接WebSocket
```
ws://<host>:81
```

## 15. 推荐的API使用序列

### 基础控制序列
```http
GET /info                           // 获取相机信息
GET /ctrl/session                    // 检查会话
GET /datetime?date=YYYY-MM-DD&time=hh:mm:ss  // 同步时间
GET /ctrl/mode?action=query         // 查询工作模式
GET /ctrl/get?k=iso                  // 获取ISO设置
GET /ctrl/get?k=movfmt              // 获取电影格式
```

### 流媒体设置序列
```http
GET /ctrl/get?k=movfmt              // 检查电影格式
GET /ctrl/get?k=movvfr              // 检查VFR
GET /ctrl/stream_setting?index=stream1&action=query  // 查询流1状态
GET /ctrl/stream_setting?index=stream1&width=1920&height=1080&bitrate=10000000  // 设置流1参数
```

## 16. 响应格式说明

### 成功响应
```json
{
  "code": 0,
  "desc": "",
  "msg": "..."
}
```

### 错误响应
```json
{
  "code": 1,
  "desc": "Error description",
  "msg": "Error message"
}
```

### HTTP状态码
- **200**: 请求成功
- **409**: 会话冲突或未获取会话
- **500**: 服务器内部错误

## 17. 注意事项

1. **会话管理**: 在使用 `/ctrl/*` 命令前，确保已获取会话控制权
2. **流媒体设置**: 修改流设置前，确保对应的流处于空闲状态
3. **电影格式**: 流0正在录制时，无法修改电影格式和VFR设置
4. **像素对齐**: 设置分辨率时，宽度和高度必须为2的倍数
5. **长宽比**: 设置分辨率时，需注意保持正确的长宽比
6. **权限控制**: 只读设置 (`ro: 1`) 无法通过API修改

## 18. 完整的API键列表

参考 `api.js` 文件获取所有支持的设置键，包括但不限于：
- 视频设置: `resolution`, `fps`, `bitrate`, `encoder`, `profile`
- 图像设置: `brightness`, `contrast`, `saturation`, `sharpness`, `hue`
- 曝光设置: `iris`, `shutter`, `iso`, `gain`, `exp_comp`
- 白平衡: `wb`, `tint`, `r_gain`, `g_gain`, `b_gain`
- 录制设置: `rec_format`, `split_duration`, `pre_roll`
- 网络设置: `ethernet_mode`, `wifi_mode`, `rtmp_settings`
- 系统设置: `date`, `time`, `language`, `led_status`