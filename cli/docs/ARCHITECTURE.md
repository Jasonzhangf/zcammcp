# Z CAM CLI 架构设计

## 目录结构

```
cli/
├── src/
│   ├── index.js                 # CLI入口点（兼容版）
│   ├── index.js                # CLI入口点
│   ├── config/                  # 配置管理
│   │   ├── config.js           # 配置管理器
│   │   ├── strict-config.js    # 严格配置管理器
│   │   ├── exact-resolver.js   # 精确配置解析器
│   │   └── env.js              # 环境变量配置
│   ├── core/                    # 核心模块
│   │   ├── api.js              # API客户端
│   │   ├── exact-api.js        # 精确API客户端
│   │   ├── base-service.js     # 服务基类
│   │   └── constants.js        # 全局常量定义
│   ├── modules/                 # 功能模块
│   │   ├── camera/             # 相机基础管理
│   │   │   ├── index.js        # 命令行接口
│   │   │   ├── service.js      # 业务逻辑实现
│   │   │   └── README.md       # 模块文档
│   │   ├── control/            # 运动控制（PTZ + 镜头）
│   │   │   ├── index.js        # 命令行接口
│   │   │   ├── service.js      # 业务逻辑实现
│   │   │   └── README.md       # 模块文档
│   │   ├── preset/             # 预设位置管理
│   │   │   ├── index.js        # 命令行接口
│   │   │   ├── service.js      # 业务逻辑实现
│   │   │   └── README.md       # 模块文档
│   │   ├── record/             # 录制控制
│   │   │   ├── index.js        # 命令行接口
│   │   │   ├── service.js      # 业务逻辑实现
│   │   │   └── README.md       # 模块文档
│   │   ├── stream/             # 流媒体控制
│   │   │   ├── index.js        # 命令行接口
│   │   │   ├── service.js      # 业务逻辑实现
│   │   │   └── README.md       # 模块文档
│   │   ├── image/              # 图像视频设置
│   │   │   ├── index.js        # 命令行接口
│   │   │   ├── service.js      # 业务逻辑实现
│   │   │   └── README.md       # 模块文档
│   │   ├── system/             # 系统管理
│   │   │   ├── index.js        # 命令行接口
│   │   │   ├── service.js      # 业务逻辑实现
│   │   │   └── README.md       # 模块文档
│   │   ├── network/            # 网络配置
│   │   │   ├── index.js        # 命令行接口
│   │   │   ├── service.js      # 业务逻辑实现
│   │   │   └── README.md       # 模块文档
│   │   └── config/             # 配置管理
│   │       ├── index.js        # 命令行接口
│   │       ├── service.js      # 业务逻辑实现
│   │       └── README.md       # 模块文档
│   └── utils/                   # 工具函数
│       ├── cli-helpers.js      # CLI辅助工具
│       ├── exact-cli-helpers.js # 精确CLI辅助工具
│       ├── formatter.js        # 输出格式化
│       ├── error-handler.js    # 错误处理器
│       ├── errors.js           # 错误类型定义
│       └── validators/         # 验证器
│           └── network.js      # 网络参数验证器
├── tests/                       # 测试文件
│   ├── unit/                   # 单元测试
│   │   ├── core/               # 核心模块测试
│   │   └── utils/              # 工具模块测试
│   ├── integration/            # 集成测试
│   └── fixtures/               # 测试数据
├── examples/                    # 使用示例
├── docs/                       # 文档
│   ├── API_MAPPING.md          # API映射文档
│   ├── ARCHITECTURE.md         # 架构设计文档
│   ├── EXAMPLES.md             # 使用示例
│   └── IMPLEMENTATION_PLAN.md  # 实现计划
├── bin/                        # 可执行文件
│   └── zcam                    # CLI入口脚本
│   └── zcam                    # CLI入口脚本
└── package.json               # 包配置
```

## 核心组件架构

### 1. 模块化架构设计

每个功能模块都是独立的，包含：
- **index.js** - 命令定义和路由
- **service.js** - API服务层封装
- **独立测试文件**
- **独立文档**

模块间通过核心API客户端通信，彼此独立不覆盖。

