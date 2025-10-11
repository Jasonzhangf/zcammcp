// 用户配置管理器模块
console.log('Module: ConfigManager');

import * as fs from 'fs';
import * as path from 'path';

// 配置文件接口
interface Config {
  version: string;
  cameras: {
    favorites: string[]; // 收藏的相机IP列表
    history: CameraInfo[]; // 成功添加的相机历史记录
  };
}

// 相机信息接口
interface CameraInfo {
  ip: string;
  name: string;
  model: string;
  firmware: string;
  mac: string;
  serialNumber: string;
  addedAt: Date;
}

export class ConfigManager {
  private config: Config;
  private configPath: string;

  constructor(configPath?: string) {
    console.log('ConfigManager initialized');
    // 默认配置文件路径为用户主目录下的.zcammcp文件
    this.configPath = configPath || path.join(process.env.HOME || '', '.zcammcp', 'config.json');
    this.config = {
      version: '0.0.1',
      cameras: {
        favorites: [],
        history: []
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
      }

      // 如果配置文件不存在，创建默认配置文件
      if (!fs.existsSync(this.configPath)) {
        this.saveConfig();
        return;
      }

      // 读取配置文件
      const data = fs.readFileSync(this.configPath, 'utf8');
      const loadedConfig = JSON.parse(data);

      // 版本兼容性处理
      this.config = this.migrateConfig(loadedConfig);
    } catch (error) {
      console.error('Failed to load configuration, using default config:', error);
    }
  }

  /**
   * 配置版本迁移
   */
  private migrateConfig(loadedConfig: any): Config {
    console.log('Function: migrateConfig - Migrating configuration if needed');
    // 当前版本为0.0.1，暂不处理版本迁移
    // 在后续版本中，如果需要修改配置结构，可以在这里处理版本兼容性
    return {
      version: '0.0.1',
      cameras: {
        favorites: loadedConfig.cameras?.favorites || [],
        history: loadedConfig.cameras?.history || []
      }
    };
  }

  /**
   * 保存配置文件
   */
  private saveConfig(): void {
    console.log('Function: saveConfig - Saving configuration to file');
    try {
      // 确保配置目录存在
      const configDir = path.dirname(this.configPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }

      // 写入配置文件
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
    } catch (error) {
      console.error('Failed to save configuration:', error);
    }
  }

  /**
   * 添加相机到收藏列表
   */
  addFavoriteCamera(ip: string): void {
    console.log(`Function: addFavoriteCamera - Adding camera ${ip} to favorites`);
    if (!this.config.cameras.favorites.includes(ip)) {
      this.config.cameras.favorites.push(ip);
      this.saveConfig();
    }
  }

  /**
   * 从收藏列表移除相机
   */
  removeFavoriteCamera(ip: string): void {
    console.log(`Function: removeFavoriteCamera - Removing camera ${ip} from favorites`);
    const index = this.config.cameras.favorites.indexOf(ip);
    if (index !== -1) {
      this.config.cameras.favorites.splice(index, 1);
      this.saveConfig();
    }
  }

  /**
   * 获取收藏的相机列表
   */
  getFavoriteCameras(): string[] {
    console.log('Function: getFavoriteCameras - Getting favorite cameras');
    return [...this.config.cameras.favorites];
  }

  /**
   * 添加相机到历史记录
   */
  addCameraToHistory(cameraInfo: CameraInfo): void {
    console.log(`Function: addCameraToHistory - Adding camera ${cameraInfo.ip} to history`);
    // 检查是否已存在该相机的历史记录
    const existingIndex = this.config.cameras.history.findIndex(c => c.ip === cameraInfo.ip);
    if (existingIndex !== -1) {
      // 更新已存在的记录
      this.config.cameras.history[existingIndex] = cameraInfo;
    } else {
      // 添加新记录
      this.config.cameras.history.push(cameraInfo);
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
  getCameraHistory(): CameraInfo[] {
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
}