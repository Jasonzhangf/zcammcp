/**
 * 设置管理服务类
 */

const fs = require('fs').promises;
const path = require('path');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const favoritesSchema = require('../schemas/favorites');
const settingsSchema = require('../schemas/settings');

class SettingsManager {
  constructor() {
    this.dataDir = path.join(process.cwd(), 'config');
    this.settingsFile = path.join(this.dataDir, 'settings.json');
    this.profilesDir = path.join(this.dataDir, 'profiles');
    this.settings = null;
    this.ajv = null;
    this.validators = {};
    this.setupAjv();
  }

  /**
   * 设置AJV验证器
   */
  setupAjv() {
    this.ajv = new Ajv({ allErrors: true });
    addFormats(this.ajv);

    // 注册验证器
    this.validators.settings = this.ajv.compile(settingsSchema);
  }

  /**
   * 初始化设置管理器
   */
  async initialize() {
    await this.ensureDataDirectory();
    await this.loadSettings();
  }

  /**
   * 确保数据目录存在
   */
  async ensureDataDirectory() {
    try {
      await fs.access(this.dataDir);
    } catch (error) {
      await fs.mkdir(this.dataDir, { recursive: true });
    }

    try {
      await fs.access(this.profilesDir);
    } catch (error) {
      await fs.mkdir(this.profilesDir, { recursive: true });
    }
  }

  /**
   * 加载设置配置
   */
  async loadSettings(profileName = 'default') {
    try {
      const profileFile = path.join(this.profilesDir, `${profileName}.json`);
      const data = await fs.readFile(profileFile, 'utf8');
      this.settings = JSON.parse(data);

      // 验证数据格式
      if (!this.validateSchema('settings', this.settings)) {
        console.warn('设置配置格式不正确，使用默认配置');
        this.settings = this.getDefaultSettings();
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        this.settings = this.getDefaultSettings();
        await this.saveSettings();
      } else {
        throw new Error(`加载设置配置失败: ${error.message}`);
      }
    }
  }

  /**
   * 获取默认设置配置
   */
  getDefaultSettings() {
    return {
      global: {
        language: "zh-CN",
        theme: "auto",
        output_format: "table",
        auto_save: true,
        auto_save_interval: 300,
        backup_count: 5,
        log_level: "info",
        confirm_dangerous_operations: true,
        show_tips: true,
        timeout: {
          connection: 20000,
          operation: 30000,
          request: 50
        }
      },
      cameras: {},
      presets: {
        auto_save: true,
        default_settings: {
          speed_mode: "speed",
          speed_value: 5,
          freeze: false
        },
        naming_pattern: "auto",
        auto_naming_template: "预设 {index}",
        max_presets_per_camera: 20
      },
      network: {
        proxy: {
          enabled: false,
          host: "",
          port: 8080,
          username: "",
          password: ""
        },
        dns_servers: [],
        retry_policy: {
          max_attempts: 3,
          retry_delay: 5000,
          backoff_multiplier: 2
        }
      },
      security: {
        session_timeout: 3600,
        password_storage: "memory",
        encrypt_credentials: true,
        trusted_hosts: [],
        auto_logout: false,
        auto_logout_interval: 7200
      }
    };
  }

  /**
   * 保存设置配置
   */
  async saveSettings(profileName = 'default') {
    try {
      const profileFile = path.join(this.profilesDir, `${profileName}.json`);

      // 验证数据格式
      if (!this.validateSchema('settings', this.settings)) {
        throw new Error('设置配置格式验证失败');
      }

      await fs.writeFile(profileFile, JSON.stringify(this.settings, null, 2));
    } catch (error) {
      throw new Error(`保存设置配置失败: ${error.message}`);
    }
  }

  /**
   * 验证Schema
   */
  validateSchema(type, data) {
    const validator = this.validators[type];
    if (!validator) {
      console.error(`未找到验证器: ${type}`);
      return false;
    }

    const isValid = validator(data);
    if (!isValid) {
      console.error(`验证失败: ${type}`, validator.errors);
    }
    return isValid;
  }

  /**
   * 获取全局设置
   */
  getGlobalSettings() {
    return this.settings.global;
  }

  /**
   * 更新全局设置
   */
  async updateGlobalSettings(updates) {
    this.settings.global = { ...this.settings.global, ...updates };
    await this.saveSettings();
  }

