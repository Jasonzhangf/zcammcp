/**
 * 系统服务层 - 封装系统管理的API调用
 * 对应官方API: Api.system, Api.security, Api.upgrade, Api.files
 */

class SystemService {
  // ===== 电源管理 =====

  /**
   * 重启相机
   * API: /ctrl/reboot
   */
  static async reboot(api) {
    return await api.get('/ctrl/reboot', { timeout: 1000 });
  }

  /**
   * 关闭相机
   * API: /ctrl/shutdown
   */
  static async shutdown(api) {
    return await api.get('/ctrl/shutdown', { timeout: 1000 });
  }

  /**
   * 进入待机模式
   * API: /ctrl/mode?action=to_standby
   */
  static async standby(api) {
    return await api.get('/ctrl/mode?action=to_standby');
  }

  /**
   * 从待机唤醒
   * API: /ctrl/mode?action=exit_standby
   */
  static async wakeup(api) {
    return await api.get('/ctrl/mode?action=exit_standby');
  }

  /**
   * 获取自动关机设置
   * API: /ctrl/get?k=auto_off
   */
  static async getAutoOff(api) {
    return await api.get('/ctrl/get?k=auto_off');
  }

  /**
   * 设置自动关机时间
   * API: /ctrl/set?auto_off={time}
   */
  static async setAutoOff(api, time) {
    const timeValue = parseInt(time);
    if (isNaN(timeValue) || timeValue < 0 || timeValue > 1440) {
      throw new Error('自动关机时间必须是0-1440分钟之间的整数');
    }
    return await api.get(`/ctrl/set?auto_off=${timeValue}`);
  }

  /**
   * 获取自动待机设置
   * API: /ctrl/get?k=auto_standby
   */
  static async getAutoStandby(api) {
    return await api.get('/ctrl/get?k=auto_standby');
  }

  /**
   * 设置自动待机时间
   * API: /ctrl/set?auto_standby={time}
   */
  static async setAutoStandby(api, time) {
    const timeValue = parseInt(time);
    if (isNaN(timeValue) || timeValue < 0 || timeValue > 1440) {
      throw new Error('自动待机时间必须是0-1440分钟之间的整数');
    }
    return await api.get(`/ctrl/set?auto_standby=${timeValue}`);
  }

  // ===== 系统状态 =====

  /**
   * 获取系统温度
   * API: /ctrl/temperature
   */
  static async getTemperature(api) {
    return await api.get('/ctrl/temperature');
  }

  /**
   * 获取Tally指示灯亮度
   * API: /ctrl/get?k=tally_on
   */
  static async getTallyBrightness(api) {
    return await api.get('/ctrl/get?k=tally_on');
  }

  /**
   * 设置Tally指示灯亮度
   * API: /ctrl/set?tally_on={brightness}
   */
  static async setTallyBrightness(api, brightness) {
    const brightnessValue = parseInt(brightness);
    if (isNaN(brightnessValue) || brightnessValue < 0 || brightnessValue > 100) {
      throw new Error('Tally亮度必须是0-100之间的整数');
    }
    return await api.get(`/ctrl/set?tally_on=${brightnessValue}`);
  }

  /**
   * 获取彩条设置
   * API: /ctrl/get?k=color_bar_enable
   */
  static async getColorBar(api) {
    return await api.get('/ctrl/get?k=color_bar_enable');
  }

  /**
   * 设置彩条
   * API: /ctrl/set?color_bar_enable={enable}
   */
  static async setColorBar(api, enable) {
    const value = enable === true || enable === '1' || enable === 'on' ? '1' : '0';
    return await api.get(`/ctrl/set?color_bar_enable=${value}`);
  }

  /**
   * 获取LED设置
   * API: /ctrl/get?k=led
   */
  static async getLed(api) {
    return await api.get('/ctrl/get?k=led');
  }

