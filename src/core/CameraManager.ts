// 相机管理模块
console.log('Module: CameraManager');

import { ConfigManager } from './ConfigManager.js';

// 相机状态接口
export interface CameraStatus {
  ip: string;
  name: string; // 相机别名
  model: string;
  firmware: string;
  mac: string;
  serialNumber: string;
  isConnected: boolean;
  batteryLevel?: number;
  storageCapacity?: number;
  storageAvailable?: number;
}

// 相机上下文接口
export interface CameraContext {
  currentCamera: string | null; // 当前相机IP
  cameras: Map<string, CameraStatus>; // IP到相机状态的映射
}

export class CameraManager {
  private configManager: ConfigManager;
  private context: CameraContext;

  constructor(configManager: ConfigManager) {
    console.log('CameraManager initialized');
    this.configManager = configManager;
    this.context = {
      currentCamera: null,
      cameras: new Map<string, CameraStatus>()
    };
  }

  /**
   * 添加相机（空实现，仅打印待开发）
   */
  async addCamera(ip: string): Promise<void> {
    console.log(`Function: addCamera - Adding camera with IP: ${ip}`);
    console.log('TODO: Implement camera discovery and connection logic');
    
    // 暂时使用模拟数据
    const mockStatus: CameraStatus = {
      ip: ip,
      name: `Z CAM ${ip.split('.').pop()}`, // 使用IP最后一段作为默认别名
      model: 'E2',
      firmware: '1.0.0',
      mac: '00:11:22:33:44:55',
      serialNumber: '123456789',
      isConnected: true
    };
    
    // 更新上下文
    this.context.cameras.set(ip, mockStatus);
    
    // 如果是第一个相机，设置为当前相机
    if (this.context.currentCamera === null) {
      this.switchCamera(ip);
    }
    
    // 更新历史记录
    this.configManager.addCameraToHistory({
      ip: mockStatus.ip,
      name: mockStatus.name,
      model: mockStatus.model,
      firmware: mockStatus.firmware,
      mac: mockStatus.mac,
      serialNumber: mockStatus.serialNumber,
      addedAt: new Date()
    });
  }

  /**
   * 获取相机状态（空实现，仅打印待开发）
   */
  async getCameraStatus(ip: string): Promise<CameraStatus | null> {
    console.log(`Function: getCameraStatus - Getting status for camera: ${ip}`);
    console.log('TODO: Implement camera status retrieval logic');
    
    // 检查相机是否在上下文中
    if (this.context.cameras.has(ip)) {
      return this.context.cameras.get(ip) || null;
    }
    
    return null;
  }

  /**
   * 切换当前相机上下文
   */
  switchCamera(ip: string): boolean {
    console.log(`Function: switchCamera - Switching to camera: ${ip}`);
    
    // 检查相机是否存在
    if (this.context.cameras.has(ip)) {
      this.context.currentCamera = ip;
      console.log(`Switched to camera: ${ip}`);
      return true;
    } else {
      console.log(`Camera not found: ${ip}`);
      return false;
    }
  }

  /**
   * 获取当前相机上下文
   */
  getCurrentContext(): CameraContext {
    console.log('Function: getCurrentContext - Getting current camera context');
    return { ...this.context };
  }

  /**
   * 更新相机别名
   */
  async updateCameraAlias(ip: string, alias: string): Promise<boolean> {
    console.log(`Function: updateCameraAlias - Updating alias for camera ${ip} to ${alias}`);
    console.log('TODO: Implement camera alias synchronization logic');
    
    // 更新上下文中的别名
    if (this.context.cameras.has(ip)) {
      const camera = this.context.cameras.get(ip)!;
      camera.name = alias;
      this.context.cameras.set(ip, camera);
      
      // 如果是当前相机，也更新历史记录中的名称
      if (this.context.currentCamera === ip) {
        const history = this.configManager.getCameraHistory();
        const cameraHistory = history.find(c => c.ip === ip);
        if (cameraHistory) {
          cameraHistory.name = alias;
          this.configManager.addCameraToHistory(cameraHistory);
        }
      }
      
      // 更新收藏夹中的别名
      this.configManager.updateFavoriteCameraAlias(ip, alias);
      
      return true;
    }
    
    return false;
  }

  /**
   * 将相机添加到收藏夹
   */
  async addToFavorites(ip: string): Promise<boolean> {
    console.log(`Function: addToFavorites - Adding camera ${ip} to favorites`);
    
    // 检查相机是否存在
    if (this.context.cameras.has(ip)) {
      const camera = this.context.cameras.get(ip)!;
      this.configManager.addFavoriteCameraWithAlias(ip, camera.name);
      return true;
    }
    
    return false;
  }

  /**
   * 从收藏夹移除相机
   */
  async removeFromFavorites(ip: string): Promise<boolean> {
    console.log(`Function: removeFromFavorites - Removing camera ${ip} from favorites`);
    this.configManager.removeFavoriteCamera(ip);
    return true;
  }

  /**
   * 获取收藏夹中的相机列表
   */
  getFavoriteCameras(): string[] {
    console.log('Function: getFavoriteCameras - Getting favorite cameras');
    return this.configManager.getFavoriteCameras();
  }
}