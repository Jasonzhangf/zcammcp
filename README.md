# ZcamMCP

基于stdio的MCP服务器，用于控制Z CAM相机。

## 功能

- 相机管理（添加、切换、收藏相机）
- PTZ控制（云台移动、变焦）
- 预设管理（保存、调用预设位置）
- 曝光控制（光圈、快门速度、ISO）
- 白平衡控制（模式、色温）
- 图像调整（亮度、对比度、饱和度）
- 自动取景控制
- 视频设置（分辨率、帧率、编码格式）
- 流媒体设置（RTMP流启用/禁用、URL设置）
- 录制控制（开始/停止录制、格式设置）
- WebSocket订阅管理（实时状态更新）
- 持久化存储（相机配置、上下文、订阅设置）

## 安装

```bash
npm install
npm run build
```

## 使用方法

### MCP工具

1. `read_file` - 读取文件内容
2. `write_file` - 写入文件内容
3. `list_directory` - 列出目录内容
4. `add_camera` - 添加相机到管理器
5. `switch_camera` - 切换当前相机
6. `get_camera_status` - 获取相机状态
7. `move_ptz` - 控制相机云台移动
8. `zoom` - 控制相机变焦
9. `get_ptz_status` - 获取PTZ状态
10. `save_preset` - 保存预设位置
11. `recall_preset` - 调用预设位置
12. `list_presets` - 获取预设列表
13. `set_aperture` - 设置光圈值
14. `set_shutter_speed` - 设置快门速度
15. `set_iso` - 设置ISO值
16. `get_exposure_settings` - 获取曝光设置
17. `set_white_balance_mode` - 设置白平衡模式
18. `set_white_balance_temperature` - 设置白平衡色温
19. `get_white_balance_settings` - 获取白平衡设置
20. `set_brightness` - 设置亮度
21. `set_contrast` - 设置对比度
22. `set_saturation` - 设置饱和度
23. `get_image_settings` - 获取图像设置
24. `set_auto_framing` - 启用/禁用自动取景
25. `set_auto_framing_mode` - 设置自动取景模式
26. `get_auto_framing_settings` - 获取自动取景设置
27. `set_resolution` - 设置视频分辨率
28. `set_frame_rate` - 设置帧率
29. `set_codec` - 设置视频编码格式
30. `get_video_settings` - 获取视频设置
31. `set_streaming_enabled` - 启用/禁用流媒体
32. `set_rtmp_url` - 设置RTMP服务器地址
33. `get_streaming_settings` - 获取流媒体设置
34. `start_recording` - 开始录制
35. `stop_recording` - 停止录制
36. `set_recording_format` - 设置录制格式
37. `get_recording_status` - 获取录制状态

### 配置

#### MCP Raw JSON 配置方式

在 Claude Desktop 或其他 MCP 客户端中，可以使用以下 raw JSON 配置：

```json
{
  "mcpServers": {
    "zcammcp": {
      "command": "node",
      "args": ["/Users/fanzhang/zcammcp/dist/index.js"],
      "env": {}
    }
  }
}
```

#### 添加命令方式

在 Claude Desktop 配置文件中添加以下内容：

1. 打开 Claude Desktop 配置文件（macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`）

2. 在 `mcpServers` 部分添加：
```json
{
  "mcpServers": {
    "zcammcp": {
      "command": "node",
      "args": ["/Users/fanzhang/zcammcp/dist/index.js"]
    }
  }
}
```

3. 重启 Claude Desktop 以加载新的 MCP 服务器

#### iFlow CLI 配置

MCP服务器已配置在 `.iflow/settings.json` 中，可在iFlow CLI中自动加载。

## 开发

```bash
npm install  # 安装依赖
npm run build  # 构建
npm start  # 运行
npm test  # 运行测试
```

## 架构

详细架构信息请参见 [docs/zcammcp_architecture.md](docs/zcammcp_architecture.md)

## 核心组件

- **Core Components**: 核心管理组件 (详见 [src/core/README.md](src/core/README.md))
- **Service Components**: 相机控制服务组件 (详见 [src/services/README.md](src/services/README.md))