  /**
   * 设置LED
   * API: /ctrl/set?led={enable}
   */
  static async setLed(api, enable) {
    const value = enable === true || enable === '1' || enable === 'on' ? '1' : '0';
    return await api.get(`/ctrl/set?led=${value}`);
  }

  /**
   * 获取去挤压设置
   * API: /ctrl/get?k=desqueeze
   */
  static async getDesqueeze(api) {
    return await api.get('/ctrl/get?k=desqueeze');
  }

  /**
   * 设置去挤压
   * API: /ctrl/set?desqueeze={enable}
   */
  static async setDesqueeze(api, enable) {
    const value = enable === true || enable === '1' || enable === 'on' ? '1' : '0';
    return await api.get(`/ctrl/set?desqueeze=${value}`);
  }

  // ===== 存储卡管理 =====

  /**
   * 检查存储卡是否存在
   * API: /ctrl/card?action=present
   */
  static async isCardPresent(api) {
    return await api.get('/ctrl/card?action=present');
  }

  /**
   * 查询存储卡格式化信息
   * API: /ctrl/card?action=query_format
   */
  static async queryCardFormat(api) {
    return await api.get('/ctrl/card?action=query_format');
  }

  /**
   * 格式化存储卡
   * API: /ctrl/card?action=format
   */
  static async formatCard(api) {
    return await api.get('/ctrl/card?action=format');
  }

  // ===== 文件管理 =====

  /**
   * 列出文件夹
   * API: /DCIM/
   */
  static async listFolders(api) {
    return await api.get('/DCIM/');
  }

  /**
   * 列出文件夹内容
   * API: /DCIM/{folder}/
   */
  static async listFiles(api, folder = '') {
    if (folder) {
      return await api.get(`/DCIM/${folder}/`);
    } else {
      return await api.get('/DCIM/');
    }
  }

  /**
   * 删除文件
   * API: /DCIM/{filename}?act=rm
   */
  static async deleteFile(api, filepath) {
    if (!filepath || typeof filepath !== 'string') {
      throw new Error('文件路径不能为空');
    }

    // 移除开头的斜杠（如果有的话）
    const cleanPath = filepath.startsWith('/') ? filepath.substring(1) : filepath;

    // 验证文件路径格式
    if (!cleanPath.startsWith('DCIM/')) {
      throw new Error('文件路径必须以DCIM/开头');
    }

    return await api.get(`/DCIM/${cleanPath}?act=rm`);
  }

  /**
   * 批量删除文件
   */
  static async deleteFiles(api, filepaths) {
    const results = [];

    for (const filepath of filepaths) {
      try {
        const result = await this.deleteFile(api, filepath);
        results.push({ filepath, success: true, result });
      } catch (error) {
        results.push({ filepath, success: false, error: error.message });
      }
    }

    return results;
  }

  // ===== 安全设置 =====

  /**
   * 获取HTTPS设置
   * API: /ctrl/get?k=https_on
   */
  static async getHttps(api) {
    return await api.get('/ctrl/get?k=https_on');
  }

  /**
   * 设置HTTPS
   * API: /ctrl/set?https_on={enable}
   */
  static async setHttps(api, enable) {
    const value = enable === true || enable === '1' || enable === 'on' ? '1' : '0';
    return await api.get(`/ctrl/set?https_on=${value}`);
  }

  /**
   * 获取认证设置
   * API: /ctrl/get?k=https_auth
   */
  static async getAuth(api) {
    return await api.get('/ctrl/get?k=https_auth');
  }

  /**
   * 设置认证
   * API: /ctrl/set?https_auth={enable}
   */
  static async setAuth(api, enable) {
    const value = enable === true || enable === '1' || enable === 'on' ? '1' : '0';
    return await api.get(`/ctrl/set?https_auth=${value}`);
  }

  // ===== 证书管理 =====

  /**
   * 获取证书来源
   * API: /ctrl/get?k=https_cert_source
   */
  static async getCertificateSource(api) {
    return await api.get('/ctrl/get?k=https_cert_source');
  }