### 2. CLI入口层 (`index.js`)
```javascript
#!/usr/bin/env node
const { Command } = require('commander');
const pkg = require('../package.json');

const program = new Command();

program
  .name('zcam')
  .description('Z CAM Camera Control CLI')
  .version(pkg.version)
  .requiredOption('-h, --host <host>', '相机IP地址')
  .requiredOption('-p, --port <port>', 'HTTP端口')
  .requiredOption('-t, --timeout <timeout>', '超时时间(ms)')
  .option('--json', 'JSON格式输出')
  .option('--verbose', '详细输出')
  .option('--profile <profile>', '配置文件profile');

// 动态加载模块
const modules = ['camera', 'control', 'preset', 'record', 'stream', 'image', 'system', 'network'];

modules.forEach(moduleName => {
  try {
    const moduleCmd = require(`./modules/${moduleName}`);
    program.addCommand(moduleCmd);
  } catch (error) {
    console.warn(`Warning: Cannot load module ${moduleName}: ${error.message}`);
  }
});

program.parse(process.argv);
```

### 3. 核心API客户端 (`core/api.js`)
```javascript
class ZCamAPI {
  constructor(options = {}) {
    if (!options.host) throw new Error('host参数是必需的');
    if (!options.port) throw new Error('port参数是必需的');
    if (!options.timeout) throw new Error('timeout参数是必需的');
    
    this.host = options.host;
    this.port = options.port;
    this.timeout = options.timeout;
    this.baseURL = `http://${this.host}:${this.port}`;
    this.sessionCookie = null;
    this.lastRequestTime = 0;
    this.minRequestInterval = options.requestInterval || 50; // 请求限流
  }

  async request(endpoint, options = {}) {
    // 请求限流、会话管理、错误处理
    // ... 详见实际实现
  }
}

function createAPI(globalOptions) {
  const config = require('../config/config');
  const profileConfig = config.getProfile(globalOptions.profile);

  return new ZCamAPI({
    host: globalOptions.host || profileConfig.host,
    port: globalOptions.port || profileConfig.port,
    timeout: globalOptions.timeout || profileConfig.timeout
  });
}
```

### 4. 模块标准结构

每个模块都遵循统一的结构：

#### 命令定义 (`modules/xxx/index.js`)
```javascript
const { Command } = require('commander');
const service = require('./service');
const { formatOutput } = require('../../utils/formatter');
const { createAPI } = require('../../core/api');
const { handleErrors } = require('../../utils/error-handler');

const cmd = new Command('modulename')
  .description('模块描述');

cmd
  .command('subcommand')
  .description('子命令描述')
  .option('--option <value>', '选项描述')
  .action(async (options, cmd) => {
    try {
      const globalOptions = cmd.parent.parent;
      const api = createAPI(globalOptions);
      const result = await service.someMethod(api, options);
      formatOutput(result, globalOptions.json);
    } catch (error) {
      handleErrors(error, globalOptions);
    }
  });

module.exports = cmd;
```

#### 服务层 (`modules/xxx/service.js`)
```javascript
class ModuleService {
  static async someMethod(api, params) {
    // 参数验证
    if (!params.requiredParam) {
      throw new Error('必需参数不能为空');
    }

    // API调用
    return await api.get('/endpoint', { param: value });
  }
}

module.exports = ModuleService;
```

## 数据流设计

```
CLI Input → Commander.js → Command Handler → Service Layer → API Client → Z CAM Camera
                ↓
           Config Manager
                ↓
            Output Formatter → Console/JSON
```

## 配置管理

### 配置文件格式 (`~/.zcamrc`)
```ini
[default]
host = 192.168.1.100
port = 80
timeout = 20000
output = table
verbose = false

[studio]
host = 192.168.1.101
port = 80
timeout = 30000
output = json

[live]
host = 192.168.1.102
port = 8080
timeout = 20000
```

**注意**: 配置文件中的所有参数都是必需的，CLI不会使用默认值。

### 配置加载器
```javascript
// config/config.js
const fs = require('fs');
const path = require('path');
const os = require('os');

class ConfigManager {
  constructor() {
    this.configPath = path.join(os.homedir(), '.zcamrc');
    this.config = this.loadConfig();
  }

  loadConfig() {
    if (!fs.existsSync(this.configPath)) {
      return this.createDefaultConfig();
    }

    const content = fs.readFileSync(this.configPath, 'utf8');
    return this.parseIni(content);
  }

  getProfile(profile = 'default') {
    return this.config[profile] || this.config.default;
  }

  createDefaultConfig() {
    throw new Error('不允许创建默认配置，必须显式指定所有参数');
  }
}
```

## 错误处理策略

### 错误类型定义
```javascript
// utils/errors.js
class ZCamError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'ZCamError';
    this.code = code;
  }
}

class APIError extends ZCamError {
  constructor(status, message) {
    super(`API Error ${status}: ${message}`, 'API_ERROR');
    this.status = status;
  }
}

