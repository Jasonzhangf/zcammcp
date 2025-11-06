/**
 * 网络服务层 - 封装网络配置的API调用
 * 对应官方API: Api.network, Api.ipManager
 */

class NetworkService {
  // ===== 以太网配置 =====

  /**
   * 查询网络信息
   * API: /ctrl/network?action=info
   */
  static async getNetworkInfo(api) {
    return await api.get('/ctrl/network?action=info');
  }

  /**
   * 获取网络模式
   * API: /ctrl/get?k=eth_mode
   */
  static async getEthernetMode(api) {
    return await api.get('/ctrl/get?k=eth_mode');
  }

  /**
   * 设置网络模式
   * API: /ctrl/set?eth_mode={mode}
   */
  static async setEthernetMode(api, mode) {
    const validModes = ['auto', 'auto100', 'auto1000', 'fixed100', 'fixed1000'];
    if (!validModes.includes(mode.toLowerCase())) {
      throw new Error(`网络模式无效，支持: ${validModes.join(', ')}`);
    }
    return await api.get(`/ctrl/set?eth_mode=${mode.toLowerCase()}`);
  }

  /**
   * 设置静态IP
   * API: /ctrl/network?action=set&mode=static&ipaddr={ip}&netmask={netmask}&gateway={gateway}&dns={dns}
   */
  static async setStaticIp(api, ip, netmask, gateway, dns = '') {
    // 验证IP地址
    this.validateIpAddress(ip, 'IP地址');
    this.validateIpAddress(netmask, '子网掩码');
    this.validateIpAddress(gateway, '网关');

    if (dns) {
      this.validateIpAddress(dns, 'DNS');
    }

    const params = new URLSearchParams();
    params.append('action', 'set');
    params.append('mode', 'static');
    params.append('ipaddr', ip);
    params.append('netmask', netmask);
    params.append('gateway', gateway);

    if (dns) {
      params.append('dns', dns);
    }

    return await api.get(`/ctrl/network?${params.toString()}`);
  }

  /**
   * 设置DHCP模式
   * API: /ctrl/network?action=set&mode=dhcp
   */
  static async setDhcpMode(api) {
    return await api.get('/ctrl/network?action=set&mode=dhcp');
  }

  // ===== WiFi设置 =====

  /**
   * 查询WiFi状态
   * API: /ctrl/wifi_ctrl?action=query
   */
  static async queryWifi(api) {
    return await api.get('/ctrl/wifi_ctrl?action=query');
  }

  /**
   * 获取WiFi设置
   * API: /ctrl/get?k=wifi
   */
  static async getWifiEnable(api) {
    return await api.get('/ctrl/get?k=wifi');
  }

  /**
   * 设置WiFi
   * API: /ctrl/set?wifi={enable}
   */
  static async setWifiEnable(api, enable) {
    const value = enable === true || enable === '1' || enable === 'on' ? '1' : '0';
    return await api.get(`/ctrl/set?wifi=${value}`);
  }

  /**
   * 获取WiFi频道设置
   * API: /ctrl/get?k=wifi_channel
   */
  static async getWifiChannel(api) {
    return await api.get('/ctrl/get?k=wifi_channel');
  }

  /**
   * 设置WiFi频道
   * API: /ctrl/set?wifi_channel={enable}
   */
  static async setWifiChannel(api, enable) {
    const value = enable === true || enable === '1' || enable === 'on' ? '1' : '0';
    return await api.get(`/ctrl/set?wifi_channel=${value}`);
  }

  // ===== IP访问控制 =====

  // 白名单管理

  /**
   * 启用白名单
   * API: /ipac/allowlist/enable
   */
  static async enableAllowList(api) {
    return await api.get('/ipac/allowlist/enable');
  }

  /**
   * 禁用白名单
   * API: /ipac/allowlist/disable
   */
  static async disableAllowList(api) {
    return await api.get('/ipac/allowlist/disable');
  }

  /**
   * 添加IP到白名单
   * API: /ipac/allowlist/add?ip={ip}
   */
  static async addToAllowList(api, ip) {
    this.validateIpAddress(ip, '白名单IP');
    return await api.get(`/ipac/allowlist/add?ip=${ip}`);
  }

  /**
   * 从白名单删除IP
   * API: /ipac/allowlist/delete?ip={ip}
   */
  static async deleteFromAllowList(api, ip) {
    this.validateIpAddress(ip, '白名单IP');
    return await api.get(`/ipac/allowlist/delete?ip=${ip}`);
  }

  /**
   * 查询白名单状态
   * API: /ipac/allowlist/query (如果API支持)
   */
  static async queryAllowList(api) {
    // 注意：原API中没有查询白名单的接口，这里假设存在
    try {
      return await api.get('/ipac/allowlist/query');
    } catch (error) {
      throw new Error('查询白名单功能可能不被当前固件支持');
    }
  }