  /**
   * 获取相机特定设置
   */
  getCameraSettings(cameraId) {
    return this.settings.cameras[cameraId] || {
      auto_connect: false,
      connection_check_interval: 30,
      reconnect_attempts: 3,
      default_stream_settings: {
        bitrate: 5000,
        resolution: "1920x1080",
        fps: 30,
        encoder: "h264"
      },
      default_record_settings: {
        resolution: "1920x1080",
        fps: 30,
        codec: "h264",
        quality: "high"
      },
      default_image_settings: {
        profile: "rec709",
        sharpness: 50,
        contrast: 50,
        saturation: 50
      }
    };
  }

  /**
   * 更新相机设置
   */
  async updateCameraSettings(cameraId, cameraSettings) {
    const existingSettings = this.getCameraSettings(cameraId);
    this.settings.cameras[cameraId] = { ...existingSettings, ...cameraSettings };
    await this.saveSettings();
  }

  /**
   * 删除相机设置
   */
  async removeCameraSettings(cameraId) {
    delete this.settings.cameras[cameraId];
    await this.saveSettings();
  }

  /**
   * 获取预设设置
   */
  getPresetSettings() {
    return this.settings.presets;
  }

  /**
   * 更新预设设置
   */
  async updatePresetSettings(updates) {
    this.settings.presets = { ...this.settings.presets, ...updates };
    await this.saveSettings();
  }

  /**
   * 获取网络设置
   */
  getNetworkSettings() {
    return this.settings.network;
  }

  /**
   * 更新网络设置
   */
  async updateNetworkSettings(updates) {
    this.settings.network = { ...this.settings.network, ...updates };
    await this.saveSettings();
  }

  /**
   * 获取安全设置
   */
  getSecuritySettings() {
    return this.settings.security;
  }

  /**
   * 更新安全设置
   */
  async updateSecuritySettings(updates) {
    this.settings.security = { ...this.settings.security, ...updates };
    await this.saveSettings();
  }

  /**
   * 获取超时设置
   */
  getTimeoutSettings() {
    return this.settings.global.timeout;
  }

  /**
   * 更新超时设置
   */
  async updateTimeoutSettings(updates) {
    this.settings.global.timeout = { ...this.settings.global.timeout, ...updates };
    await this.saveSettings();
  }

  /**
   * 获取代理设置
   */
  getProxySettings() {
    return this.settings.network.proxy;
  }

  /**
   * 更新代理设置
   */
  async updateProxySettings(updates) {
    this.settings.network.proxy = { ...this.settings.network.proxy, ...updates };
    await this.saveSettings();
  }

  /**
   * 获取重试策略
   */
  getRetryPolicy() {
    return this.settings.network.retry_policy;
  }

  /**
   * 更新重试策略
   */
  async updateRetryPolicy(updates) {
    this.settings.network.retry_policy = { ...this.settings.network.retry_policy, ...updates };
    await this.saveSettings();
  }

  /**
   * 创建配置备份
   */
  async createBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(this.dataDir, `settings-backup-${timestamp}.json`);

    await fs.copyFile(
      path.join(this.profilesDir, 'default.json'),
      backupFile
    );

    // 清理旧备份
    await this.cleanupOldBackups();

