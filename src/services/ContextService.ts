/**
 * 重构的上下文服务模块
 * 使用统一的WebSocket管理器，解决状态分歧问题
 */

import { CameraManager, CameraInfo } from '../core/CameraManager.js';
import { UnifiedWebSocketSubscriptionManager, SubscriptionOptions } from '../core/UnifiedWebSocketSubscriptionManager.js';

export class ContextService {
  private cameraManager: CameraManager;
  private wsManager: UnifiedWebSocketSubscriptionManager;

  constructor(
    cameraManager: CameraManager, 
    wsManager?: UnifiedWebSocketSubscriptionManager
  ) {
    this.cameraManager = cameraManager;
    
    // 使用传入的统一WebSocket管理器，或创建新的
    this.wsManager = wsManager || new UnifiedWebSocketSubscriptionManager();
    
    // 设置上下文更新回调
    this.wsManager.setContextUpdateCallback((cameraIp: string, info: CameraInfo) => {
      this.cameraManager.updateCameraInfo(cameraIp, info);
    });
  }

  /**
   * 添加相机并建立WebSocket连接
   */
  async addContext(cameraIp: string, alias?: string, subscriptionOptions?: SubscriptionOptions): Promise<void> {
    console.log(`Function: addContext - Adding context for camera: ${cameraIp}`);
    
    // 添加相机到相机管理器
    await this.cameraManager.addCamera(cameraIp);
    
    // 如果提供了别名，更新相机别名
    if (alias) {
      await this.cameraManager.updateCameraAlias(cameraIp, alias);
    }
    
    // 设置订阅选项
    if (subscriptionOptions) {
      this.wsManager.setSubscriptionOptions(cameraIp, subscriptionOptions);
    } else {
      // 默认订阅选项
      this.wsManager.setSubscriptionOptions(cameraIp, { all: true });
    }
    
    // 建立WebSocket连接
    try {
      const connected = await this.wsManager.connect(cameraIp);
      if (connected) {
        console.log(`WebSocket connection established for camera ${cameraIp}`);
      } else {
        console.log(`Failed to establish WebSocket connection for camera ${cameraIp}, will retry later`);
      }
    } catch (error) {
      console.error(`Failed to establish WebSocket connection for camera ${cameraIp}:`, error);
      // 即使连接失败，我们也保持相机在管理器中，以便稍后重试
    }
  }

  /**
   * 移除相机并断开WebSocket连接
   */
  async removeContext(cameraIp: string): Promise<void> {
    console.log(`Function: removeContext - Removing context for camera: ${cameraIp}`);
    
    // 断开WebSocket连接
    try {
      await this.wsManager.disconnect(cameraIp);
      console.log(`WebSocket connection closed for camera ${cameraIp}`);
    } catch (error) {
      console.error(`Error disconnecting WebSocket for camera ${cameraIp}:`, error);
    }
    
    // 从相机管理器中移除相机
    await this.cameraManager.removeCamera(cameraIp);
  }

  /**
   * 更新相机别名
   */
  async updateContextAlias(cameraIp: string, alias: string): Promise<void> {
    console.log(`Function: updateContextAlias - Updating alias for camera: ${cameraIp} to: ${alias}`);
    
    await this.cameraManager.updateCameraAlias(cameraIp, alias);
  }

  /**
   * 切换当前活动相机
   */
  async switchContext(cameraIp: string): Promise<boolean> {
    console.log(`Function: switchContext - Switching to camera: ${cameraIp}`);
    
    const switched = this.cameraManager.switchCamera(cameraIp);
    
    if (switched) {
      // 尝试连接该相机的WebSocket（如果尚未连接）
      if (!this.wsManager.isConnected(cameraIp)) {
        try {
          await this.wsManager.connect(cameraIp);
        } catch (error) {
          console.error(`Failed to connect WebSocket for camera ${cameraIp} during switch:`, error);
        }
      }
    }
    
    return switched;
  }

  /**
   * 获取当前相机上下文
   */
  getCurrentContext() {
    return this.cameraManager.getCurrentContext();
  }

  /**
   * 获取所有相机IP列表
   */
  getAllCameras(): string[] {
    return this.cameraManager.getAllCameras();
  }

  /**
   * 获取指定相机的上下文信息
   */
  async getContext(cameraIp: string): Promise<any> {
    console.log(`Function: getContext - Getting context for camera: ${cameraIp}`);
    
    const camera = this.cameraManager.getCamera(cameraIp);
    if (!camera) {
      return null;
    }
    
    const connectionStatus = this.wsManager.getConnectionStatus(cameraIp);
    
    return {
      camera: camera,
      connectionStatus: connectionStatus,
      subscriptionOptions: this.wsManager.getSubscriptionOptions(cameraIp),
      messageHistory: this.wsManager.getMessageHistory(cameraIp),
    };
  }

  /**
   * 设置订阅选项
   */
  async setSubscriptionOptions(cameraIp: string, options: SubscriptionOptions): Promise<void> {
    console.log(`Function: setSubscriptionOptions - Setting options for camera: ${cameraIp}`);
    
    this.wsManager.setSubscriptionOptions(cameraIp, options);
    
    // 如果相机已连接，重新连接以应用新选项
    if (this.wsManager.isConnected(cameraIp)) {
      await this.wsManager.disconnect(cameraIp);
      await this.wsManager.connect(cameraIp);
    }
  }

  /**
   * 获取所有相机连接状态
   */
  getAllConnectionStatus(): Record<string, any> {
    return this.wsManager.getAllConnectionStatus();
  }

  /**
   * 发送消息到相机
   */
  async sendMessage(cameraIp: string, message: any): Promise<boolean> {
    return await this.wsManager.sendMessage(cameraIp, message);
  }

  /**
   * 获取连接统计信息
   */
  getConnectionStatistics(): {
    totalCameras: number;
    activeConnections: number;
    failedConnections: number;
    totalReconnectAttempts: number;
  } {
    return this.wsManager.getConnectionStatistics();
  }

  /**
   * 清空消息缓冲区
   */
  clearMessageBuffer(cameraIp: string): void {
    this.wsManager.clearMessageBuffer(cameraIp);
  }

  /**
   * 断开所有连接
   */
  async disconnectAll(): Promise<void> {
    console.log('Function: disconnectAll - Disconnecting all WebSocket connections');
    await this.wsManager.disconnectAll();
  }

  /**
   * 重新连接所有相机
   */
  async reconnectAll(): Promise<void> {
    console.log('Function: reconnectAll - Reconnecting all cameras');
    
    const cameras = this.cameraManager.getAllCameras();
    
    for (const cameraIp of cameras) {
      try {
        await this.wsManager.connect(cameraIp);
      } catch (error) {
        console.error(`Failed to reconnect camera ${cameraIp}:`, error);
      }
    }
  }

  /**
   * 清理资源
   */
  destroy(): void {
    console.log('Function: destroy - Destroying ContextService');
    
    // 断开所有连接
    this.disconnectAll();
    
    // 清理资源
    this.wsManager.destroy();
  }
}