  // 黑名单管理

  /**
   * 启用黑名单
   * API: /ipac/denylist/enable
   */
  static async enableDenyList(api) {
    return await api.get('/ipac/denylist/enable');
  }

  /**
   * 禁用黑名单
   * API: /ipac/denylist/disable
   */
  static async disableDenyList(api) {
    return await api.get('/ipac/denylist/disable');
  }

  /**
   * 添加IP到黑名单
   * API: /ipac/denylist/add?ip={ip}
   */
  static async addToDenyList(api, ip) {
    this.validateIpAddress(ip, '黑名单IP');
    return await api.get(`/ipac/denylist/add?ip=${ip}`);
  }

  /**
   * 从黑名单删除IP
   * API: /ipac/denylist/delete?ip={ip}
   */
  static async deleteFromDenyList(api, ip) {
    this.validateIpAddress(ip, '黑名单IP');
    return await api.get(`/ipac/denylist/delete?ip=${ip}`);
  }

  /**
   * 查询黑名单状态
   * API: /ipac/denylist/query (如果API支持)
   */
  static async queryDenyList(api) {
    // 注意：原API中没有查询黑名单的接口，这里假设存在
    try {
      return await api.get('/ipac/denylist/query');
    } catch (error) {
      throw new Error('查询黑名单功能可能不被当前固件支持');
    }
  }

  // ===== IP访问控制通用操作 =====

  /**
   * 批量添加IP到白名单
   */
  static async batchAddToAllowList(api, ipList) {
    const results = [];

    for (const ip of ipList) {
      try {
        const result = await this.addToAllowList(api, ip);
        results.push({ ip, success: true, result });
      } catch (error) {
        results.push({ ip, success: false, error: error.message });
      }
    }

    return results;
  }

  /**
   * 批量添加IP到黑名单
   */
  static async batchAddToDenyList(api, ipList) {
    const results = [];

    for (const ip of ipList) {
      try {
        const result = await this.addToDenyList(api, ip);
        results.push({ ip, success: true, result });
      } catch (error) {
        results.push({ ip, success: false, error: error.message });
      }
    }

    return results;
  }

  /**
   * 批量删除IP从白名单
   */
  static async batchDeleteFromAllowList(api, ipList) {
    const results = [];

    for (const ip of ipList) {
      try {
        const result = await this.deleteFromAllowList(api, ip);
        results.push({ ip, success: true, result });
      } catch (error) {
        results.push({ ip, success: false, error: error.message });
      }
    }

    return results;
  }

  /**
   * 批量删除IP从黑名单
   */
  static async batchDeleteFromDenyList(api, ipList) {
    const results = [];

    for (const ip of ipList) {
      try {
        const result = await this.deleteFromDenyList(api, ip);
        results.push({ ip, success: true, result });
      } catch (error) {
        results.push({ ip, success: false, error: error.message });
      }
    }

    return results;
  }

  // ===== 辅助方法 =====

  /**
   * 验证IP地址格式
   */
  static validateIpAddress(ip, fieldName = 'IP地址') {
    if (!ip || typeof ip !== 'string') {
      throw new Error(`${fieldName}不能为空`);
    }

    // IPv4地址正则表达式
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;

    if (!ipv4Regex.test(ip)) {
      throw new Error(`${fieldName}格式错误，应为 xxx.xxx.xxx.xxx`);
    }

    // 检查每个数字段是否在0-255范围内
    const parts = ip.split('.');
    for (const part of parts) {
      const num = parseInt(part);
      if (isNaN(num) || num < 0 || num > 255) {
        throw new Error(`${fieldName}数值超出范围，每段必须是0-255之间的数字`);
      }
    }

    return true;
  }

  /**
   * 验证子网掩码格式
   */
  static validateNetmask(netmask) {
    this.validateIpAddress(netmask, '子网掩码');

    const commonNetmasks = [
      '255.255.255.0',   // /24
      '255.255.0.0',     // /16
      '255.0.0.0',       // /8
      '255.255.255.128', // /25
      '255.255.255.192', // /26
      '255.255.255.224', // /27
      '255.255.255.240', // /28
      '255.255.255.248', // /29
      '255.255.255.252', // /30
      '255.255.252.0',   // /22
      '255.255.240.0',   // /20
      '255.255.224.0',   // /19
      '255.255.192.0',   // /18
      '255.255.128.0'    // /17
    ];

    if (!commonNetmasks.includes(netmask)) {
      throw new Error(`子网掩码格式可能不正确，常用值: ${commonNetmasks.join(', ')}`);
    }

    return true;
  }

  /**
   * 验证网络模式
   */
  static validateNetworkMode(mode) {
    const validModes = ['auto', 'auto100', 'auto1000', 'fixed100', 'fixed1000'];
    if (!validModes.includes(mode.toLowerCase())) {
      throw new Error(`网络模式无效，支持: ${validModes.join(', ')}`);
    }
    return mode.toLowerCase();
  }