  /**
   * 设置证书来源
   * API: /ctrl/set?https_cert_source={source}
   */
  static async setCertificateSource(api, source) {
    const validSources = ['generate', 'import'];
    if (!validSources.includes(source.toLowerCase())) {
      throw new Error(`证书来源无效，支持: ${validSources.join(', ')}`);
    }
    return await api.get(`/ctrl/set?https_cert_source=${source.toLowerCase()}`);
  }

  /**
   * 生成证书
   * API: /cert/gen
   */
  static async generateCertificate(api) {
    return await api.get('/cert/gen');
  }

  /**
   * 获取证书信息
   * API: /cert/info
   */
  static async getCertificateInfo(api) {
    return await api.get('/cert/info');
  }

  /**
   * 删除证书
   * API: /cert/delete
   */
  static async deleteCertificate(api) {
    return await api.get('/cert/delete');
  }

  // ===== 固件升级 =====

  /**
   * 检查固件升级
   * API: /ctrl/upgrade?action=fw_check
   */
  static async checkUpgrade(api) {
    return await api.get('/ctrl/upgrade?action=fw_check', { timeout: 20000 });
  }

  /**
   * 执行固件升级
   * API: /ctrl/upgrade?action=run
   */
  static async runUpgrade(api) {
    return await api.get('/ctrl/upgrade?action=run');
  }

  /**
   * 检查UI升级
   * API: /ctrl/upgrade?action=ui_check
   */
  static async checkUiUpgrade(api) {
    return await api.get('/ctrl/upgrade?action=ui_check');
  }

  // ===== 系统设置 =====

  /**
   * 清除所有设置
   * API: /ctrl/set?action=clear
   */
  static async clearSettings(api) {
    return await api.get('/ctrl/set?action=clear');
  }

  // ===== 时间管理 =====

  /**
   * 获取系统时间
   * API: /datetime/get
   */
  static async getSystemTime(api) {
    return await api.get('/datetime/get');
  }

  /**
   * 设置系统时间
   * API: /datetime?date={date}&time={time}
   */
  static async setSystemTime(api, date, time) {
    // 验证日期格式 YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      throw new Error('日期格式错误，应为 YYYY-MM-DD');
    }

    // 验证时间格式 HH:MM:SS
    const timeRegex = /^\d{2}:\d{2}:\d{2}$/;
    if (!timeRegex.test(time)) {
      throw new Error('时间格式错误，应为 HH:MM:SS');
    }

