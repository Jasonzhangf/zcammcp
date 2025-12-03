# Image 模块

图像模块提供相机的图像和视频设置功能，包括白平衡、曝光、色彩调整、图像增强等。

## 架构设计

```
modules/image/
├── index.js      # 命令行接口定义
└── service.js    # 业务逻辑实现
```

## 文件说明

### index.js - 命令行接口
**作用**: 定义图像模块的所有命令行接口和参数。

**命令结构**:
```
image
├── whitebalance           # 白平衡设置子命令
│   ├── mode <mode>        # 设置白平衡模式
│   ├── temperature <temp> # 设置色温值
│   ├── preset <preset>    # 设置白平衡预设
│   └── status             # 查询白平衡状态
├── exposure               # 曝光控制子命令
│   ├── mode <mode>        # 设置曝光模式
│   ├── aperture <value>   # 设置光圈值
│   ├── shutter <speed>    # 设置快门速度
│   ├── iso <value>        # 设置 ISO 值
│   ├── ev <value>         # 设置曝光补偿
│   └── status             # 查询曝光状态
├── color                  # 色彩调整子命令
│   ├── saturation <value> # 设置饱和度
│   ├── contrast <value>   # 设置对比度
│   ├── brightness <value> # 设置亮度
│   ├── hue <value>        # 设置色相
│   └── status             # 查询色彩状态
├── enhancement            # 图像增强子命令
│   ├── sharpen <value>    # 设置锐化
│   ├── noise <value>      # 设置降噪
│   ├── drc <value>        # 设置动态范围压缩
│   └── status             # 查询增强状态
├── gamma                  # 伽马设置子命令
│   ├── preset <preset>    # 设置伽马预设
│   ├── value <value>      # 设置伽马值
│   └── status             # 查询伽马状态
└── lut                    # LUT 管理子命令
    ├── load <file>        # 加载 LUT 文件
    ├── enable             # 启用 LUT
    ├── disable            # 禁用 LUT
    └── status             # 查询 LUT 状态
```

### service.js - 业务逻辑
**作用**: 实现图像设置相关的 API 调用和业务逻辑。

**主要功能**:
- 白平衡控制和调整
- 曝光参数管理
- 色彩和图像增强
- 伽马曲线设置
- LUT 文件管理

## 命令详解

### 白平衡控制

#### image whitebalance mode <mode>
**功能**: 设置白平衡模式
```bash
zcam image whitebalance mode auto
zcam image whitebalance mode manual
zcam image whitebalance mode preset
```

**支持模式**:
- `auto`: 自动白平衡
- `manual`: 手动白平衡
- `preset`: 预设白平衡
- `custom`: 自定义白平衡

#### image whitebalance temperature <temperature>
**功能**: 设置色温值
```bash
zcam image whitebalance temperature 3200   # 暖白光
zcam image whitebalance temperature 5600   # 冷白光
zcam image whitebalance temperature 6500   # 日光
```

**色温范围**: 2000K - 10000K

#### image whitebalance preset <preset>
**功能**: 设置白平衡预设
```bash
zcam image whitebalance preset tungsten     # 钨丝灯
zcam image whitebalance preset fluorescent  # 荧光灯
zcam image whitebalance preset daylight     # 日光
zcam image whitebalance preset cloudy       # 阴天
zcam image whitebalance preset shade        # 阴影
```

### 曝光控制

#### image exposure mode <mode>
**功能**: 设置曝光模式
```bash
zcam image exposure mode auto
zcam image exposure mode manual
zcam image exposure mode shutter_priority
zcam image exposure mode aperture_priority
```

#### image exposure aperture <value>
**功能**: 设置光圈值
```bash
zcam image exposure aperture 2.8
zcam image exposure aperture 5.6
zcam image exposure aperture 11
```

#### image exposure shutter <speed>
**功能**: 设置快门速度
```bash
zcam image exposure shutter 60    # 1/60 秒
zcam image exposure shutter 1000  # 1/1000 秒
zcam image exposure shutter 0.5   # 0.5 秒
```

### 使用示例

```javascript
const { createExactAPI } = require('../../core/exact-api');
const ImageService = require('./service');

const api = createExactAPI({
  host: '192.168.1.100',
  port: 80,
  timeout: 30000
});

const imageService = new ImageService();

// 设置白平衡
await imageService.setWhiteBalanceMode(api, 'manual');
await imageService.setWhiteBalanceTemperature(api, 5600);
console.log('白平衡设置完成');

// 设置曝光参数
await imageService.setAperture(api, 2.8);
await imageService.setShutterSpeed(api, 60);
await imageService.setISO(api, 400);
console.log('曝光参数设置完成');

// 调整色彩
await imageService.setSaturation(api, 50);
await imageService.setContrast(api, 0);
await imageService.setBrightness(api, 10);
console.log('色彩调整完成');

// 监控图像状态
const imageStatus = await imageService.getImageStatus(api);
console.log('当前图像设置:', imageStatus);
```

## 最佳实践

1. **白平衡设置**: 根据拍摄环境选择合适的白平衡模式
2. **曝光控制**: 在光线变化时及时调整曝光参数
3. **色彩调整**: 适度调整避免过度处理
4. **预设管理**: 保存常用设置为预设提高效率
5. **实时监控**: 使用监视器实时查看图像效果

## 注意事项

1. **参数范围**: 各参数都有有效范围，超出范围会报错
2. **相互影响**: 曝光参数相互影响，需要平衡调整
3. **环境适应**: 不同拍摄环境需要不同的图像设置
4. **色彩校准**: 定期进行色彩校准确保图像质量
5. **存储管理**: 自定义 LUT 文件占用存储空间