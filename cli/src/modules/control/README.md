# Control 模块

控制模块提供相机的运动控制功能，包括 PTZ（平移-俯仰-变焦）控制、镜头控制和对焦控制等。

## 架构设计

```
modules/control/
├── index.js      # 命令行接口定义
└── service.js    # 业务逻辑实现
```

## 文件说明

### index.js - 命令行接口
**作用**: 定义控制模块的所有命令行接口和参数。

**命令结构**:
```
control
├── ptz                    # PTZ 控制子命令
│   ├── move <dir> [speed]  # PTZ 移动控制
│   ├── stop               # 停止 PTZ 移动
│   ├── goto <x> <y> <z>   # 移动到指定位置
│   ├── preset <id>        # 调用 PTZ 预设
│   ├── save <id>          # 保存当前位置到预设
│   └── status             # 获取 PTZ 状态
├── lens                   # 镜头控制子命令
│   ├── zoom <value>       # 变焦控制
│   ├── focus <mode>       # 对焦模式
│   ├── focus <distance>   # 对焦距离
│   ├── iris <value>       # 光圈控制
│   └── status             # 获取镜头状态
└── autofocus              # 自动对焦控制
    ├── enable             # 启用自动对焦
    ├── disable            # 禁用自动对焦
    ├── trigger            # 触发自动对焦
    └── status             # 获取对焦状态
```

### service.js - 业务逻辑
**作用**: 实现相机控制相关的 API 调用和业务逻辑。

**主要功能**:
- PTZ 运动控制和位置管理
- 镜头参数调节（变焦、对焦、光圈）
- 自动对焦控制
- 运动状态监控
- 预设位置管理

## 命令详解

### PTZ 控制

#### control ptz move <direction> [speed]
**功能**: 控制 PTZ 移动方向和速度
```bash
# 基础方向控制
zcam control ptz move up          # 向上移动
zcam control ptz move down        # 向下移动
zcam control ptz move left        # 向左移动
zcam control ptz move right       # 向右移动

# 对角线移动
zcam control ptz move up-left     # 向左上移动
zcam control ptz move up-right    # 向右上移动
zcam control ptz move down-left   # 向左下移动
zcam control ptz move down-right  # 向右下移动

# 指定速度 (0.0-1.0)
zcam control ptz move up 0.8      # 向上移动，速度 80%
zcam control ptz move right 0.5   # 向右移动，速度 50%
```

**方向参数**:
- `up`, `down`, `left`, `right`: 基础方向
- `up-left`, `up-right`, `down-left`, `down-right`: 对角线方向
- `stop`: 停止移动

**速度参数**:
- 范围：0.0 - 1.0
- 默认值：0.5（50% 速度）
- 精度：0.1

#### control ptz stop
**功能**: 停止所有 PTZ 移动
```bash
zcam control ptz stop
```

#### control ptz goto <x> <y> <z>
**功能**: 移动到指定的 PTZ 位置
```bash
zcam control ptz goto 100 50 80
```

**参数说明**:
- `x`: 平移位置 (-1000 到 1000)
- `y`: 俯仰位置 (-1000 到 1000)
- `z`: 变焦位置 (0 到 1000)

#### control ptz preset <id>
**功能**: 调用 PTZ 预设位置
```bash
zcam control ptz preset 1
zcam control ptz preset 5
```

**预设 ID**:
- 范围：1-16
- 预设需要先保存才能调用

#### control ptz save <id>
**功能**: 保存当前位置到 PTZ 预设
```bash
zcam control ptz save 1
```

#### control ptz status
**功能**: 获取 PTZ 当前状态
```bash
zcam control ptz status --json
```

**返回数据**:
```json
{
  "position": {
    "pan": 100,
    "tilt": 50,
    "zoom": 200
  },
  "moving": false,
  "speed": 0.5,
  "presets": [
    {"id": 1, "name": "Wide Shot", "saved": true},
    {"id": 2, "name": "Close Up", "saved": true}
  ]
}
```

### 镜头控制

#### control lens zoom <value>
**功能**: 控制镜头变焦
```bash
# 相对变焦
zcam control lens zoom 0.5    # 放大 50%
zcam control lens zoom -0.3   # 缩小 30%

# 绝对变焦 (0-1000)
zcam control lens zoom 500    # 变焦到位置 500
zcam control lens zoom 1000   # 最大变焦
```

**参数说明**:
- 相对值：-1.0 到 1.0（负值缩小，正值放大）
- 绝对值：0 到 1000

#### control lens focus <mode|distance>
**功能**: 控制对焦模式或距离
```bash
# 对焦模式
zcam control lens focus auto      # 自动对焦模式
zcam control lens focus manual    # 手动对焦模式

# 手动对焦距离 (0-1000)
zcam control lens focus 500       # 对焦到距离 500
zcam control lens focus 100       # 近距离对焦
zcam control lens focus 900       # 远距离对焦
```

