// 相机服务模块
console.log('Module: CameraService');

import { ConfigManager } from '../core/ConfigManager.js';
import { CameraManager } from '../core/CameraManager.js';

export class CameraService {
  private cameraManager: CameraManager;

  constructor(configManager: ConfigManager) {
    console.log('CameraService initialized');
    this.cameraManager = new CameraManager(configManager);
  }

  /**
   * 添加相机（空实现，仅打印待开发）
   */
  async addCamera(ip: string): Promise<void> {
    console.log(`Function: addCamera - Adding camera with IP: ${ip}`);
    console.log('TODO: Implement camera discovery and connection logic');
    return this.cameraManager.addCamera(ip);
  }

  /**
   * 获取相机状态（空实现，仅打印待开发）
   */
  async getCameraStatus(ip: string): Promise<any> {
    console.log(`Function: getCameraStatus - Getting status for camera: ${ip}`);
    console.log('TODO: Implement camera status retrieval logic');
    return this.cameraManager.getCameraStatus(ip);
  }

  /**
   * 更新相机别名
   */
  async updateCameraAlias(ip: string, alias: string): Promise<boolean> {
    console.log(`Function: updateCameraAlias - Updating alias for camera ${ip} to ${alias}`);
    console.log('TODO: Implement camera alias synchronization logic');
    return this.cameraManager.updateCameraAlias(ip, alias);
  }

  /**
   * 将相机添加到收藏夹
   */
  async addToFavorites(ip: string): Promise<boolean> {
    console.log(`Function: addToFavorites - Adding camera ${ip} to favorites`);
    return this.cameraManager.addToFavorites(ip);
  }

  /**
   * 从收藏夹移除相机
   */
  async removeFromFavorites(ip: string): Promise<boolean> {
    console.log(`Function: removeFromFavorites - Removing camera ${ip} from favorites`);
    return this.cameraManager.removeFromFavorites(ip);
  }

  /**
   * 获取收藏夹中的相机列表
   */
  getFavoriteCameras(): string[] {
    console.log('Function: getFavoriteCameras - Getting favorite cameras');
    return this.cameraManager.getFavoriteCameras();
  }
}