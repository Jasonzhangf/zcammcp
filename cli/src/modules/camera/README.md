# Camera 模块

相机模块提供相机基础管理功能，包括信息查询、昵称管理、状态监控、用户管理和时间管理等。

## 架构设计

```
modules/camera/
├── index.js      # 命令行接口定义
└── service.js    # 业务逻辑实现
```

## 文件说明

### index.js - 命令行接口
**作用**: 定义相机模块的所有命令行接口和参数。

**命令结构**:
```
camera
├── info                    # 获取相机基本信息
├── mode                    # 获取相机工作模式
├── nickname [name]         # 设置/获取相机昵称
├── status                  # 获取相机运行状态
├── commit                  # 提交相机设置
├── goto-rec                # 切换到录制模式
├── time                    # 时间管理子命令
│   ├── get                # 获取相机时间
│   ├── set <date> <time>  # 设置相机时间
│   └── timezone <tz>      # 设置时区
└── user                    # 用户管理子命令
    ├── me                 # 获取当前用户信息
    ├── list               # 获取用户列表
    ├── add <user> <pass> <perm>  # 添加用户
    ├── delete <user>      # 删除用户
    ├── password <user> <old> <new>  # 修改密码
    └── logout             # 登出当前用户
```

### service.js - 业务逻辑
**作用**: 实现相机相关的 API 调用和业务逻辑。

**主要功能**:
- 相机信息获取和解析
- 昵称管理和验证
- 状态监控和诊断
- 用户认证和权限管理
- 时间同步和时区设置

## 命令详解

### 基础信息命令

#### camera info
**功能**: 获取相机基本信息
```bash
zcam --host 192.168.1.100 --port 80 --timeout 30000 camera info
zcam --profile studio camera info --json
```

**返回数据**:
```json
{
  "model": "ZCAM E2",
  "serial_number": "E2XXXXXXXX",
  "firmware_version": "0.95",
  "mac_address": "00:11:22:33:44:55",
  "ip_address": "192.168.1.100",
  "subnet_mask": "255.255.255.0",
  "gateway": "192.168.1.1"
}
```

#### camera mode
**功能**: 获取相机工作模式
```bash
zcam camera mode
```

**返回数据**:
```json
{
  "mode": "record",
  "available_modes": ["record", "playback", "setup"]
}
```

#### camera nickname [name]
**功能**: 设置或获取相机昵称
```bash
# 获取昵称
zcam camera nickname

# 设置昵称
zcam camera nickname "Studio Camera A"
```

**参数验证**:
- 昵称长度：1-50 字符
- 支持中文、英文、数字、符号
- 不能包含控制字符

#### camera status
**功能**: 获取相机运行状态
```bash
zcam camera status --json
```

**返回数据**:
```json
{
  "power": "on",
  "recording": false,
  "storage_status": "ready",
  "battery_level": 85,
  "temperature": 42.5,
  "uptime": 3600
}
```

### 控制命令

#### camera commit
**功能**: 提交相机设置到持久存储
```bash
zcam camera commit
```

#### camera goto-rec
**功能**: 切换到录制模式
```bash
zcam camera goto-rec
```

### 时间管理

#### camera time get
**功能**: 获取相机当前时间
```bash
zcam camera time get
```

#### camera time set <date> <time>
**功能**: 设置相机时间
```bash
zcam camera time set 2024-01-15 14:30:00
```

**参数格式**:
- 日期：YYYY-MM-DD
- 时间：HH:MM:SS（24小时制）

#### camera time timezone <timezone>
**功能**: 设置相机时区
```bash
zcam camera time timezone "Asia/Shanghai"
zcam camera time timezone "UTC+8"
```

### 用户管理

#### camera user me
**功能**: 获取当前用户信息
```bash
zcam camera user me
```

#### camera user list
**功能**: 获取所有用户列表
```bash
zcam camera user list --json
```

#### camera user add <username> <password> <permission>
**功能**: 添加新用户
```bash
zcam camera user add admin password123 admin
zcam camera user add operator pass456 operator
```

**权限级别**:
- `admin`: 管理员权限
- `operator`: 操作员权限
- `viewer`: 查看者权限

#### camera user delete <username>
**功能**: 删除用户
```bash
zcam camera user delete operator
```

#### camera user password <username> <oldPassword> <newPassword>
**功能**: 修改用户密码
```bash
zcam camera user password admin oldpass newpass
```

#### camera user logout
**功能**: 登出当前用户
```bash
zcam camera user logout
```

## API 接口

### 信息查询接口
```javascript
// 获取相机信息
async getInfo(api) {
  return await api.get('/info');
}

// 获取工作模式
async getMode(api) {
  return await api.get('/ctrl/mode');
}

// 获取运行状态
async getStatus(api) {
  return await api.get('/camera_status');
}
```

