# Preset 模块

预设模块提供相机预设位置管理功能，包括预设的保存、调用、修改和删除等操作。

## 架构设计

```
modules/preset/
├── index.js      # 命令行接口定义
└── service.js    # 业务逻辑实现
```

## 文件说明

### index.js - 命令行接口
**作用**: 定义预设模块的所有命令行接口和参数。

**命令结构**:
```
preset
├── list                    # 列出所有预设
├── save <id> <name>        # 保存当前位置到预设
├── recall <id>             # 调用预设位置
├── delete <id>             # 删除预设
├── update <id> <name>      # 更新预设名称
├── info <id>               # 获取预设详细信息
├── export <file>           # 导出预设配置
├── import <file>           # 导入预设配置
└── clear                   # 清空所有预设
```

### service.js - 业务逻辑
**作用**: 实现预设管理相关的 API 调用和业务逻辑。

**主要功能**:
- 预设位置的保存和调用
- 预设信息的查询和管理
- 预设配置的导入导出
- 预设验证和完整性检查
- 批量预设操作

## 命令详解

### 预设查询

#### preset list
**功能**: 列出所有预设位置
```bash
zcam preset list
zcam preset list --json
```

**返回数据**:
```json
{
  "presets": [
    {
      "id": 1,
      "name": "Wide Shot",
      "description": "全景拍摄位置",
      "position": {
        "pan": 0,
        "tilt": 0,
        "zoom": 100
      },
      "saved": true,
      "created_time": "2024-01-15T10:30:00Z"
    },
    {
      "id": 2,
      "name": "Close Up",
      "description": "特写拍摄位置",
      "position": {
        "pan": 50,
        "tilt": 20,
        "zoom": 500
      },
      "saved": true,
      "created_time": "2024-01-15T10:35:00Z"
    }
  ],
  "total": 16,
  "used": 2,
  "available": 14
}
```

#### preset info <id>
**功能**: 获取指定预设的详细信息
```bash
zcam preset info 1
zcam preset info 1 --json
```

**返回数据**:
```json
{
  "id": 1,
  "name": "Wide Shot",
  "description": "全景拍摄位置",
  "position": {
    "pan": 0,
    "tilt": 0,
    "zoom": 100
  },
  "camera_settings": {
    "focus_mode": "auto",
    "iris": 300,
    "white_balance": "auto"
  },
  "saved": true,
  "created_time": "2024-01-15T10:30:00Z",
  "last_recalled": "2024-01-15T14:20:00Z",
  "recall_count": 5
}
```

### 预设操作

#### preset save <id> <name> [description]
**功能**: 保存当前位置到指定预设
```bash
# 基础保存
zcam preset save 1 "Wide Shot"

# 带描述保存
zcam preset save 2 "Close Up" "特写拍摄位置"

# 保存当前 PTZ 位置和相机设置
zcam preset save 3 "Interview" "采访拍摄位置" --include-settings
```

**参数说明**:
- `id`: 预设 ID (1-16)
- `name`: 预设名称 (1-50 字符)
- `description`: 预设描述 (可选，最多 200 字符)
- `--include-settings`: 包含相机设置（对焦、光圈、白平衡等）

**名称规则**:
- 支持中文、英文、数字、符号
- 不能包含控制字符
- 同一相机内名称不能重复

#### preset recall <id>
**功能**: 调用指定预设位置
```bash
# 基础调用
zcam preset recall 1

# 调用并等待完成
zcam preset recall 2 --wait

# 调用预设并恢复相机设置
zcam preset recall 3 --restore-settings
```

**参数说明**:
- `--wait`: 等待移动完成再返回
- `--restore-settings`: 恢复保存时的相机设置
- `--timeout <seconds>`: 等待超时时间（默认 30 秒）

#### preset delete <id>
**功能**: 删除指定预设
```bash
zcam preset delete 1
zcam preset delete 2 --confirm
```

**参数说明**:
- `--confirm`: 跳过确认提示

#### preset update <id> <name> [description]
**功能**: 更新预设名称和描述
```bash
# 更新名称
zcam preset update 1 "New Wide Shot"

# 更新名称和描述
zcam preset update 2 "New Close Up" "更新后的特写位置"
```

### 配置管理

#### preset export <file>
**功能**: 导出预设配置到文件
```bash
# 导出所有预设
zcam preset export presets.json

# 导出指定预设
zcam preset export presets.json --preset 1,2,3

# 导出为 CSV 格式
zcam preset export presets.csv --format csv
```

**参数说明**:
- `--preset <ids>`: 指定预设 ID（逗号分隔）
- `--format <format>`: 导出格式（json, csv, ini）

**导出文件示例 (JSON)**:
```json
{
  "export_time": "2024-01-15T15:30:00Z",
  "camera_model": "ZCAM E2",
  "presets": [
    {
      "id": 1,
      "name": "Wide Shot",
      "description": "全景拍摄位置",
      "position": {
        "pan": 0,
        "tilt": 0,
        "zoom": 100
      },
      "camera_settings": {
        "focus_mode": "auto",
        "iris": 300,
        "white_balance": "auto"
      }
    }
  ]
}
```

