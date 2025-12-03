# Network 模块

网络模块提供相机的网络配置和管理功能，包括 IP 设置、WiFi 配置、网络诊断、协议设置等。

## 架构设计

```
modules/network/
├── index.js      # 命令行接口定义
└── service.js    # 业务逻辑实现
```

## 文件说明

### index.js - 命令行接口
**作用**: 定义网络模块的所有命令行接口和参数。

**命令结构**:
```
network
├── status                 # 获取网络状态
├── config                 # 网络配置子命令
│   ├── ip <ip>           # 设置 IP 地址
│   ├── netmask <mask>    # 设置子网掩码
│   ├── gateway <gw>      # 设置网关
│   ├── dns <server>      # 设置 DNS 服务器
│   ├── dhcp <on/off>     # 启用/禁用 DHCP
│   └── hostname <name>   # 设置主机名
├── wifi                   # WiFi 配置子命令
│   ├── scan              # 扫描 WiFi 网络
│   ├── connect <ssid>    # 连接 WiFi 网络
│   ├── disconnect        # 断开 WiFi 连接
│   ├── status            # 获取 WiFi 状态
│   └── security <type>   # 设置安全类型
├── protocol               # 协议设置子命令
│   ├── http <port>       # 设置 HTTP 端口
│   ├── https <port>      # 设置 HTTPS 端口
│   ├── rtmp <port>       # 设置 RTMP 端口
│   ├── srt <port>        # 设置 SRT 端口
│   ├── ndi <enable>      # 启用/禁用 NDI
│   └── rtsp <port>       # 设置 RTSP 端口
├── firewall               # 防火墙设置子命令
│   ├── status            # 获取防火墙状态
│   ├── enable            # 启用防火墙
│   ├── disable           # 禁用防火墙
│   ├── rule <action>     # 添加防火墙规则
│   └── list              # 列出防火墙规则
├── diagnose               # 网络诊断子命令
│   ├── ping <host>       # Ping 测试
│   ├── traceroute <host> # 路由跟踪
│   ├── speed             # 网络速度测试
│   ├── bandwidth         # 带宽测试
│   └── latency           # 延迟测试
└── advanced               # 高级网络设置子命令
    ├── mtu <size>        # 设置 MTU 大小
    ├── qos <enable>      # 启用/禁用 QoS
    ├── vlan <id>         # 设置 VLAN ID
    └── mac <address>     # 设置 MAC 地址
```

### service.js - 业务逻辑
**作用**: 实现网络配置相关的 API 调用和业务逻辑。

**主要功能**:
- 网络接口配置管理
- WiFi 连接和扫描
- 网络协议设置
- 防火墙规则管理
- 网络诊断和测试
- 高级网络设置

## 命令详解

### 网络状态

#### network status
**功能**: 获取网络状态信息
```bash
zcam network status
zcam network status --json
```

**返回数据**:
```json
{
  "interfaces": [
    {
      "name": "eth0",
      "type": "ethernet",
      "status": "up",
      "ip_address": "192.168.1.100",
      "netmask": "255.255.255.0",
      "gateway": "192.168.1.1",
      "dns": ["8.8.8.8", "8.8.4.4"],
      "mac_address": "00:11:22:33:44:55",
      "speed": 1000,
      "duplex": "full"
    }
  ],
  "wifi": {
    "enabled": true,
    "connected": true,
    "ssid": "CameraNetwork",
    "signal_strength": -45,
    "security": "WPA2-PSK"
  },
  "protocols": {
    "http": { "enabled": true, "port": 80 },
    "https": { "enabled": true, "port": 443 },
    "rtmp": { "enabled": true, "port": 1935 },
    "rtsp": { "enabled": true, "port": 554 }
  }
}
```

### 网络配置

#### network config ip <ip>
**功能**: 设置 IP 地址
```bash
# 设置静态 IP
zcam network config ip 192.168.1.100

# 启用 DHCP
zcam network config dhcp on
```

#### network config dns <server>
**功能**: 设置 DNS 服务器
```bash
zcam network config dns 8.8.8.8
zcam network config dns 8.8.8.8,8.8.4.4  # 多个 DNS
```

### WiFi 配置

#### network wifi scan
**功能**: 扫描 WiFi 网络
```bash
zcam network wifi scan
```

**返回数据**:
```json
{
  "networks": [
    {
      "ssid": "CameraNetwork",
      "bssid": "00:11:22:33:44:55",
      "signal_strength": -45,
      "security": "WPA2-PSK",
      "channel": 6,
      "frequency": 2437
    }
  ]
}
```

#### network wifi connect <ssid>
**功能**: 连接 WiFi 网络
```bash
zcam network wifi connect "MyNetwork" --password "password123"
zcam network wifi connect "MyNetwork" --security WPA2-PSK --password "password123"
```

### 网络诊断

#### network diagnose ping <host>
**功能**: Ping 测试
```bash
zcam network diagnose ping 8.8.8.8
zcam network diagnose ping 8.8.8.8 --count 5 --interval 1
```

#### network diagnose speed
**功能**: 网络速度测试
```bash
zcam network diagnose speed
zcam network diagnose speed --server speedtest.net --duration 30
```

### 使用示例

```javascript
const { createExactAPI } = require('../../core/exact-api');
const NetworkService = require('./service');

const api = createExactAPI({
  host: '192.168.1.100',
  port: 80,
  timeout: 30000
});

const networkService = new NetworkService();

// 获取网络状态
const networkStatus = await networkService.getNetworkStatus(api);
console.log('网络接口状态:');
networkStatus.interfaces.forEach(iface => {
  console.log(`${iface.name}: ${iface.ip_address} (${iface.status})`);
});

// 配置静态 IP
await networkService.setIPAddress(api, '192.168.1.100');
await networkService.setNetmask(api, '255.255.255.0');
await networkService.setGateway(api, '192.168.1.1');
await networkService.setDNS(api, ['8.8.8.8', '8.8.4.4']);
console.log('静态 IP 配置完成');

// WiFi 连接
const wifiNetworks = await networkService.scanWiFiNetworks(api);
console.log('可用的 WiFi 网络:');
wifiNetworks.forEach(network => {
  console.log(`${network.ssid}: ${network.signal_strength} dBm (${network.security})`);
});

// 连接到指定 WiFi 网络
await networkService.connectWiFi(api, 'CameraNetwork', {
  password: 'password123',
  security: 'WPA2-PSK'
});
console.log('WiFi 连接完成');

// 网络诊断
const pingResult = await networkService.pingTest(api, '8.8.8.8');
console.log(`Ping 测试: ${pingResult.reachable ? '可达' : '不可达'}`);
console.log(`平均延迟: ${pingResult.average_latency} ms`);

const speedTest = await networkService.speedTest(api);
console.log(`下载速度: ${speedTest.download_speed} Mbps`);
console.log(`上传速度: ${speedTest.upload_speed} Mbps`);
```

## 最佳实践

1. **网络规划**: 根据使用场景规划网络配置
2. **安全设置**: 使用强密码和适当的安全协议
3. **性能优化**: 根据网络条件调整 MTU 和 QoS 设置
4. **定期诊断**: 定期进行网络诊断确保连接稳定
5. **备份配置**: 保存网络配置备份便于快速恢复

## 注意事项

1. **网络中断**: 修改网络配置可能导致短暂的网络中断
2. **IP 冲突**: 确保设置的 IP 地址在网段内唯一
3. **WiFi 范围**: 确保 WiFi 信号强度足够稳定
4. **防火墙规则**: 错误的防火墙规则可能影响功能
5. **协议兼容**: 确保网络协议与接收端兼容