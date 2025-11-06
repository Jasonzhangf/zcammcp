# Z CAM CLI 实现计划

## 开发阶段规划

### 第一阶段：核心框架搭建
**目标**: 建立基础CLI框架和API连接

#### 任务清单
- [x] 创建项目目录结构
- [x] 编写设计文档
- [ ] 初始化npm项目配置
- [ ] 实现HTTP API客户端
- [ ] 实现配置文件管理
- [ ] 实现日志系统
- [ ] 实现错误处理机制
- [ ] 实现输出格式化

#### 核心文件
```
cli/
├── package.json              # 项目配置
├── src/
│   ├── index.js              # CLI入口
│   ├── services/api.js       # HTTP API客户端
│   ├── config/config.js      # 配置管理
│   ├── utils/logger.js       # 日志系统
│   ├── utils/errors.js       # 错误定义
│   └── utils/formatter.js    # 输出格式化
```

#### 技术栈
- **命令行框架**: Commander.js
- **HTTP客户端**: Node.js fetch API
- **配置解析**: ini解析库
- **表格输出**: cli-table3
- **日志**: 自定义日志系统
- **测试**: Jest

### 第二阶段：基础功能实现
**目标**: 实现核心相机控制功能

#### 任务清单
- [ ] 实现camera模块（相机信息查询）
- [ ] 实现control模块（PTZ和镜头控制）
- [ ] 实现preset模块（预设位置管理）
- [ ] 实现record模块（录制控制）
- [ ] 添加参数验证
- [ ] 添加单元测试

#### 模块实现顺序
1. **camera** - 最基础的信息查询
2. **control** - 核心运动控制
3. **preset** - 位置管理
4. **record** - 录制功能

### 第三阶段：高级功能实现
**目标**: 实现流媒体和图像设置功能

#### 任务清单
- [ ] 实现stream模块（流媒体推流）
- [ ] 实现image模块（图像和视频设置）
- [ ] 实现system模块（系统管理）
- [ ] 实现network模块（网络配置）
- [ ] 添加集成测试

#### 功能重点
- **RTMP/SRT/NDI推流** - 复杂参数处理
- **曝光控制** - 精确参数映射
- **网络配置** - 参数验证和安全

### 第四阶段：完善和优化
**目标**: 完善功能和性能优化

#### 任务清单
- [ ] 实现配置文件profile支持
- [ ] 实现批量操作功能
- [ ] 添加交互式模式
- [ ] 性能优化
- [ ] 完善文档和示例

#### 增强功能
- **批量预设操作**
- **自动重连机制**
- **操作历史记录**
- **快捷命令别名**

## 详细实现计划

### 1. 项目初始化

#### package.json 配置
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
    "lint:fix": "eslint src/ --fix"
  },
  "dependencies": {
    "commander": "^9.4.0",
    "cli-table3": "^0.6.3",
    "ini": "^3.0.1",
    "chalk": "^4.1.2"
  },
  "devDependencies": {
    "jest": "^29.0.0",
    "eslint": "^8.23.0",
    "nodemon": "^2.0.19"
  },
  "keywords": ["zcam", "camera", "cli", "ptz", "streaming"],
  "author": "Z CAM CLI Team",
  "license": "MIT"
}
```

#### 可执行文件 (bin/zcam)
```javascript
#!/usr/bin/env node
require('../src/index.js');
```

### 2. 核心API客户端实现

#### HTTP API客户端
```javascript
// src/services/api.js
const fetch = require('node-fetch');
const { APIError, ConnectionError } = require('../utils/errors');

class ZCamAPI {
  constructor(options = {}) {
    this.host = options.host || '192.168.1.100';
    this.port = options.port || 80;
    this.timeout = options.timeout || 20000;
    this.baseURL = `http://${this.host}:${this.port}`;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        ...options
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new APIError(response.status, response.statusText);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new ConnectionError(`Request timeout after ${this.timeout}ms`);
      }

      if (error.code === 'ECONNREFUSED') {
        throw new ConnectionError(`Cannot connect to camera at ${this.host}:${this.port}`);
      }

      throw error;
    }
  }

  async get(endpoint) {
    return this.request(endpoint);
  }

  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
  }
}

module.exports = ZCamAPI;
```

### 3. 命令行框架实现

#### 主入口文件
```javascript
// src/index.js
#!/usr/bin/env node
const { Command } = require('commander');
const pkg = require('../package.json');
const { loadConfig } = require('./config/config');
const { handleErrors } = require('./utils/error-handler');

const program = new Command();

program
  .name('zcam')
  .description('Z CAM Camera Control CLI')
  .version(pkg.version)
  .option('-h, --host <host>', '相机IP地址', '192.168.1.100')
  .option('-p, --port <port>', 'HTTP端口', '80')
  .option('-t, --timeout <timeout>', '超时时间(ms)', '20000')
  .option('--json', 'JSON格式输出')
  .option('--verbose', '详细输出')
  .option('--profile <profile>', '配置文件profile', 'default');