#### preset import <file>
**功能**: 从文件导入预设配置
```bash
# 导入所有预设
zcam preset import presets.json

# 导入时覆盖现有预设
zcam preset import presets.json --overwrite

# 导入到指定起始位置
zcam preset import presets.json --start-id 5
```

**参数说明**:
- `--overwrite`: 覆盖现有预设
- `--start-id <id>`: 导入起始 ID
- `--dry-run`: 预览导入结果，不实际导入

#### preset clear
**功能**: 清空所有预设
```bash
zcam preset clear
zcam preset clear --confirm
```

**参数说明**:
- `--confirm`: 跳过确认提示

## API 接口

### 预设管理接口
```javascript
// 获取预设列表
async getPresets(api) {
  return await api.get('/ctrl/preset?action=list');
}

// 获取预设详情
async getPresetInfo(api, presetId) {
  this.validateRange(presetId, 1, 16, '预设 ID');
  return await api.get(`/ctrl/preset?action=info&id=${presetId}`);
}

// 保存预设
async savePreset(api, presetId, name, description = '', includeSettings = false) {
  this.validateRange(presetId, 1, 16, '预设 ID');
  
  if (!name || typeof name !== 'string') {
    throw new Error('预设名称不能为空');
  }
  if (name.length > 50) {
    throw new Error('预设名称不能超过 50 个字符');
  }
  if (description.length > 200) {
    throw new Error('预设描述不能超过 200 个字符');
  }
  
  const params = new URLSearchParams({
    action: 'save',
    id: presetId,
    name: name,
    description: description,
    include_settings: includeSettings ? 'true' : 'false'
  });
  
  return await api.get(`/ctrl/preset?${params.toString()}`);
}

// 调用预设
async recallPreset(api, presetId, options = {}) {
  this.validateRange(presetId, 1, 16, '预设 ID');
  
  const params = new URLSearchParams({
    action: 'recall',
    id: presetId
  });
  
  if (options.wait) {
    params.append('wait', 'true');
  }
  if (options.restoreSettings) {
    params.append('restore_settings', 'true');
  }
  if (options.timeout) {
    params.append('timeout', options.timeout);
  }
  
  return await api.get(`/ctrl/preset?${params.toString()}`);
}

// 删除预设
async deletePreset(api, presetId) {
  this.validateRange(presetId, 1, 16, '预设 ID');
  return await api.get(`/ctrl/preset?action=delete&id=${presetId}`);
}

// 更新预设信息
async updatePreset(api, presetId, name, description = '') {
  this.validateRange(presetId, 1, 16, '预设 ID');
  
  if (!name || typeof name !== 'string') {
    throw new Error('预设名称不能为空');
  }
  
  const params = new URLSearchParams({
    action: 'update',
    id: presetId,
    name: name,
    description: description
  });
  
  return await api.get(`/ctrl/preset?${params.toString()}`);
}
```

### 批量操作接口
```javascript
// 批量调用预设
async recallMultiplePresets(api, presetIds, options = {}) {
  if (!Array.isArray(presetIds) || presetIds.length === 0) {
    throw new Error('预设 ID 列表不能为空');
  }
  
  const results = [];
  for (const presetId of presetIds) {
    try {
      const result = await this.recallPreset(api, presetId, options);
      results.push({ presetId, success: true, result });
      
      // 在预设之间添加延迟
      if (options.delay && presetIds.indexOf(presetId) < presetIds.length - 1) {
        await this.delay(options.delay * 1000);
      }
    } catch (error) {
      results.push({ presetId, success: false, error: error.message });
      
      if (options.stopOnError) {
        break;
      }
    }
  }
  
  return results;
}

// 清空所有预设
async clearAllPresets(api) {
  return await api.get('/ctrl/preset?action=clear_all');
}
```

## 使用示例

### 基础预设操作
```javascript
const { createExactAPI } = require('../../core/exact-api');
const PresetService = require('./service');

const api = createExactAPI({
  host: '192.168.1.100',
  port: 80,
  timeout: 30000
});

const presetService = new PresetService();

// 获取预设列表
const presets = await presetService.getPresets(api);
console.log('预设列表:');
presets.presets.forEach(preset => {
  console.log(`${preset.id}: ${preset.name} - ${preset.description || '无描述'}`);
});

// 保存当前位置到预设 1
await presetService.savePreset(api, 1, 'Wide Shot', '全景拍摄位置', true);
console.log('位置已保存到预设 1');

// 调用预设 1
await presetService.recallPreset(api, 1, { wait: true, restoreSettings: true });
console.log('已调用预设 1');

// 获取预设详情
const presetInfo = await presetService.getPresetInfo(api, 1);
console.log('预设详情:', presetInfo);
```

