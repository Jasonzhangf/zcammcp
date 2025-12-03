# Utils 模块

工具模块提供 CLI 的通用工具功能，包括输出格式化、错误处理、参数验证和网络验证等。

## 架构设计

```
utils/
├── cli-helpers.js         # CLI 辅助工具（兼容旧版）
├── exact-cli-helpers.js   # 精确 CLI 辅助工具（新版，无回退）
├── formatter.js          # 输出格式化工具
├── error-handler.js      # 错误处理器
├── errors.js             # 错误类型定义
└── validators/
    └── network.js        # 网络参数验证器
```

## 文件说明

### cli-helpers.js - CLI 辅助工具

**作用**: 提供向后兼容的 CLI 辅助功能，支持回退策略。

**主要功能**:

- 命令行参数解析和验证
- 输出格式解析
- 全局选项获取
- 连接配置解析
- 常用工具函数

**使用方式**:

```javascript
const { resolveConnectionOptions, getGlobalOptions } = require('./utils/cli-helpers');
const connectionConfig = resolveConnectionOptions(options, globalOptions);
```

### exact-cli-helpers.js - 精确 CLI 辅助工具

**作用**: 提供严格无回退的 CLI 辅助功能，要求显式参数。

**主要功能**:

- 精确的参数解析（无默认值）
- 严格的选项验证
- 强制必需参数检查
- 精确的错误报告

**使用方式**:

```javascript
const { resolveConnectionOptions, getGlobalOptions } = require('./utils/exact-cli-helpers');
try {
  const connectionConfig = resolveConnectionOptions(options, globalOptions);
} catch (error) {
  console.error('参数解析错误:', error.message);
}
```

### formatter.js - 输出格式化工具

**作用**: 提供多种格式的输出功能，支持表格、JSON、CSV 等格式。

**主要功能**:

- 表格格式化（带边框和颜色）
- JSON 格式化（带缩进）
- CSV 格式化
- 进度条和状态显示
- 文件大小和时间格式化
- 彩色消息输出

**使用方式**:

```javascript
const { formatOutput, success, error, warn } = require('./utils/formatter');
formatOutput(data, 'table');
success('操作成功');
error('操作失败');
```

### error-handler.js - 错误处理器

**作用**: 提供统一的错误处理和用户友好的错误信息。

**主要功能**:

- 错误分类和格式化
- 用户友好的错误消息
- 操作建议提供
- 调试信息控制

**使用方式**:

```javascript
const { handleErrors } = require('./utils/error-handler');
handleErrors(error, options);
```

### errors.js - 错误类型定义

**作用**: 定义系统中使用的所有错误类型。

**错误类型**:

- `ZCamError`: 基础错误类
- `APIError`: API 调用错误
- `ConnectionError`: 网络连接错误
- `ValidationError`: 参数验证错误
- `ConfigError`: 配置错误
- `ModuleError`: 模块加载错误
- `CameraStateError`: 相机状态错误
- `PermissionError`: 权限错误
- `HardwareError`: 硬件错误
- `TimeoutError`: 超时错误

### validators/network.js - 网络验证器

**作用**: 提供网络参数的验证功能。

**验证功能**:

- IP 地址格式验证
- 端口号范围验证
- 主机名格式验证
- 超时时间验证
- URL 格式验证

## 使用示例

### CLI 参数解析

```javascript
const { resolveConnectionOptions, getGlobalOptions } = require('./utils/exact-cli-helpers');

try {
  // 获取全局选项
  const globalOptions = getGlobalOptions(cmd);

  // 解析连接配置
  const connectionConfig = resolveConnectionOptions(options, globalOptions);
  console.log('连接配置:', connectionConfig);

  // 解析输出格式
  const outputFormat = resolveOutputFormat(options, globalOptions);
  console.log('输出格式:', outputFormat);
} catch (error) {
  console.error('参数解析失败:', error.message);
}
```

### 输出格式化

```javascript
const { formatOutput, success, error, warn, info } = require('./utils/formatter');

// 格式化不同类型的数据
const tableData = [
  { name: 'Camera 1', ip: '192.168.1.100', status: 'Online' },
  { name: 'Camera 2', ip: '192.168.1.101', status: 'Offline' },
];

formatOutput(tableData, 'table'); // 表格格式
formatOutput(tableData, 'json'); // JSON 格式
formatOutput(tableData, 'csv'); // CSV 格式

// 彩色消息输出
success('相机连接成功');
error('网络连接失败');
warn('配置文件不存在');
info('正在扫描相机...');

// 进度条
const { createProgressBar } = require('./utils/formatter');
const progress = createProgressBar(50, 100);
console.log(progress);

// 文件大小格式化
const { formatFileSize } = require('./utils/formatter');
console.log(formatFileSize(1024 * 1024 * 5)); // "5.0 MB"
```

### 错误处理