class ConnectionError extends ZCamError {
  constructor(message) {
    super(`Connection Error: ${message}`, 'CONNECTION_ERROR');
  }
}

class ValidationError extends ZCamError {
  constructor(message) {
    super(`Validation Error: ${message}`, 'VALIDATION_ERROR');
  }
}
```

### 全局错误处理
```javascript
// utils/error-handler.js
const { formatError } = require('./formatter');

function handleErrors(error, cmd) {
  if (error instanceof ValidationError) {
    console.error(`❌ ${error.message}`);
    process.exit(1);
  }

  if (error instanceof APIError) {
    if (error.status === 401) {
      console.error('❌ 认证失败，请检查用户名和密码');
    } else if (error.status === 404) {
      console.error('❌ API端点不存在，请检查相机固件版本');
    } else {
      console.error(`❌ 相机API错误: ${error.message}`);
    }
    process.exit(1);
  }

  if (error instanceof ConnectionError) {
    console.error(`❌ 连接相机失败: ${error.message}`);
    console.error('   请检查相机IP地址和网络连接');
    process.exit(1);
  }

  if (cmd.verbose) {
    console.error(formatError(error));
  } else {
    console.error(`❌ 未知错误: ${error.message}`);
  }

  process.exit(1);
}
```

## 输出格式化

### 表格格式
```javascript
// utils/formatter.js
const Table = require('cli-table3');

function formatTable(data) {
  const table = new Table({
    head: Object.keys(data[0] || {}),
    chars: {
      'top': '═',
      'top-mid': '╤',
      'top-left': '╔',
      'top-right': '╗',
      'bottom': '═',
      'bottom-mid': '╧',
      'bottom-left': '╚',
      'bottom-right': '╝',
      'left': '║',
      'left-mid': '╟',
      'mid': '─',
      'mid-mid': '┼',
      'right': '║',
      'right-mid': '╢',
      'middle': '│'
    }
  });

  if (Array.isArray(data)) {
    data.forEach(row => table.push(Object.values(row)));
  } else {
    table.push(Object.values(data));
  }

  return table.toString();
}
```

## 测试策略

### 单元测试
```javascript
// tests/unit/services/camera.test.js
const CameraService = require('../../../src/services/camera');


describe('CameraService', () => {
  let api;

  beforeEach(() => {
    // API implementation
  });

  test('should get camera info', async () => {
    const result = await api.get('/info');

    const result = await CameraService.getInfo(api);

    expect(result.model).toBe('ZCAM E2');
    expect(api.lastRequest).toBe('/info');
  });
});
```

### 集成测试
```javascript
// tests/integration/cli.test.js
const { execSync } = require('child_process');
const path = require('path');

describe('CLI Integration', () => {
  test('should show camera info', () => {
    const output = execSync(`node ${path.join(__dirname, '../../bin/zcam')} camera info --json`, {
      encoding: 'utf8'
    });

    const result = JSON.parse(output);
    expect(result).toHaveProperty('model');
  });
});
```

}
```

## 发布流程

### package.json 配置
```json
{
  "name": "zcam-cli",
  "version": "1.0.0",
  "description": "Z CAM Camera Control CLI",
  "main": "src/index.js",
  "bin": {
    "zcam": "./bin/zcam"
  },
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint src/",
    "lint:fix": "eslint src/ --fix",
    "build": "babel src -d lib",
    "prepublishOnly": "npm run build && npm test"
  },
  "dependencies": {
    "commander": "^9.4.0",
    "cli-table3": "^0.6.3",
    "ini": "^3.0.1",
    "chalk": "^4.1.2",
    "fetch": "^1.1.0"
  },
  "devDependencies": {
    "jest": "^29.0.0",
    "eslint": "^8.23.0",
    "nodemon": "^2.0.19",
    "@babel/cli": "^7.18.0",
    "@babel/core": "^7.18.0",
    "@babel/preset-env": "^7.18.0"
  }
}
```

## 性能优化

1. **并发请求**: 对于批量操作使用 Promise.all
2. **连接复用**: 保持 HTTP 连接池
3. **缓存机制**: 缓存相机信息等不常变化的数据
4. **懒加载**: 按需加载命令模块

## 安全考虑

1. **HTTPS支持**: 支持 HTTPS 连接
2. **认证处理**: 安全存储和传输认证信息
3. **输入验证**: 严格验证所有用户输入
4. **敏感信息**: 避免在日志中暴露密码等敏感信息