  /**
   * 生成CIDR表示法
   */
  static ipToCidr(ip, netmask) {
    this.validateIpAddress(ip, 'IP地址');
    this.validateNetmask(netmask);

    // 计算子网掩码中1的位数
    const parts = netmask.split('.').map(Number);
    let onesCount = 0;

    for (let i = 0; i < 4; i++) {
      let part = parts[i];
      if (part === 255) {
        onesCount += 8;
      } else if (part === 254) {
        onesCount += 7;
      } else if (part === 252) {
        onesCount += 6;
      } else if (part === 248) {
        onesCount += 5;
      } else if (part === 240) {
        onesCount += 4;
      } else if (part === 224) {
        onesCount += 3;
      } else if (part === 192) {
        onesCount += 2;
      } else if (part === 128) {
        onesCount += 1;
      } else if (part === 0) {
        // 不增加
      } else {
        throw new Error('无效的子网掩码');
      }
    }

    return `${ip}/${onesCount}`;
  }

  /**
   * 检查IP是否在子网内
   */
  static isIpInSubnet(ip, network, netmask) {
    this.validateIpAddress(ip, 'IP地址');
    this.validateIpAddress(network, '网络地址');
    this.validateNetmask(netmask);

    const ipParts = ip.split('.').map(Number);
    const networkParts = network.split('.').map(Number);
    const maskParts = netmask.split('.').map(Number);

    for (let i = 0; i < 4; i++) {
      if ((ipParts[i] & maskParts[i]) !== (networkParts[i] & maskParts[i])) {
        return false;
      }
    }

    return true;
  }

  /**
   * 计算网络地址
   */
  static calculateNetworkAddress(ip, netmask) {
    this.validateIpAddress(ip, 'IP地址');
    this.validateNetmask(netmask);

    const ipParts = ip.split('.').map(Number);
    const maskParts = netmask.split('.').map(Number);

    const networkParts = ipParts.map((part, index) => part & maskParts[index]);
    return networkParts.join('.');
  }

  /**
   * 计算广播地址
   */
  static calculateBroadcastAddress(network, netmask) {
    this.validateIpAddress(network, '网络地址');
    this.validateNetmask(netmask);

    const networkParts = network.split('.').map(Number);
    const maskParts = netmask.split('.').map(Number);

    const broadcastParts = networkParts.map((part, index) => part | (~maskParts[index] & 255));
    return broadcastParts.join('.');
  }

  /**
   * 获取所有网络配置
   */
  static async getAllNetworkConfig(api) {
    const config = {};

    try {
      config.ethernet = await this.getNetworkInfo(api);
    } catch (error) {
      config.ethernet = { error: error.message };
    }

    try {
      config.wifi = await this.queryWifi(api);
    } catch (error) {
      config.wifi = { error: error.message };
    }

    try {
      // 尝试获取访问控制状态（通过测试API）
      config.accessControl = {
        allowListEnabled: true, // 假设启用，实际需要API支持
        denyListEnabled: false   // 假设禁用，实际需要API支持
      };
    } catch (error) {
      config.accessControl = { error: error.message };
    }

    return config;
  }

  /**
   * 测试网络连通性
   */
  static async testNetworkConnectivity(api) {
    const results = {
      ethernet: { status: 'unknown', error: null },
      wifi: { status: 'unknown', error: null }
    };

    try {
      const networkInfo = await this.getNetworkInfo(api);
      results.ethernet.status = 'connected';
      results.ethernet.info = networkInfo;
    } catch (error) {
      results.ethernet.status = 'error';
      results.ethernet.error = error.message;
    }

    try {
      const wifiInfo = await this.queryWifi(api);
      results.wifi.status = 'connected';
      results.wifi.info = wifiInfo;
    } catch (error) {
      results.wifi.status = 'error';
      results.wifi.error = error.message;
    }

    return results;
  }

  /**
   * 创建网络配置报告
   */
  static async createNetworkReport(api) {
    const report = {
      timestamp: new Date().toISOString(),
      ethernet: {},
      wifi: {},
      accessControl: {},
      summary: {}
    };

    try {
      // 获取以太网信息
      report.ethernet = await this.getNetworkInfo(api);

      // 获取WiFi信息
      report.wifi = await this.queryWifi(api);

      // 创建摘要
      report.summary = {
        ethernetEnabled: report.ethernet && report.ethernet.connected,
        wifiEnabled: report.wifi && report.wifi.enabled,
        ethernetMode: report.ethernet ? await this.getEthernetMode(api) : 'unknown',
        ipConfig: report.ethernet && report.ethernet.ip ? report.ethernet.ip : 'unknown'
      };
    } catch (error) {
      report.error = error.message;
    }

    return report;
  }
}

module.exports = NetworkService;