#### control lens iris <value>
**功能**: 控制镜头光圈
```bash
# 相对光圈
zcam control lens iris 0.2    # 开大光圈 20%
zcam control lens iris -0.1   # 缩小光圈 10%

# 绝对光圈 (0-1000)
zcam control lens iris 300    # 光圈值 300
zcam control lens iris 800    # 大光圈
```

#### control lens status
**功能**: 获取镜头状态
```bash
zcam control lens status --json
```

**返回数据**:
```json
{
  "zoom": {
    "current": 500,
    "min": 0,
    "max": 1000,
    "speed": 0.5
  },
  "focus": {
    "mode": "manual",
    "distance": 500,
    "auto_status": "locked"
  },
  "iris": {
    "current": 300,
    "min": 0,
    "max": 1000,
    "f_stop": 2.8
  }
}
```

### 自动对焦控制

#### control autofocus enable
**功能**: 启用自动对焦
```bash
zcam control autofocus enable
```

#### control autofocus disable
**功能**: 禁用自动对焦
```bash
zcam control autofocus disable
```

#### control autofocus trigger
**功能**: 触发一次自动对焦
```bash
zcam control autofocus trigger
```

#### control autofocus status
**功能**: 获取自动对焦状态
```bash
zcam control autofocus status --json
```

**返回数据**:
```json
{
  "enabled": true,
  "status": "focusing",
  "lock_time": 1.2,
  "current_distance": 500,
  "target_distance": 520
}
```

## API 接口

### PTZ 控制接口
```javascript
// PTZ 移动
async movePTZ(api, direction, speed = 0.5) {
  const validDirections = ['up', 'down', 'left', 'right', 'up-left', 'up-right', 'down-left', 'down-right'];
  if (!validDirections.includes(direction)) {
    throw new Error(`无效的 PTZ 方向: ${direction}`);
  }
  
  if (speed < 0 || speed > 1) {
    throw new Error('PTZ 速度必须在 0.0-1.0 范围内');
  }
  
  return await api.get(`/ctrl/ptz?action=move&dir=${direction}&speed=${speed}`);
}

// PTZ 停止
async stopPTZ(api) {
  return await api.get('/ctrl/ptz?action=stop');
}

// 移动到指定位置
async gotoPTZPosition(api, x, y, z) {
  this.validateRange(x, -1000, 1000, '平移位置');
  this.validateRange(y, -1000, 1000, '俯仰位置');
  this.validateRange(z, 0, 1000, '变焦位置');
  
  return await api.get(`/ctrl/ptz?action=goto&x=${x}&y=${y}&z=${z}`);
}

// 调用预设
async recallPTZPreset(api, presetId) {
  this.validateRange(presetId, 1, 16, '预设 ID');
  return await api.get(`/ctrl/ptz?action=preset&id=${presetId}`);
}

// 保存预设
async savePTZPreset(api, presetId) {
  this.validateRange(presetId, 1, 16, '预设 ID');
  return await api.get(`/ctrl/ptz?action=save&id=${presetId}`);
}
```

### 镜头控制接口
```javascript
// 变焦控制
async controlZoom(api, value) {
  if (value >= -1 && value <= 1) {
    // 相对变焦
    return await api.get(`/ctrl/lens?action=zoom&relative=${value}`);
  } else if (value >= 0 && value <= 1000) {
    // 绝对变焦
    return await api.get(`/ctrl/lens?action=zoom&absolute=${value}`);
  } else {
    throw new Error('变焦值必须在 -1.0 到 1.0（相对）或 0 到 1000（绝对）范围内');
  }
}

// 对焦控制
async controlFocus(api, modeOrDistance) {
  if (modeOrDistance === 'auto' || modeOrDistance === 'manual') {
    // 对焦模式
    return await api.get(`/ctrl/lens?action=focus&mode=${modeOrDistance}`);
  } else {
    // 对焦距离
    const distance = parseInt(modeOrDistance);
    this.validateRange(distance, 0, 1000, '对焦距离');
    return await api.get(`/ctrl/lens?action=focus&distance=${distance}`);
  }
}

// 光圈控制
async controlIris(api, value) {
  if (value >= -1 && value <= 1) {
    // 相对光圈
    return await api.get(`/ctrl/lens?action=iris&relative=${value}`);
  } else if (value >= 0 && value <= 1000) {
    // 绝对光圈
    return await api.get(`/ctrl/lens?action=iris&absolute=${value}`);
  } else {
    throw new Error('光圈值必须在 -1.0 到 1.0（相对）或 0 到 1000（绝对）范围内');
  }
}
```

### 自动对焦接口
```javascript
// 启用自动对焦
async enableAutoFocus(api) {
  return await api.get('/ctrl/autofocus?action=enable');
}

// 禁用自动对焦
async disableAutoFocus(api) {
  return await api.get('/ctrl/autofocus?action=disable');
}

// 触发自动对焦
async triggerAutoFocus(api) {
  return await api.get('/ctrl/autofocus?action=trigger');
}
```