// 加载子命令
const commands = [
  'camera',
  'control',
  'preset',
  'record',
  'stream',
  'image',
  'system',
  'network'
];

commands.forEach(cmd => {
  try {
    require(`./commands/${cmd}`);
  } catch (error) {
    console.warn(`Warning: Cannot load command ${cmd}: ${error.message}`);
  }
});

// 全局错误处理
process.on('uncaughtException', handleErrors);
process.on('unhandledRejection', handleErrors);

program.parse(process.argv);

// 如果没有提供命令，显示帮助
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
```

#### 命令加载器模板
```javascript
// src/commands/template.js
const { Command } = require('commander');
const ZCamAPI = require('../services/api');
const formatOutput = require('../utils/formatter');

function createAPI(globalOptions) {
  const config = loadConfig(globalOptions.profile);

  return new ZCamAPI({
    host: globalOptions.host || config.host,
    port: globalOptions.port || config.port,
    timeout: globalOptions.timeout || config.timeout
  });
}

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

      // 执行具体操作
      const result = await someService.someMethod(api, options);

      formatOutput(result, globalOptions.json);
    } catch (error) {
      handleErrors(error, globalOptions);
    }
  });

module.exports = cmd;
```

### 4. 测试策略

#### 单元测试模板
```javascript
// tests/unit/services/api.test.js
const ZCamAPI = require('../../../src/services/api');
const fetch = require('node-fetch');

jest.mock('node-fetch');

describe('ZCamAPI', () => {
  let api;

  beforeEach(() => {
    api = new ZCamAPI({
      host: '192.168.1.100',
      port: 80,
      timeout: 5000
    });

    fetch.mockClear();
  });

  test('should make GET request successfully', async () => {
    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({ success: true })
    };
    fetch.mockResolvedValue(mockResponse);

    const result = await api.get('/info');

    expect(fetch).toHaveBeenCalledWith(
      'http://192.168.1.100:80/info',
      expect.objectContaining({
        signal: expect.any(AbortSignal)
      })
    );
    expect(result).toEqual({ success: true });
  });

  test('should handle API errors', async () => {
    const mockResponse = {
      ok: false,
      status: 404,
      statusText: 'Not Found'
    };
    fetch.mockResolvedValue(mockResponse);

    await expect(api.get('/invalid')).rejects.toThrow('API Error 404: Not Found');
  });

  test('should handle connection timeout', async () => {
    fetch.mockRejectedValue(new Error('AbortError'));

    await expect(api.get('/info')).rejects.toThrow('Connection Error');
  });
});
```

#### 集成测试模板
```javascript
// tests/integration/cli.test.js
const { execSync } = require('child_process');
const path = require('path');

describe('CLI Integration Tests', () => {
  const cliPath = path.join(__dirname, '../../bin/zcam');

  test('should show version', () => {
    const output = execSync(`node ${cliPath} --version`, { encoding: 'utf8' });
    expect(output).toMatch(/\d+\.\d+\.\d+/);
  });

  test('should show help', () => {
    const output = execSync(`node ${cliPath} --help`, { encoding: 'utf8' });
    expect(output).toContain('Z CAM Camera Control CLI');
    expect(output).toContain('camera');
    expect(output).toContain('control');
  });

  test('should handle connection error gracefully', () => {
    expect(() => {
      execSync(`node ${cliPath} camera info --host 192.168.1.999`, {
        encoding: 'utf8',
        stdio: 'pipe'
      });
    }).toThrow();
  });
});
```

### 5. 发布准备

#### 构建脚本
```bash
#!/bin/bash
# scripts/build.sh

echo "Building Z CAM CLI..."

# 运行测试
npm test

# 检查代码质量
npm run lint

# 构建项目
npm run build

# 运行集成测试
npm run test:integration

echo "Build completed successfully!"
```

#### 发布清单
- [ ] 所有测试通过
- [ ] 代码覆盖率 > 80%
- [ ] 文档完整
- [ ] 示例代码可运行
- [ ] 版本号更新
- [ ] CHANGELOG更新

## 开发里程碑

### Milestone 1: MVP版本 (2周)
- 基础框架
- camera + control + preset + record 模块
- 基本错误处理
- 简单文档

### Milestone 2: 功能完整版 (4周)
- 所有8个模块
- 完整配置管理
- 全面测试覆盖
- 详细文档

### Milestone 3: 生产就绪版 (6周)
- 性能优化
- 高级功能
- 完善的CLI体验
- 社区支持

## 风险评估

### 技术风险
- **API兼容性**: 不同相机固件版本API可能不同
- **网络稳定性**: 相机连接可能不稳定
- **性能**: 大量并发请求可能影响相机性能

### 缓解策略
- 版本检测和API适配
- 自动重连机制
- 请求限流和缓存

### 质量保证
- 代码审查流程
- 自动化测试
- 持续集成
- 用户反馈收集