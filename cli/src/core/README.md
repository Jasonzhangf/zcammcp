# Core 模块

核心模块提供 Z CAM CLI 的基础功能，包括 API 客户端、服务基类和常量定义。

## 架构设计

```
core/
├── api.js              # 标准 API 客户端（兼容旧版）
├── exact-api.js        # 精确 API 客户端（新版，无回退）
├── base-service.js     # 服务基类
└── constants.js        # 全局常量定义
```

## 文件说明

### api.js - 标准 API 客户端
**作用**: 提供向后兼容的 HTTP API 客户端，支持默认值回退策略。

**主要功能**:
- HTTP 请求封装（GET/POST/PUT/DELETE）
- 会话管理和 Cookie 处理
- 请求限流和超时控制
- 错误处理和重试机制
- 连接测试和状态查询

**使用方式**:
```javascript
const { createAPI } = require('./core/api');
const api = createAPI({ host: '192.168.1.100', port: 80, timeout: 30000 });
const info = await api.get('/info');
```

### exact-api.js - 精确 API 客户端
**作用**: 提供严格无回退的 HTTP API 客户端，要求显式配置所有参数。

**主要功能**:
- 严格的参数验证（无默认值）
- 精确的错误报告
- 强制配置完整性检查
- 无静默回退机制

**使用方式**:
```javascript
const { createExactAPI } = require('./core/exact-api');
const api = createExactAPI({ 
  host: '192.168.1.100', 
  port: 80, 
  timeout: 30000 
});
const info = await api.get('/info');
```

### base-service.js - 服务基类
**作用**: 为所有业务服务模块提供统一的基础功能和工具方法。

**主要功能**:
- 参数验证和类型检查
- 批量处理和分页响应
- 缓存管理和重试机制
- 日志记录和错误处理
- 响应格式化

**使用方式**:
```javascript
const BaseService = require('./core/base-service');

class MyService extends BaseService {
  async getData(params) {
    this.validateParams(params, ['id', 'type']);
    return await this.executeAPI(
      () => this.api.get('/data', params),
      '获取数据失败'
    );
  }
}
```

### constants.js - 全局常量
**作用**: 定义系统中使用的所有常量，避免硬编码。

**包含常量**:
- 网络配置（默认主机、端口、超时）
- API 配置（端点、User-Agent）
- 输出格式和选项
- 配置文件路径和选项

## 参数说明

### API 客户端参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|------|------|------|--------|------|
| host | string | 是 | - | 相机 IP 地址 |
| port | number | 是 | - | HTTP 端口 (1-65535) |
| timeout | number | 是 | - | 请求超时时间 (1000-300000ms) |
| userAgent | string | 否 | Z-CAM-CLI/1.0.0 | HTTP User-Agent |
| requestInterval | number | 否 | 50 | 请求间隔 (10-5000ms) |

### 精确 API 客户端参数

所有参数都是必需的，不提供默认值。

## 使用示例

### 基础 API 调用
```javascript
const { createAPI } = require('./core/api');

// 创建 API 客户端（有默认值回退）
const api = createAPI({
  host: '192.168.1.100',
  port: 80,
  timeout: 30000
});

try {
  // 获取相机信息
  const info = await api.get('/info');
  console.log('相机信息:', info);
  
  // 设置相机昵称
  const result = await api.get('/ctrl/nick_name?action=set&name=StudioCam');
  console.log('设置结果:', result);
  
} catch (error) {
  console.error('API 调用失败:', error.message);
}
```

### 精确 API 调用
```javascript
const { createExactAPI } = require('./core/exact-api');

// 创建精确 API 客户端（无回退）
const api = createExactAPI({
  host: '192.168.1.100',
  port: 80,
  timeout: 30000,
  userAgent: 'MyApp/1.0.0',
  requestInterval: 100
});

try {
  // 测试连接
  const isConnected = await api.testConnection();
  console.log('连接状态:', isConnected);
  
  // 获取相机信息
  const info = await api.getCameraInfo();
  console.log('相机信息:', info);
  
} catch (error) {
  console.error('精确 API 调用失败:', error.message);
}
```

### 服务基类继承
```javascript
const BaseService = require('./core/base-service');
const { createExactAPI } = require('./core/exact-api');

class CameraService extends BaseService {
  constructor(apiConfig) {
    super();
    this.api = createExactAPI(apiConfig);
  }
  
  async getCameraInfo() {
    return await this.executeAPI(
      () => this.api.get('/info'),
      '获取相机信息失败'
    );
  }
  
  async setNickname(name) {
    this.validateParams({ name }, ['name']);
    this.validateRange(name.length, 1, 50, '昵称长度');
    
    return await this.executeAPI(
      () => this.api.get(`/ctrl/nick_name?action=set&name=${encodeURIComponent(name)}`),
      '设置昵称失败'
    );
  }
}

// 使用服务
const cameraService = new CameraService({
  host: '192.168.1.100',
  port: 80,
  timeout: 30000
});

const info = await cameraService.getCameraInfo();
await cameraService.setNickname('My Camera');
```

## 错误处理

### 错误类型
- `APIError`: HTTP API 错误（状态码、响应格式等）
- `ConnectionError`: 网络连接错误（超时、拒绝连接等）
- `ValidationError`: 参数验证错误（格式、范围等）

### 错误处理示例
```javascript
try {
  const result = await api.get('/invalid-endpoint');
} catch (error) {
  if (error instanceof APIError) {
    console.error(`API 错误 ${error.status}: ${error.message}`);
  } else if (error instanceof ConnectionError) {
    console.error(`连接错误: ${error.message}`);
  } else if (error instanceof ValidationError) {
    console.error(`参数错误: ${error.message}`);
  } else {
    console.error(`未知错误: ${error.message}`);
  }
}
```

## 最佳实践

1. **使用精确 API 客户端**：新代码优先使用 `exact-api.js`，避免意外的默认值行为
2. **继承服务基类**：所有业务服务都应继承 `BaseService`，获得统一的功能
3. **参数验证**：在服务层进行严格的参数验证，提前发现错误
4. **错误处理**：使用具体的错误类型进行精确的错误处理
5. **资源管理**：及时清理会话和缓存，避免资源泄露

## 迁移指南

### 从 api.js 迁移到 exact-api.js

1. **移除默认值依赖**：确保所有必需参数都显式提供
2. **添加参数验证**：在创建客户端前验证所有参数
3. **更新错误处理**：处理新的 `ValidationError` 类型
4. **测试连接**：使用 `testConnection()` 方法验证配置

```javascript
// 旧代码
const api = createAPI({ host: '192.168.1.100' }); // 使用默认端口和超时

// 新代码
const api = createExactAPI({ 
  host: '192.168.1.100', 
  port: 80, 
  timeout: 30000 
}); // 显式指定所有参数
```