### 批量预设操作
```javascript
// 批量调用预设
const presetIds = [1, 2, 3];
const results = await presetService.recallMultiplePresets(api, presetIds, {
  wait: true,
  delay: 2,  // 预设间延迟 2 秒
  stopOnError: false
});

console.log('批量调用结果:');
results.forEach(result => {
  if (result.success) {
    console.log(`✓ 预设 ${result.presetId} 调用成功`);
  } else {
    console.log(`✗ 预设 ${result.presetId} 调用失败: ${result.error}`);
  }
});

// 创建预设序列
const createPresetSequence = async () => {
  const positions = [
    { id: 1, name: 'Position 1', pan: 0, tilt: 0, zoom: 100 },
    { id: 2, name: 'Position 2', pan: 50, tilt: 20, zoom: 300 },
    { id: 3, name: 'Position 3', pan: -50, tilt: -20, zoom: 200 }
  ];
  
  for (const pos of positions) {
    // 移动到指定位置
    await controlService.gotoPTZPosition(api, pos.pan, pos.tilt, pos.zoom);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 保存预设
    await presetService.savePreset(api, pos.id, pos.name, `自动创建的预设 ${pos.id}`);
    console.log(`预设 ${pos.id} 保存完成`);
  }
};

await createPresetSequence();
```

### 配置导入导出
```javascript
// 导出预设配置
const exportPresets = async (filePath) => {
  const presets = await presetService.getPresets(api);
  const exportData = {
    export_time: new Date().toISOString(),
    camera_model: (await cameraService.getInfo(api)).model,
    presets: presets.presets
  };
  
  const fs = require('fs');
  fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2));
  console.log(`预设配置已导出到: ${filePath}`);
};

// 导入预设配置
const importPresets = async (filePath, overwrite = false) => {
  const fs = require('fs');
  const importData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  for (const preset of importData.presets) {
    try {
      if (overwrite || !preset.saved) {
        await presetService.savePreset(
          api, 
          preset.id, 
          preset.name, 
          preset.description,
          true
        );
        console.log(`预设 ${preset.id} 导入成功`);
      } else {
        console.log(`预设 ${preset.id} 已存在，跳过`);
      }
    } catch (error) {
      console.error(`预设 ${preset.id} 导入失败:`, error.message);
    }
  }
};

await exportPresets('presets_backup.json');
await importPresets('presets_backup.json', true);
```

### 预设验证和管理
```javascript
// 验证预设完整性
const validatePresets = async () => {
  const presets = await presetService.getPresets(api);
  const issues = [];
  
  for (const preset of presets.presets) {
    if (!preset.saved) {
      continue;
    }
    
    // 检查预设名称
    if (!preset.name || preset.name.trim() === '') {
      issues.push({ presetId: preset.id, issue: '预设名称为空' });
    }
    
    // 检查位置数据
    if (!preset.position) {
      issues.push({ presetId: preset.id, issue: '缺少位置数据' });
    } else {
      const { pan, tilt, zoom } = preset.position;
      if (pan < -1000 || pan > 1000) {
        issues.push({ presetId: preset.id, issue: '平移位置超出范围' });
      }
      if (tilt < -1000 || tilt > 1000) {
        issues.push({ presetId: preset.id, issue: '俯仰位置超出范围' });
      }
      if (zoom < 0 || zoom > 1000) {
        issues.push({ presetId: preset.id, issue: '变焦位置超出范围' });
      }
    }
  }
  
  return issues;
};

const issues = await validatePresets();
if (issues.length > 0) {
  console.log('发现预设问题:');
  issues.forEach(issue => {
    console.log(`预设 ${issue.presetId}: ${issue.issue}`);
  });
} else {
  console.log('所有预设验证通过');
}
```

## 错误处理

### 常见错误类型
- `ValidationError`: 参数验证错误（ID 范围、名称长度等）
- `PresetError`: 预设相关错误（不存在、已占用等）
- `CameraStateError`: 相机状态错误（移动中、无法保存等）
- `APIError`: API 调用错误（权限、不支持的功能等）

### 错误处理示例
```javascript
try {
  await presetService.savePreset(api, 17, 'Invalid ID'); // ID 超出范围
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('预设 ID 错误:', error.message);
  }
}

try {
  await presetService.recallPreset(api, 99); // 预设不存在
} catch (error) {
  if (error instanceof PresetError) {
    console.error('预设错误:', error.message);
  }
}

try {
  await presetService.savePreset(api, 1, 'A'.repeat(100)); // 名称太长
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('名称验证错误:', error.message);
  }
}
```

## 最佳实践

1. **命名规范**: 使用有意义且一致的预设命名规范
2. **位置验证**: 保存前验证 PTZ 位置的合理性
3. **定期备份**: 定期导出预设配置作为备份
4. **文档记录**: 为复杂场景记录预设的用途和设置
5. **版本管理**: 对预设配置进行版本管理
6. **测试验证**: 导入预设后进行测试验证

## 注意事项

1. **预设数量**: 最多支持 16 个预设位置
2. **名称唯一性**: 同一相机内预设名称不能重复
3. **位置精度**: 预设位置精度受机械限制影响
4. **设置保存**: 包含相机设置的预设占用更多存储空间
5. **兼容性**: 不同相机型号的预设配置可能不完全兼容
6. **移动时间**: 调用预设时的移动时间取决于位置差异