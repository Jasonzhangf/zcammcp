/**
 * 重构的配置管理器
 * 使用单一配置契约，集成schema验证和类型安全
 */

import * as fs from 'fs';
import * as path from 'path';
import { 
  UserConfigSchema, 
  validateUserConfig, 
  mergeWithDefaults,
  UserConfigType,
  defaultMcpConfig,
  defaultCliConfig
} from '../config/schema.js';

export class ConfigManager {
  private configPath: string;
  private config: UserConfigType;
  private listeners: Set<(config: UserConfigType) => void> = new Set();

  constructor(configPath?: string) {
    console.log('Enhanced ConfigManager initialized');
    
    // 默认配置文件路径
    this.configPath = configPath || path.join(
      process.env.HOME || '', 
      '.zcammcp', 
      'config.json'
    );
    
    // 初始化默认配置
    this.config = {
      version: '1.0.0',
      cameras: {
        favorites: [], // 现在是对象数组而不是字符串数组
        history: []
      },
      contexts: [],
      settings: {
        defaultFormat: 'table',
        verboseOutput: false,
        colorOutput: true,
      }
    };
    
    this.loadConfig();
  }

  /**
   * 加载配置文件
   */
  private loadConfig(): void {
    console.log('Function: loadConfig - Loading configuration from file');
    
    try {
      // 确保配置目录存在
      const configDir = path.dirname(this.configPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
        console.log('Created config directory:', configDir);
      }

      // 如果配置文件不存在，创建默认配置
      if (!fs.existsSync(this.configPath)) {
        console.log('Config file does not exist, creating default config');
        this.saveConfig();
        return;
      }

      // 读取配置文件
      const data = fs.readFileSync(this.configPath, 'utf8');
      const loadedConfig = JSON.parse(data);

      // 使用schema验证和迁移配置
      this.config = this.migrateAndValidateConfig(loadedConfig);
      
      console.log('Configuration loaded successfully');
    } catch (error) {
      console.error('Failed to load configuration, using default config:', error);
      // 保持默认配置不变
    }
  }

  /**
   * 配置迁移和验证
   */
  private migrateAndValidateConfig(loadedConfig: any): UserConfigType {
    console.log('Function: migrateAndValidateConfig - Migrating and validating configuration');
    
    try {
      // 首先尝试直接验证（适用于新格式）
      const validatedConfig = validateUserConfig(loadedConfig);
      console.log('Configuration validation successful');
      return validatedConfig;
    } catch (validationError) {
      console.log('Direct validation failed, attempting migration');
      
      // 旧格式或需要迁移的配置
      return this.migrateLegacyConfig(loadedConfig);
    }
  }

