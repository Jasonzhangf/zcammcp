# System 模块

系统模块提供相机的系统管理功能，包括系统信息查询、固件更新、重启恢复、日志管理、存储管理等。

## 架构设计

```
modules/system/
├── index.js      # 命令行接口定义
└── service.js    # 业务逻辑实现
```

## 文件说明

### index.js - 命令行接口
**作用**: 定义系统模块的所有命令行接口和参数。

**命令结构**:
```
system
├── info                   # 获取系统信息
├── status                 # 获取系统状态
├── reboot                 # 重启相机
├── factory-reset          # 恢复出厂设置
├── firmware               # 固件管理子命令
│   ├── version           # 查询固件版本
│   ├── check             # 检查固件更新
│   ├── update <file>     # 更新固件
│   └── rollback          # 回滚固件
├── logs                   # 日志管理子命令
│   ├── list              # 列出日志文件
│   ├── download <file>   # 下载日志文件
│   ├── clear             # 清空日志
│   └── level <level>     # 设置日志级别
├── storage                # 存储管理子命令
│   ├── info              # 获取存储信息
│   ├── format            # 格式化存储
│   ├── test              # 存储测试
│   └── health            # 存储健康检查
├── network                # 网络诊断子命令
│   ├── test <host>       # 网络连通性测试
│   ├── speed             # 网络速度测试
│   └── diagnose          # 网络诊断
├── time                   # 系统时间子命令
│   ├── get               # 获取系统时间
│   ├── set <time>        # 设置系统时间
│   ├── ntp               # NTP 同步
│   └── timezone <tz>     # 设置时区
└── settings               # 系统设置子命令
    ├── list              # 列出系统设置
    ├── get <key>         # 获取设置值
    ├── set <key> <value> # 设置系统值
    └── reset             # 重置系统设置
```

### service.js - 业务逻辑
**作用**: 实现系统管理相关的 API 调用和业务逻辑。

**主要功能**:
- 系统信息和状态查询
- 固件更新和回滚
- 系统重启和恢复
- 日志管理和分析
- 存储管理和维护
- 网络诊断和测试

## 命令详解

### 系统信息

#### system info
**功能**: 获取系统详细信息
```bash
zcam system info
zcam system info --json
```

**返回数据**:
```json
{
  "model": "ZCAM E2",
  "serial_number": "E2XXXXXXXX",
  "firmware_version": "0.95",
  "hardware_version": "1.0",
  "mac_address": "00:11:22:33:44:55",
  "uptime": 86400,
  "cpu_usage": 15.2,
  "memory_usage": 45.8,
  "temperature": 42.5,
  "storage": {
    "total": 1000000000000,
    "used": 500000000000,
    "available": 500000000000
  }
}
```

#### system status
**功能**: 获取系统运行状态
```bash
zcam system status
```

### 系统控制

#### system reboot
**功能**: 重启相机
```bash
zcam system reboot
zcam system reboot --delay 30  # 延迟 30 秒重启
```

#### system factory-reset
**功能**: 恢复出厂设置
```bash
zcam system factory-reset
zcam system factory-reset --confirm  # 跳过确认
```

### 固件管理

#### system firmware version
**功能**: 查询固件版本
```bash
zcam system firmware version
```

#### system firmware update <file>
**功能**: 更新固件
```bash
zcam system firmware update firmware.bin
zcam system firmware update firmware.bin --force  # 强制更新
```

### 存储管理

#### system storage info
**功能**: 获取存储信息
```bash
zcam system storage info
```

#### system storage format
**功能**: 格式化存储
```bash
zcam system storage format
zcam system storage format --confirm
```

### 使用示例

```javascript
const { createExactAPI } = require('../../core/exact-api');
const SystemService = require('./service');

const api = createExactAPI({
  host: '192.168.1.100',
  port: 80,
  timeout: 30000
});

const systemService = new SystemService();

// 获取系统信息
const systemInfo = await systemService.getSystemInfo(api);
console.log('相机型号:', systemInfo.model);
console.log('固件版本:', systemInfo.firmware_version);
console.log('运行时间:', systemInfo.uptime);

// 监控系统状态
const monitorSystem = async () => {
  const status = await systemService.getSystemStatus(api);
  console.log(`CPU 使用率: ${status.cpu_usage}%`);
  console.log(`内存使用率: ${status.memory_usage}%`);
  console.log(`温度: ${status.temperature}°C`);
  
  if (status.temperature > 70) {
    console.warn('相机温度过高，请注意散热');
  }
  
  setTimeout(monitorSystem, 30000); // 每 30 秒检查一次
};

monitorSystem();

// 存储健康检查
const storageHealth = await systemService.checkStorageHealth(api);
if (storageHealth.status !== 'healthy') {
  console.warn('存储设备存在问题:', storageHealth.issues);
}

// 网络诊断
const networkTest = await systemService.testNetworkConnectivity(api, '8.8.8.8');
console.log('网络连通性:', networkTest.reachable ? '正常' : '异常');
```

## 最佳实践

1. **定期检查**: 定期检查系统状态和存储健康
2. **固件更新**: 及时更新固件获得新功能和修复
3. **温度监控**: 监控相机温度避免过热
4. **存储维护**: 定期检查存储设备健康状态
5. **日志管理**: 定期清理日志文件释放空间

## 注意事项

1. **重启影响**: 重启会中断当前的录制和推流
2. **固件更新**: 更新过程中不要断电，确保网络稳定
3. **出厂重置**: 恢复出厂设置会清除所有配置
4. **存储格式**: 格式化存储会删除所有数据
5. **系统资源**: 系统操作可能影响录制和推流性能