### 昵称管理接口
```javascript
// 获取昵称
async getNickname(api) {
  return await api.get('/ctrl/nick_name');
}

// 设置昵称
async setNickname(api, name) {
  if (!name || typeof name !== 'string') {
    throw new Error('昵称不能为空且必须是字符串');
  }
  if (name.length > 50) {
    throw new Error('昵称长度不能超过50个字符');
  }
  return await api.get(`/ctrl/nick_name?action=set&name=${encodeURIComponent(name)}`);
}
```

### 用户管理接口
```javascript
// 获取当前用户
async getCurrentUser(api) {
  return await api.get('/ctrl/user?action=me');
}

// 获取用户列表
async getUserList(api) {
  return await api.get('/ctrl/user?action=list');
}

// 添加用户
async addUser(api, username, password, permission) {
  const params = new URLSearchParams({
    action: 'add',
    username: username,
    password: password,
    permission: permission
  });
  return await api.get(`/ctrl/user?${params.toString()}`);
}
```

### 时间管理接口
```javascript
// 获取时间
async getTime(api) {
  return await api.get('/ctrl/time');
}

// 设置时间
async setTime(api, date, time) {
  const params = new URLSearchParams({
    action: 'set',
    date: date,
    time: time
  });
  return await api.get(`/ctrl/time?${params.toString()}`);
}

// 设置时区
async setTimezone(api, timezone) {
  return await api.get(`/ctrl/time?action=set_timezone&timezone=${encodeURIComponent(timezone)}`);
}
```

## 使用示例

### 基础信息查询
```javascript
const { createExactAPI } = require('../../core/exact-api');
const CameraService = require('./service');

const api = createExactAPI({
  host: '192.168.1.100',
  port: 80,
  timeout: 30000
});

const cameraService = new CameraService();

// 获取相机信息
const info = await cameraService.getInfo(api);
console.log('相机型号:', info.model);
console.log('序列号:', info.serial_number);

// 获取运行状态
const status = await cameraService.getStatus(api);
console.log('录制状态:', status.recording);
console.log('存储状态:', status.storage_status);
```

### 昵称管理
```javascript
// 获取当前昵称
const currentNickname = await cameraService.getNickname(api);
console.log('当前昵称:', currentNickname.nick_name);

// 设置新昵称
await cameraService.setNickname(api, 'Studio Camera A');
console.log('昵称设置成功');

// 提交设置
await cameraService.commit(api);
console.log('设置已保存');
```

### 用户管理
```javascript
// 获取用户列表
const users = await cameraService.getUserList(api);
console.log('用户列表:');
users.users.forEach(user => {
  console.log(`- ${user.username} (${user.permission})`);
});

// 添加新用户
await cameraService.addUser(api, 'operator', 'password123', 'operator');
console.log('用户添加成功');

// 修改密码
await cameraService.changePassword(api, 'operator', 'password123', 'newpass456');
console.log('密码修改成功');
```

### 时间同步
```javascript
// 获取当前时间
const timeInfo = await cameraService.getTime(api);
console.log('相机时间:', timeInfo.current_time);

// 设置为当前时间
const now = new Date();
const dateStr = now.toISOString().split('T')[0];
const timeStr = now.toTimeString().split(' ')[0];

await cameraService.setTime(api, dateStr, timeStr);
console.log('时间同步成功');

// 设置时区
await cameraService.setTimezone(api, 'Asia/Shanghai');
console.log('时区设置成功');
```

## 错误处理

### 常见错误类型
- `ValidationError`: 参数验证错误（昵称长度、用户名格式等）
- `APIError`: API 调用错误（权限不足、相机状态等）
- `ConnectionError`: 网络连接错误

### 错误处理示例
```javascript
try {
  await cameraService.setNickname(api, 'A'.repeat(100)); // 昵称太长
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('参数错误:', error.message);
  }
}

try {
  await cameraService.addUser(api, 'admin', 'pass', 'invalid_permission');
} catch (error) {
  if (error instanceof APIError && error.status === 403) {
    console.error('权限不足，无法添加用户');
  }
}
```

## 最佳实践

1. **参数验证**: 在设置参数前进行严格验证
2. **权限检查**: 确保当前用户有足够权限执行操作
3. **状态检查**: 在操作前检查相机状态（如录制时不能切换模式）
4. **错误处理**: 针对不同错误类型提供相应的处理逻辑
5. **设置提交**: 重要设置修改后及时提交到持久存储

## 注意事项

1. **昵称限制**: 昵称长度不能超过 50 个字符
2. **用户权限**: 只有管理员可以添加/删除用户
3. **时间格式**: 时间设置必须使用 24 小时制
4. **时区支持**: 时区设置需要相机固件支持
5. **网络延迟**: 时间同步可能受到网络延迟影响