## 使用示例

### PTZ 运动控制
```javascript
const { createExactAPI } = require('../../core/exact-api');
const ControlService = require('./service');

const api = createExactAPI({
  host: '192.168.1.100',
  port: 80,
  timeout: 30000
});

const controlService = new ControlService();

// 向上移动，速度 80%
await controlService.movePTZ(api, 'up', 0.8);
console.log('PTZ 向上移动中...');

// 等待 2 秒后停止
await new Promise(resolve => setTimeout(resolve, 2000));
await controlService.stopPTZ(api);
console.log('PTZ 已停止');

// 移动到指定位置
await controlService.gotoPTZPosition(api, 100, 50, 200);
console.log('PTZ 移动到指定位置');

// 保存当前位置到预设 1
await controlService.savePTZPreset(api, 1);
console.log('位置已保存到预设 1');

// 调用预设 1
await controlService.recallPTZPreset(api, 1);
console.log('已调用预设 1');
```

### 镜头控制
```javascript
// 变焦控制
await controlService.controlZoom(api, 0.5);  // 放大 50%
console.log('镜头放大 50%');

await new Promise(resolve => setTimeout(resolve, 1000));

await controlService.controlZoom(api, 500);   // 绝对变焦到位置 500
console.log('变焦到绝对位置 500');

// 对焦控制
await controlService.controlFocus(api, 'auto');  // 切换到自动对焦
console.log('已切换到自动对焦模式');

await controlService.controlFocus(api, 300);     // 手动对焦到距离 300
console.log('手动对焦到距离 300');

// 光圈控制
await controlService.controlIris(api, 0.2);   // 开大光圈 20%
console.log('光圈开大 20%');
```

### 自动对焦控制
```javascript
// 启用自动对焦
await controlService.enableAutoFocus(api);
console.log('自动对焦已启用');

// 触发一次自动对焦
await controlService.triggerAutoFocus(api);
console.log('触发自动对焦');

// 等待对焦完成
await new Promise(resolve => setTimeout(resolve, 2000));

// 获取对焦状态
const focusStatus = await controlService.getAutoFocusStatus(api);
console.log('对焦状态:', focusStatus.status);
console.log('对焦距离:', focusStatus.current_distance);
```

### 状态监控
```javascript
// 获取 PTZ 状态
const ptzStatus = await controlService.getPTZStatus(api);
console.log('PTZ 位置:', ptzStatus.position);
console.log('是否移动中:', ptzStatus.moving);

// 获取镜头状态
const lensStatus = await controlService.getLensStatus(api);
console.log('当前变焦:', lensStatus.zoom.current);
console.log('对焦模式:', lensStatus.focus.mode);
console.log('当前光圈:', lensStatus.iris.current);

// 监控 PTZ 移动
const monitorMovement = async () => {
  const status = await controlService.getPTZStatus(api);
  if (status.moving) {
    console.log(`PTZ 移动中: 位置(${status.position.pan}, ${status.position.tilt}, ${status.position.zoom})`);
    setTimeout(monitorMovement, 500);
  } else {
    console.log('PTZ 移动完成');
  }
};

monitorMovement();
```

## 错误处理

### 常见错误类型
- `ValidationError`: 参数验证错误（方向、速度、位置范围等）
- `CameraStateError`: 相机状态错误（移动中、锁定等）
- `HardwareError`: 硬件错误（电机故障、限位等）
- `APIError`: API 调用错误（权限、不支持的功能等）

### 错误处理示例
```javascript
try {
  await controlService.movePTZ(api, 'invalid-direction');
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('方向参数错误:', error.message);
  }
}

try {
  await controlService.gotoPTZPosition(api, 1500, 0, 0); // 超出范围
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('位置参数超出范围:', error.message);
  }
}

try {
  await controlService.movePTZ(api, 'up', 0.5);
} catch (error) {
  if (error instanceof CameraStateError) {
    console.error('相机状态不允许移动:', error.message);
  }
}
```

## 最佳实践

1. **参数验证**: 在发送控制命令前验证所有参数范围
2. **状态检查**: 在操作前检查相机当前状态
3. **运动监控**: 对于需要时间的操作，监控执行状态
4. **预设管理**: 合理使用预设位置提高工作效率
5. **速度控制**: 根据场景选择合适的移动速度
6. **错误恢复**: 提供运动停止和重置机制

## 注意事项

1. **运动范围**: PTZ 运动有机械限位，超出范围会报错
2. **移动速度**: 速度过快可能导致图像抖动
3. **预设数量**: 最多支持 16 个预设位置
4. **对焦时间**: 自动对焦需要时间，避免频繁触发
5. **硬件限制**: 某些镜头功能可能不被特定型号支持
6. **电源影响**: 低电量可能影响运动精度