  /**
   * 迁移旧格式配置
   */
  private migrateLegacyConfig(loadedConfig: any): UserConfigType {
    console.log('Function: migrateLegacyConfig - Migrating legacy configuration format');
    
    // 提取旧配置数据
    const oldCameras = loadedConfig.cameras || {};
    const oldContexts = loadedConfig.contexts || [];
    const oldVersion = loadedConfig.version || '0.0.1';
    
    // 创建新的配置对象
    const migratedConfig: Partial<UserConfigType> = {
      version: '1.0.0',
      cameras: {
        favorites: Array.isArray(oldCameras.favorites) ? oldCameras.favorites : [],
        history: Array.isArray(oldCameras.history) ? 
          oldCameras.history.map((camera: any) => ({
            ip: camera.ip || '',
            name: camera.name || 'Unknown',
            model: camera.model || 'Unknown',
            firmware: camera.firmware || 'Unknown',
            mac: camera.mac || '',
            serialNumber: camera.serialNumber || '',
            addedAt: new Date(camera.addedAt || Date.now())
          })) : []
      },
      contexts: oldContexts.map((context: any) => ({
        id: context.id || this.generateId(),
        cameraIp: context.cameraIp || '',
        alias: context.alias || '',
        isActive: context.isActive || false,
        lastUpdated: new Date(context.lastUpdated || Date.now()),
        cameraInfo: {
          recording: context.cameraInfo?.recording,
          batteryVoltage: context.cameraInfo?.batteryVoltage,
          temperature: context.cameraInfo?.temperature,
          panPosition: context.cameraInfo?.panPosition,
          tiltPosition: context.cameraInfo?.tiltPosition,
          focusDistance: context.cameraInfo?.focusDistance
        },
        subscriptionOptions: {
          basicInfo: context.subscriptionOptions?.basicInfo ?? true,
          statusUpdates: context.subscriptionOptions?.statusUpdates ?? true,
          recordingStatus: context.subscriptionOptions?.recording ?? true,
          ptzPosition: context.subscriptionOptions?.ptz ?? false,
          batteryStatus: context.subscriptionOptions?.battery ?? false,
          temperatureStatus: context.subscriptionOptions?.temperature ?? false
        }
      })),
      settings: {
        defaultFormat: 'table',
        verboseOutput: false,
        colorOutput: true
      }
    };

    // 尝试验证迁移后的配置
    try {
      const validatedConfig = validateUserConfig(migratedConfig);
      console.log('Migrated configuration validation successful');
      
      // 保存迁移后的配置
      this.saveConfigWithData(validatedConfig);
      
      return validatedConfig;
    } catch (error) {
      console.error('Migrated configuration validation failed:', error);
      console.log('Using default configuration');
      return {
        version: '1.0.0',
        cameras: {
          favorites: [],
          history: []
        },
        contexts: [],
        settings: {
          defaultFormat: 'table',
          verboseOutput: false,
          colorOutput: true
        }
      };
    }
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `context_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 保存配置文件
   */
  private saveConfig(): void {
    this.saveConfigWithData(this.config);
  }

  /**
   * 使用指定数据保存配置
   */
  private saveConfigWithData(config: UserConfigType): void {
    console.log('Function: saveConfig - Saving configuration to file');
    
    try {
      // 再次验证配置
      const validatedConfig = validateUserConfig(config);
      
      // 确保配置目录存在
      const configDir = path.dirname(this.configPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }

      // 写入配置文件
      fs.writeFileSync(this.configPath, JSON.stringify(validatedConfig, null, 2));
      
      console.log('Configuration saved successfully');
      
      // 通知监听器
      this.notifyListeners(validatedConfig);
    } catch (error) {
      console.error('Failed to save configuration:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Configuration save failed: ${errorMessage}`);
    }
  }

  /**
   * 通知配置变更监听器
   */
  private notifyListeners(config: UserConfigType): void {
    for (const listener of this.listeners) {
      try {
        listener(config);
      } catch (error) {
        console.error('Error notifying config listener:', error);
      }
    }
  }

  // ===============================
  // 相机收藏夹管理
  // ===============================

  /**
   * 添加相机到收藏列表
   */
  addFavoriteCamera(ip: string): void {
    console.log(`Function: addFavoriteCamera - Adding camera ${ip} to favorites`);
    
    // 检查是否已存在
    const existingIndex = this.config.cameras.favorites.findIndex(fav => fav.ip === ip);
    if (existingIndex === -1) {
      this.config.cameras.favorites.push({
        ip,
        addedAt: new Date()
      });
      this.saveConfig();
    }
  }

  /**
   * 更新收藏相机别名
   */
  updateFavoriteCameraAlias(ip: string, alias: string): void {
    console.log(`Function: updateFavoriteCameraAlias - Updating alias for favorite camera ${ip} to: ${alias}`);
    
    const favorites = this.config.cameras.favorites;
    const existingIndex = favorites.findIndex(fav => fav.ip === ip);
    
    if (existingIndex !== -1) {
      // 更新现有记录的别名
      favorites[existingIndex].alias = alias;
      this.saveConfig();
    } else {
      // 如果不在收藏列表中，添加到收藏列表并设置别名
      this.addFavoriteCameraWithAlias(ip, alias);
    }
  }

  /**
   * 添加收藏相机并设置别名
   */
  addFavoriteCameraWithAlias(ip: string, alias: string): void {
    console.log(`Function: addFavoriteCameraWithAlias - Adding camera ${ip} to favorites with alias: ${alias}`);
    
    // 检查是否已存在
    const existingIndex = this.config.cameras.favorites.findIndex(fav => fav.ip === ip);
    
    if (existingIndex !== -1) {
      // 更新现有记录的别名
      this.config.cameras.favorites[existingIndex].alias = alias;
    } else {
      // 添加新记录
      this.config.cameras.favorites.push({
        ip,
        alias,
        addedAt: new Date()
      });
    }
    
    this.saveConfig();
  }

  /**
   * 从收藏列表移除相机
   */
  removeFavoriteCamera(ip: string): void {
    console.log(`Function: removeFavoriteCamera - Removing camera ${ip} from favorites`);
    
    const index = this.config.cameras.favorites.findIndex(fav => fav.ip === ip);
    if (index !== -1) {
      this.config.cameras.favorites.splice(index, 1);
      this.saveConfig();
    }
  }

  /**
   * 获取收藏的相机列表
   */
  getFavoriteCameras(): Array<{ip: string, alias?: string, addedAt?: Date}> {
    console.log('Function: getFavoriteCameras - Getting favorite cameras');
    return [...this.config.cameras.favorites];
  }

  // ===============================
  // 相机历史记录管理
  // ===============================

  /**
   * 添加相机到历史记录
   */
  addCameraToHistory(cameraInfo: UserConfigType['cameras']['history'][0]): void {
    console.log(`Function: addCameraToHistory - Adding camera ${cameraInfo.ip} to history`);
    
    // 检查是否已存在该相机的历史记录
    const existingIndex = this.config.cameras.history.findIndex(c => c.ip === cameraInfo.ip);
    if (existingIndex !== -1) {
      // 更新已存在的记录
      this.config.cameras.history[existingIndex] = {
        ...cameraInfo,
        addedAt: new Date(cameraInfo.addedAt || Date.now())
      };
    } else {
      // 添加新记录
      this.config.cameras.history.push({
        ...cameraInfo,
        addedAt: new Date(cameraInfo.addedAt || Date.now())
      });
    }
    
    this.saveConfig();
  }

  /**
   * 从历史记录移除相机
   */
  removeCameraFromHistory(ip: string): void {
    console.log(`Function: removeCameraFromHistory - Removing camera ${ip} from history`);
    
    const index = this.config.cameras.history.findIndex(c => c.ip === ip);
    if (index !== -1) {
      this.config.cameras.history.splice(index, 1);
      this.saveConfig();
    }
  }

  /**
   * 获取相机历史记录
   */
  getCameraHistory(): UserConfigType['cameras']['history'] {
    console.log('Function: getCameraHistory - Getting camera history');
    return [...this.config.cameras.history];
  }

  /**
   * 清空相机历史记录
   */
  clearCameraHistory(): void {
    console.log('Function: clearCameraHistory - Clearing camera history');
    this.config.cameras.history = [];
    this.saveConfig();
  }

  // ===============================
  // 上下文管理
  // ===============================

  /**
   * 保存上下文配置
   */
  saveContexts(contexts: UserConfigType['contexts']): void {
    console.log('Function: saveContexts - Saving contexts to config');
    
    // 验证所有上下文
    const validatedContexts = contexts.map(context => ({
      ...context,
      lastUpdated: new Date(context.lastUpdated || Date.now())
    }));
    
    this.config.contexts = validatedContexts;
    this.saveConfig();
  }

  /**
   * 获取上下文配置
   */
  getContexts(): UserConfigType['contexts'] {
    console.log('Function: getContexts - Getting contexts from config');
    return [...this.config.contexts];
  }

  /**
   * 添加单个上下文
   */
  addContext(context: UserConfigType['contexts'][0]): void {
    console.log(`Function: addContext - Adding context for camera ${context.cameraIp}`);
    
    // 检查是否已存在相同ID的上下文
    const existingIndex = this.config.contexts.findIndex(c => c.id === context.id);
    if (existingIndex !== -1) {
      // 更新现有上下文
      this.config.contexts[existingIndex] = {
        ...context,
        lastUpdated: new Date(context.lastUpdated || Date.now())
      };
    } else {
      // 添加新上下文
      this.config.contexts.push({
        ...context,
        lastUpdated: new Date(context.lastUpdated || Date.now())
      });
    }
    
    this.saveConfig();
  }

  /**
   * 删除上下文
   */
  removeContext(contextId: string): void {
    console.log(`Function: removeContext - Removing context ${contextId}`);
    
    const index = this.config.contexts.findIndex(c => c.id === contextId);
    if (index !== -1) {
      this.config.contexts.splice(index, 1);
      this.saveConfig();
    }
  }

  // ===============================
  // 设置管理
  // ===============================

  /**
   * 获取设置
   */
  getSettings(): UserConfigType['settings'] {
    console.log('Function: getSettings - Getting settings');
    return { ...this.config.settings };
  }

  /**
   * 更新设置
   */
  updateSettings(settings: Partial<UserConfigType['settings']>): void {
    console.log('Function: updateSettings - Updating settings');
    
    this.config.settings = {
      ...this.config.settings,
      ...settings
    };
    
    this.saveConfig();
  }

  // ===============================
  // 配置监听
  // ===============================

  /**
   * 添加配置变更监听器
   */
  addConfigListener(listener: (config: UserConfigType) => void): () => void {
    this.listeners.add(listener);
    
    // 返回取消监听的函数
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * 移除配置变更监听器
   */
  removeConfigListener(listener: (config: UserConfigType) => void): void {
    this.listeners.delete(listener);
  }

  // ===============================
  // 配置工具方法
  // ===============================

  /**
   * 重新加载配置
   */
  reloadConfig(): void {
    console.log('Function: reloadConfig - Reloading configuration');
    this.loadConfig();
  }

  /**
   * 获取配置路径
   */
  getConfigPath(): string {
    return this.configPath;
  }

  /**
   * 获取当前配置（只读副本）
   */
  getCurrentConfig(): UserConfigType {
    return { ...this.config };
  }

  /**
   * 检查配置是否已修改
   */
  isModified(): boolean {
    try {
      const fileContent = fs.readFileSync(this.configPath, 'utf8');
      const fileConfig = JSON.parse(fileContent);
      return JSON.stringify(fileConfig) !== JSON.stringify(this.config);
    } catch {
      return false;
    }
  }

  /**
   * 导出配置为JSON
   */
  exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * 从JSON导入配置
   */
  importConfig(jsonConfig: string): void {
    try {
      const importedConfig = JSON.parse(jsonConfig);
      this.config = this.migrateAndValidateConfig(importedConfig);
      this.saveConfig();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to import configuration: ${message}`);
    }
  }

  /**
   * 重置为默认配置
   */
  resetToDefaults(): void {
    console.log('Function: resetToDefaults - Resetting configuration to defaults');
    
    this.config = {
      version: '1.0.0',
      cameras: {
        favorites: [],
        history: []
      },
      contexts: [],
      settings: {
        defaultFormat: 'table',
        verboseOutput: false,
        colorOutput: true
      }
    };
    
    this.saveConfig();
  }

  /**
   * 清理资源
   */
  destroy(): void {
    this.listeners.clear();
    console.log('ConfigManager destroyed');
  }
}

// 导出单例工厂函数
let singletonInstance: ConfigManager | null = null;

export function createConfigManager(configPath?: string): ConfigManager {
  if (!singletonInstance) {
    singletonInstance = new ConfigManager(configPath);
  }
  return singletonInstance;
}

export function getConfigManager(): ConfigManager | null {
  return singletonInstance;
}
