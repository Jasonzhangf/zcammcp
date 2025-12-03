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
  recording?: boolean;
  batteryVoltage?: number;
  temperature?: number;
  panPosition?: number;
  tiltPosition?: number;
  focusDistance?: number;
}

// 相机上下文接口
export interface CameraContext {
  currentCamera: string | null; // 当前相机IP
  cameras: Map<string, CameraStatus>; // IP到相机状态的映射
}

// 相机信息接口（用于WebSocket更新）
export interface CameraInfo {
  ip: string;
  name: string;
  model: string;
  firmware: string;
  mac: string;
  serialNumber: string;
  isConnected: boolean;
  recording?: boolean;
  batteryVoltage?: number;
  temperature?: number;
  panPosition?: number;
  tiltPosition?: number;
  focusDistance?: number;
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
   * 添加相机
   */
  async addCamera(ip: string): Promise<void> {
    console.log(`Function: addCamera - Adding camera with IP: ${ip}`);
    
    // 创建新的相机状态
    const status: CameraStatus = {
      ip: ip,
      name: `Z CAM ${ip.split('.').pop()}`, // 使用IP最后一段作为默认别名
      model: 'E2',
      firmware: '1.0.0',
      mac: '00:11:22:33:44:55',
      serialNumber: '123456789',
      isConnected: true
    };
    
    // 更新上下文
    this.context.cameras.set(ip, status);
    
    // 如果是第一个相机，设置为当前相机
    if (this.context.currentCamera === null) {
      this.switchCamera(ip);
    }
    
    // 更新历史记录
    this.configManager.addCameraToHistory({
      ip: status.ip,
      name: status.name,
      model: status.model,
      firmware: status.firmware,
      mac: status.mac,
      serialNumber: status.serialNumber,
      addedAt: new Date()
    });
  }

  /**
   * 移除相机
   */
  async removeCamera(ip: string): Promise<boolean> {
    console.log(`Function: removeCamera - Removing camera with IP: ${ip}`);
    
    // 从上下文中移除
    const result = this.context.cameras.delete(ip);
    
    // 如果移除的是当前相机，重置当前相机
    if (this.context.currentCamera === ip) {
      this.context.currentCamera = null;
    }
    
    return result;
  }

  /**
   * 获取相机状态
   */
  async getCameraStatus(ip: string): Promise<CameraStatus | null> {
    console.log(`Function: getCameraStatus - Getting status for camera: ${ip}`);
    
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
   * 更新相机信息（用于WebSocket更新）
   */
  updateCameraInfo(ip: string, info: Partial<CameraInfo>): void {
    console.log(`Function: updateCameraInfo - Updating camera info for: ${ip}`);
    
    // 检查相机是否在上下文中
    if (this.context.cameras.has(ip)) {
      const camera = this.context.cameras.get(ip)!;
      
      // 更新相机信息
      if (info.name !== undefined) camera.name = info.name;
      if (info.model !== undefined) camera.model = info.model;
      if (info.firmware !== undefined) camera.firmware = info.firmware;
      if (info.mac !== undefined) camera.mac = info.mac;
      if (info.serialNumber !== undefined) camera.serialNumber = info.serialNumber;
      if (info.isConnected !== undefined) camera.isConnected = info.isConnected;
      if (info.recording !== undefined) camera.recording = info.recording;
      if (info.batteryVoltage !== undefined) {
        camera.batteryVoltage = info.batteryVoltage;
        // 转换电池电压为电池等级（0-100）
        camera.batteryLevel = Math.min(100, Math.max(0, Math.round((info.batteryVoltage - 100) / 20)));
      }
      if (info.temperature !== undefined) camera.temperature = info.temperature;
      if (info.panPosition !== undefined) camera.panPosition = info.panPosition;
      if (info.tiltPosition !== undefined) camera.tiltPosition = info.tiltPosition;
      if (info.focusDistance !== undefined) camera.focusDistance = info.focusDistance;
      
      // 更新上下文
      this.context.cameras.set(ip, camera);
    } else {
      // 如果相机不在上下文中，创建新的条目
      const newCamera: CameraStatus = {
        ip: ip,
        name: info.name || `Z CAM ${ip.split('.').pop()}`,
        model: info.model || 'E2',
        firmware: info.firmware || '1.0.0',
        mac: info.mac || '',
        serialNumber: info.serialNumber || '',
        isConnected: info.isConnected !== undefined ? info.isConnected : true,
        recording: info.recording,
        batteryVoltage: info.batteryVoltage,
        batteryLevel: info.batteryVoltage !== undefined ? 
          Math.min(100, Math.max(0, Math.round((info.batteryVoltage - 100) / 20))) : undefined,
        temperature: info.temperature,
        panPosition: info.panPosition,
        tiltPosition: info.tiltPosition,
        focusDistance: info.focusDistance
      };
      
      this.context.cameras.set(ip, newCamera);
      
      // 如果是第一个相机，设置为当前相机
      if (this.context.currentCamera === null) {
        this.switchCamera(ip);
      }
    }
  }

  /**
   * 更新相机别名
   */
  async updateCameraAlias(ip: string, alias: string): Promise<boolean> {
    console.log(`Function: updateCameraAlias - Updating alias for camera ${ip} to ${alias}`);
    
    // 更新上下文中的别名
    if (this.context.cameras.has(ip)) {
      const camera = this.context.cameras.get(ip)!;
      camera.name = alias;
      this.context.cameras.set(ip, camera);
      
      // 如果是当前相机，也更新历史记录中的名称
      if (this.context.currentCamera === ip) {
        const history = this.configManager.getCameraHistory();
        const cameraHistory = history.find((c: any) => c.ip === ip);
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
  getFavoriteCameras(): Array<{ip: string, alias?: string, addedAt?: Date}> {
    console.log('Function: getFavoriteCameras - Getting favorite cameras');
    return this.configManager.getFavoriteCameras();
  }

  /**
   * 获取所有相机IP列表
   */
  getAllCameras(): string[] {
    console.log('Function: getAllCameras - Getting all cameras');
    return Array.from(this.context.cameras.keys());
  }

  /**
   * 获取所有相机状态（用于持久化）
   */
  getAllCameraStatus(): Map<string, CameraStatus> {
    console.log('Function: getAllCameraStatus - Getting all camera status');
    return new Map(this.context.cameras);
  }

  /**
   * 获取单个相机信息
   */
  getCamera(ip: string): CameraStatus | null {
    return this.context.cameras.get(ip) || null;
  }

  /**
   * 获取已连接的相机列表
   */
  getConnectedCameras(): CameraStatus[] {
    return Array.from(this.context.cameras.values()).filter(camera => camera.isConnected);
  }
}