```javascript
const { APIError, ConnectionError, ValidationError } = require('./utils/errors');
const { handleErrors } = require('./utils/error-handler');

// 创建特定错误
try {
  if (!isValidIP(host)) {
    throw new ValidationError(`无效的 IP 地址: ${host}`);
  }

  const response = await api.get('/info');
  if (!response.ok) {
    throw new APIError(response.status, response.statusText);
  }
} catch (error) {
  // 统一错误处理
  handleErrors(error, { verbose: true });
}

// 错误类型检查
if (error instanceof ValidationError) {
  console.error('参数错误:', error.message);
} else if (error instanceof ConnectionError) {
  console.error('连接错误:', error.message);
} else if (error instanceof APIError) {
  console.error(`API 错误 ${error.status}: ${error.message}`);
}
```

### 网络验证

```javascript
const NetworkValidator = require('./utils/validators/network');

try {
  // 验证 IP 地址
  if (NetworkValidator.isValidIP('192.168.1.100')) {
    console.log('IP 地址有效');
  }

  // 验证端口
  const port = NetworkValidator.normalizePort('80');
  console.log('标准化端口:', port);

  // 验证超时时间
  if (NetworkValidator.isValidTimeout(30000)) {
    console.log('超时时间有效');
  }

  // 验证主机名
  if (NetworkValidator.isValidHostname('camera.local')) {
    console.log('主机名有效');
  }
} catch (error) {
  console.error('验证失败:', error.message);
}
```

### 工具函数使用

```javascript
const { delay, retry, safeParseJSON } = require('./utils/exact-cli-helpers');

// 延迟执行
await delay(1000); // 等待 1 秒

// 重试机制
const result = await retry(
  async () => {
    const response = await api.get('/status');
    return response.data;
  },
  3, // 最大重试次数
  1000 // 重试间隔
);

// 安全 JSON 解析
const data = safeParseJSON('{"key": "value"}', {});
if (data) {
  console.log('解析成功:', data);
}
```

## 参数说明

### 输出格式选项

| 格式  | 说明      | 特点                           |
| ----- | --------- | ------------------------------ |
| table | 表格格式  | 带边框、支持颜色、适合终端显示 |
| json  | JSON 格式 | 结构化数据、便于程序处理       |
| csv   | CSV 格式  | 逗号分隔、适合导入表格软件     |

### 错误级别

| 级别 | 函数      | 颜色 | 用途           |
| ---- | --------- | ---- | -------------- |
| 成功 | success() | 绿色 | 操作成功完成   |
| 错误 | error()   | 红色 | 操作失败或错误 |
| 警告 | warn()    | 黄色 | 需要注意的问题 |
| 信息 | info()    | 蓝色 | 一般信息提示   |
| 调试 | debug()   | 灰色 | 调试信息       |

### 验证规则

| 参数类型 | 验证规则      | 错误示例        |
| -------- | ------------- | --------------- |
| IP 地址  | IPv4 格式     | 256.256.256.256 |
| 端口     | 1-65535       | 70000           |
| 超时     | 1000-300000ms | 500             |
| 主机名   | DNS 格式      | invalid..host   |

## 最佳实践

1. **使用精确辅助工具**：新代码优先使用 `exact-cli-helpers.js`，避免意外的默认值行为
2. **统一错误处理**：使用 `handleErrors()` 进行统一的错误处理和用户提示
3. **格式化输出**：根据输出目标选择合适的格式（终端用 table，程序用 json）
4. **参数验证**：在处理用户输入时进行严格的参数验证
5. **彩色输出**：合理使用彩色消息提升用户体验

## 迁移指南

### 从 cli-helpers.js 迁移到 exact-cli-helpers.js

1. **添加异常处理**：所有解析函数都可能抛出 `ValidationError`
2. **移除默认值依赖**：确保所有必需参数都显式提供
3. **更新错误处理**：处理新的验证错误类型
4. **参数完整性检查**：使用 `validateRequiredParams()` 检查必需参数

```javascript
// 旧代码
const connectionConfig = resolveConnectionOptions(options, globalOptions);
// 失败时返回默认配置

// 新代码
try {
  const connectionConfig = resolveConnectionOptions(options, globalOptions);
} catch (error) {
  console.error('连接参数解析失败:', error.message);
  process.exit(1);
}
```

### 自定义格式化

```javascript
// 扩展格式化功能
const { formatOutput } = require('./utils/formatter');

function formatCustomData(data) {
  // 自定义格式化逻辑
  return formatOutput(data, {
    type: 'custom',
    transform: (item) => ({
      ...item,
      formattedTime: new Date(item.timestamp).toLocaleString(),
    }),
  });
}
```

### 错误处理扩展

```javascript
// 自定义错误类型
class CustomError extends ZCamError {
  constructor(message, code = 'CUSTOM_ERROR') {
    super(message, code);
    this.name = 'CustomError';
  }
}

// 扩展错误处理
function customErrorHandler(error, options) {
  if (error instanceof CustomError) {
    console.error(`自定义错误: ${error.message}`);
    // 提供特定的解决建议
  } else {
    // 使用默认错误处理
    handleErrors(error, options);
  }
}
```
