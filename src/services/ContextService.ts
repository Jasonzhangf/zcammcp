import { CameraManager, CameraInfo } from '../core/CameraManager';
import { WebSocketSubscriptionManager, SubscriptionOptions } from './WebSocketSubscriptionManager.js';

export class ContextService {
  private cameraManager: CameraManager;
  private wsManager: WebSocketSubscriptionManager;

  constructor(cameraManager: CameraManager) {
    this.cameraManager = cameraManager;
    
    // 创建WebSocket管理器，传入更新回调函数
    this.wsManager = new WebSocketSubscriptionManager(
      (cameraIp: string, info: CameraInfo) => {
        this.cameraManager.updateCameraInfo(cameraIp, info);
      }
    );
  }

  /**
   * 添加相机并建立WebSocket连接
   * @param cameraIp 相机IP地址
   * @param alias 相机别名
   * @param subscriptionOptions 订阅选项
   */
  async addCamera(cameraIp: string, alias?: string, subscriptionOptions?: SubscriptionOptions): Promise<void> {
    // 添加相机到相机管理器
    await this.cameraManager.addCamera(cameraIp);
    
    // 如果提供了别名，更新相机别名
    if (alias) {
      await this.cameraManager.updateCameraAlias(cameraIp, alias);
    }
    
    // 设置订阅选项
    if (subscriptionOptions) {
      this.wsManager.setSubscriptionOptions(cameraIp, subscriptionOptions);
    }
    
    // 建立WebSocket连接
    try {
      await this.wsManager.connect(cameraIp);
    } catch (error) {
      console.error(`Failed to establish WebSocket connection for camera ${cameraIp}:`, error);
      // 即使连接失败，我们也保持相机在管理器中，以便稍后重试
    }
  }

  /**
   * 移除相机并断开WebSocket连接
   * @param cameraIp 相机IP地址
   */
  async removeCamera(cameraIp: string): Promise<void> {
    // 断开WebSocket连接
    await this.wsManager.disconnect(cameraIp);
    
    // 从相机管理器中移除相机
    await this.cameraManager.removeCamera(cameraIp);
  }

  /**
   * 切换当前活动相机
   * @param cameraIp 相机IP地址
   */
  switchCamera(cameraIp: string): boolean {
    return this.cameraManager.switchCamera(cameraIp);
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
   * 获取相机连接状态
   * @param cameraIp 相机IP地址
   */
  getCameraConnectionStatus(cameraIp: string) {
    return this.wsManager.getConnectionStatus(cameraIp);
  }

  /**
   * 设置相机订阅选项
   * @param cameraIp 相机IP地址
   * @param options 订阅选项
   */
  setCameraSubscriptionOptions(cameraIp: string, options: SubscriptionOptions): void {
    this.wsManager.setSubscriptionOptions(cameraIp, options);
  }

  /**
   * 获取相机订阅选项
   * @param cameraIp 相机IP地址
   */
  getCameraSubscriptionOptions(cameraIp: string) {
    return this.wsManager.getSubscriptionOptions(cameraIp);
  }

  /**
   * 更新相机别名
   * @param cameraIp 相机IP地址
   * @param alias 新别名
   */
  async updateCameraAlias(cameraIp: string, alias: string): Promise<boolean> {
    return this.cameraManager.updateCameraAlias(cameraIp, alias);
  }

  /**
   * 将相机添加到收藏夹
   * @param cameraIp 相机IP地址
   */
  async addToFavorites(cameraIp: string): Promise<boolean> {
    return this.cameraManager.addToFavorites(cameraIp);
  }

  /**
   * 从收藏夹移除相机
   * @param cameraIp 相机IP地址
   */
  async removeFromFavorites(cameraIp: string): Promise<boolean> {
    return this.cameraManager.removeFromFavorites(cameraIp);
  }

  /**
   * 获取收藏夹中的相机列表
   */
  getFavoriteCameras(): string[] {
    return this.cameraManager.getFavoriteCameras();
  }

  /**
   * 关闭所有连接和服务
   */
  async close(): Promise<void> {
    // 断开所有WebSocket连接
    await this.wsManager.closeAll();
  }
}