    return await api.get(`/datetime?date=${date}&time=${time}`);
  }

  /**
   * 设置时区
   * API: /datetime?timezone={timezone}
   */
  static async setSystemTimezone(api, timezone) {
    if (!timezone || typeof timezone !== 'string') {
      throw new Error('时区不能为空');
    }
    return await api.get(`/datetime?timezone=${encodeURIComponent(timezone)}`);
  }

  // ===== SNMP设置 =====

  /**
   * 启用/禁用SNMP
   * API: /ctrl/snmp?enable={value}
   */
  static async setSnmpEnable(api, enable) {
    const value = enable === true || enable === '1' || enable === 'on' ? '1' : '0';
    return await api.get(`/ctrl/snmp?enable=${value}`);
  }

  /**
   * 设置SNMP认证和加密
   * API: /ctrl/snmp?user={user}&auth={auth}&enc={enc}&pass={password}
   */
  static async setSnmpAuthEnc(api, user, auth, enc, password) {
    if (!user || !auth || !enc || !password) {
      throw new Error('SNMP参数不能为空');
    }

    const validAuth = ['none', 'md5', 'sha'];
    const validEnc = ['none', 'des', 'aes'];

    if (!validAuth.includes(auth.toLowerCase())) {
      throw new Error(`认证协议无效，支持: ${validAuth.join(', ')}`);
    }

    if (!validEnc.includes(enc.toLowerCase())) {
      throw new Error(`加密协议无效，支持: ${validEnc.join(', ')}`);
    }

    return await api.get(`/ctrl/snmp?user=${encodeURIComponent(user)}&auth=${auth}&enc=${enc}&pass=${encodeURIComponent(password)}`);
  }

  /**
   * 设置SNMP系统名称
   * API: /ctrl/snmp?system={name}
   */
  static async setSnmpSystemName(api, name) {
    if (!name || typeof name !== 'string') {
      throw new Error('系统名称不能为空');
    }
    if (name.length > 255) {
      throw new Error('系统名称长度不能超过255个字符');
    }

    return await api.get(`/ctrl/snmp?system=${encodeURIComponent(name)}`);
  }

  /**
   * 设置SNMP位置
   * API: /ctrl/snmp?location={location}
   */
  static async setSnmpLocation(api, location) {
    if (!location || typeof location !== 'string') {
      throw new Error('位置不能为空');
    }
    if (location.length > 255) {
      throw new Error('位置长度不能超过255个字符');
    }

    return await api.get(`/ctrl/snmp?location=${encodeURIComponent(location)}`);
  }

  /**
   * 设置SNMP联系方式
   * API: /ctrl/snmp?contact={contact}
   */
  static async setSnmpContact(api, contact) {
    if (!contact || typeof contact !== 'string') {
      throw new Error('联系方式不能为空');
    }
    if (contact.length > 255) {
      throw new Error('联系方式长度不能超过255个字符');
    }

    return await api.get(`/ctrl/snmp?contact=${encodeURIComponent(contact)}`);
  }

  /**
   * 查询SNMP设置
   * API: /ctrl/snmp
   */
  static async querySnmp(api) {
    return await api.get('/ctrl/snmp');
  }

  // ===== SNTP设置 =====

  /**
   * 启动SNTP
   * API: /ctrl/sntp?action=start&ip_addr={addr}&port={port}&interval={interval}
   */
  static async startSntp(api, addr, port = '123', interval = '3600') {
    if (!addr || typeof addr !== 'string') {
      throw new Error('SNTP服务器地址不能为空');
    }

    const portNum = parseInt(port);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      throw new Error('SNTP端口必须是1-65535之间的数字');
    }

    const intervalNum = parseInt(interval);
    if (isNaN(intervalNum) || intervalNum < 60 || intervalNum > 86400) {
      throw new Error('SNTP间隔必须是60-86400秒之间的数字');
    }

    return await api.get(`/ctrl/sntp?action=start&ip_addr=${encodeURIComponent(addr)}&port=${portNum}&interval=${intervalNum}`);
  }

  /**
   * 停止SNTP
   * API: /ctrl/sntp?action=stop
   */
  static async stopSntp(api) {
    return await api.get('/ctrl/sntp?action=stop');
  }

  /**
   * 获取SNTP状态
   * API: /ctrl/sntp?action=get
   */
  static async getSntpStatus(api) {
    return await api.get('/ctrl/sntp?action=get');
  }

  /**
   * 设置SNTP间隔
   * API: /ctrl/sntp?action=set_interval&interval={interval}
   */
  static async setSntpInterval(api, interval) {
    const intervalNum = parseInt(interval);
    if (isNaN(intervalNum) || intervalNum < 60 || intervalNum > 86400) {
      throw new Error('SNTP间隔必须是60-86400秒之间的数字');
    }

    return await api.get(`/ctrl/sntp?action=set_interval&interval=${intervalNum}`);
  }

  // ===== 辅助方法 =====

  /**
   * 获取所有系统状态
   */
  static async getAllSystemStatus(api) {
    const status = {};

    try {
      status.temperature = await this.getTemperature(api);
    } catch (error) {
      status.temperature = { error: error.message };
    }

    try {
      status.led = await this.getLed(api);
    } catch (error) {
      status.led = { error: error.message };
    }

    try {
      status.colorBar = await this.getColorBar(api);
    } catch (error) {
      status.colorBar = { error: error.message };
    }

    try {
      status.cardPresent = await this.isCardPresent(api);
    } catch (error) {
      status.cardPresent = { error: error.message };
    }

    try {
      status.https = await this.getHttps(api);
    } catch (error) {
      status.https = { error: error.message };
    }

    return status;
  }

  /**
   * 批量删除文件（支持通配符）
   */
  static async deleteFilesWithPattern(api, pattern) {
    // 先列出文件夹内容
    const files = await this.listFiles(api);
    const results = [];

    // 简单的通配符匹配
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));

    if (files.folders) {
      for (const folder of files.folders) {
        try {
          const folderFiles = await this.listFiles(api, folder.name);
          if (folderFiles.files) {
            for (const file of folderFiles.files) {
              const filepath = `${folder.name}/${file.name}`;
              if (regex.test(file.name)) {
                try {
                  const result = await this.deleteFile(api, filepath);
                  results.push({ filepath, success: true, result });
                } catch (error) {
                  results.push({ filepath, success: false, error: error.message });
                }
              }
            }
          }
        } catch (error) {
          results.push({ folder: folder.name, success: false, error: error.message });
        }
      }
    }

    return results;
  }

  /**
   * 验证文件路径
   */
  static validateFilePath(filepath) {
    if (!filepath || typeof filepath !== 'string') {
      throw new Error('文件路径不能为空');
    }

    const cleanPath = filepath.startsWith('/') ? filepath.substring(1) : filepath;

    if (!cleanPath.startsWith('DCIM/')) {
      throw new Error('文件路径必须以DCIM/开头');
    }

    // 检查路径中是否包含非法字符
    const invalidChars = /[<>:"|?*]/;
    if (invalidChars.test(cleanPath)) {
      throw new Error('文件路径包含非法字符');
    }

    return cleanPath;
  }

  /**
   * 验证时间值
   */
  static validateTimeValue(value, unit = 'minutes') {
    const timeValue = parseInt(value);
    if (isNaN(timeValue)) {
      throw new Error('时间值必须是数字');
    }

    switch (unit) {
      case 'minutes':
        if (timeValue < 0 || timeValue > 1440) {
          throw new Error('时间值必须是0-1440分钟之间的整数');
        }
        break;
      case 'seconds':
        if (timeValue < 0 || timeValue > 86400) {
          throw new Error('时间值必须是0-86400秒之间的整数');
        }
        break;
      default:
        throw new Error('未知的时间单位');
    }

    return timeValue;
  }

  /**
   * 验证亮度值
   */
  static validateBrightnessValue(value) {
    const brightnessValue = parseInt(value);
    if (isNaN(brightnessValue) || brightnessValue < 0 || brightnessValue > 100) {
      throw new Error('亮度值必须是0-100之间的整数');
    }
    return brightnessValue;
  }

  /**
   * 格式化文件大小
   */
  static formatFileSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  /**
   * 检查系统健康状态
   */
  static async checkSystemHealth(api) {
    const health = {
      status: 'unknown',
      temperature: null,
      storage: null,
      errors: []
    };

    try {
      // 检查温度
      const tempResult = await this.getTemperature(api);
      health.temperature = tempResult.temperature;

      // 假设超过70度为警告
      if (tempResult.temperature > 70) {
        health.errors.push(`温度过高: ${tempResult.temperature}°C`);
      }

      // 检查存储卡
      const cardResult = await this.isCardPresent(api);
      health.storage = cardResult.present ? 'card_present' : 'no_card';

      if (!cardResult.present) {
        health.errors.push('未检测到存储卡');
      }

      // 确定整体状态
      if (health.errors.length === 0) {
        health.status = 'healthy';
      } else if (health.errors.length <= 2) {
        health.status = 'warning';
      } else {
        health.status = 'error';
      }
    } catch (error) {
      health.status = 'error';
      health.errors.push(`健康检查失败: ${error.message}`);
    }

    return health;
  }
}

module.exports = SystemService;