    return backupFile;
  }

  /**
   * 清理旧备份
   */
  async cleanupOldBackups() {
    try {
      const files = await fs.readdir(this.dataDir);
      const backupFiles = files
        .filter(file => file.startsWith('settings-backup-') && file.endsWith('.json'))
        .map(file => ({
          name: file,
          path: path.join(this.dataDir, file),
          time: fs.stat(path.join(this.dataDir, file)).then(stat => stat.mtime)
        }));

      // 按时间排序
      const sortedBackups = await Promise.all(
        backupFiles.map(async backup => ({
          ...backup,
          time: await backup.time
        }))
      );
      sortedBackups.sort((a, b) => b.time - a.time);

      // 保留最新的5个备份
      const backupCount = this.settings.global.backup_count || 5;
      const backupsToDelete = sortedBackups.slice(backupCount);

      for (const backup of backupsToDelete) {
        await fs.unlink(backup.path);
      }
    } catch (error) {
      console.warn('清理备份失败:', error.message);
    }
  }

  /**
   * 恢复设置备份
   */
  async restoreBackup(backupFile) {
    try {
      const data = await fs.readFile(backupFile, 'utf8');
      const backupSettings = JSON.parse(data);

      // 验证备份数据格式
      if (!this.validateSchema('settings', backupSettings)) {
        throw new Error('备份文件格式不正确');
      }

      this.settings = backupSettings;
      await this.saveSettings();

      return true;
    } catch (error) {
      throw new Error(`恢复备份失败: ${error.message}`);
    }
  }

  /**
   * 列出所有备份
   */
  async listBackups() {
    try {
      const files = await fs.readdir(this.dataDir);
      const backupFiles = files
        .filter(file => file.startsWith('settings-backup-') && file.endsWith('.json'))
        .map(file => ({
          name: file,
          path: path.join(this.dataDir, file)
        }));

      const backupsWithInfo = await Promise.all(
        backupFiles.map(async backup => {
          const stats = await fs.stat(backup.path);
          return {
            ...backup,
            size: stats.size,
            created: stats.mtime
          };
        })
      );

      return backupsWithInfo.sort((a, b) => b.created - a.created);
    } catch (error) {
      throw new Error(`列出备份失败: ${error.message}`);
    }
  }

  /**
   * 切换配置文件
   */
  async switchProfile(profileName) {
    if (profileName === 'default') {
      throw new Error('无法切换到默认配置文件');
    }

    const profileFile = path.join(this.profilesDir, `${profileName}.json`);

    try {
      await fs.access(profileFile);
    } catch (error) {
      throw new Error(`配置文件不存在: ${profileName}`);
    }

    await this.loadSettings(profileName);
    return profileName;
  }

  /**
   * 创建新配置文件
   */
  async createProfile(profileName, basedOn = 'default') {
    if (profileName === 'default') {
      throw new Error('无法创建默认配置文件');
    }

    const profileFile = path.join(this.profilesDir, `${profileName}.json`);

    try {
      await fs.access(profileFile);
      throw new Error(`配置文件已存在: ${profileName}`);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }

    // 加载基础配置
    const baseSettings = this.settings;

    // 保存新配置文件
    await fs.writeFile(profileFile, JSON.stringify(baseSettings, null, 2));

    return profileName;
  }

  /**
   * 删除配置文件
   */
  async deleteProfile(profileName) {
    if (profileName === 'default') {
      throw new Error('无法删除默认配置文件');
    }

    const profileFile = path.join(this.profilesDir, `${profileName}.json`);

    try {
      await fs.unlink(profileFile);
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`配置文件不存在: ${profileName}`);
      }
      throw error;
    }

    return profileName;
  }

  /**
   * 列出所有配置文件
   */
  async listProfiles() {
    try {
      const files = await fs.readdir(this.profilesDir);
      const profiles = files
        .filter(file => file.endsWith('.json'))
        .map(file => file.replace('.json', ''));

      const profilesWithInfo = await Promise.all(
        profiles.map(async profile => {
          const profileFile = path.join(this.profilesDir, `${profile}.json`);
          const stats = await fs.stat(profileFile);
          return {
            name: profile,
            size: stats.size,
            modified: stats.mtime,
            is_current: profile === 'default'
          };
        })
      );

      return profilesWithInfo.sort((a, b) => b.modified - a.modified);
    } catch (error) {
      throw new Error(`列出配置文件失败: ${error.message}`);
    }
  }

  /**
   * 重置设置为默认值
   */
  async resetToDefaults() {
    this.settings = this.getDefaultSettings();
    await this.saveSettings();
  }

  /**
   * 获取设置摘要
   */
  getSettingsSummary() {
    return {
      global: {
        language: this.settings.global.language,
        theme: this.settings.global.theme,
        output_format: this.settings.global.output_format,
        log_level: this.settings.global.log_level
      },
      cameras_count: Object.keys(this.settings.cameras).length,
      presets: {
        auto_save: this.settings.presets.auto_save,
        max_presets_per_camera: this.settings.presets.max_presets_per_camera
      },
      network: {
        proxy_enabled: this.settings.network.proxy.enabled,
        retry_attempts: this.settings.network.retry_policy.max_attempts
      },
      security: {
        password_storage: this.settings.security.password_storage,
        encrypt_credentials: this.settings.security.encrypt_credentials
      }
    };
  }
}

module.exports = SettingsManager;