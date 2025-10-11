import { ConfigManager, CameraContextConfig } from '../core/ConfigManager';
import { CameraManager, CameraStatus } from '../core/CameraManager';
import { WebSocketSubscriptionManager, SubscriptionOptions } from './WebSocketSubscriptionManager';

export class PersistenceManager {
  private configManager: ConfigManager;
  private cameraManager: CameraManager;
  private wsManager: WebSocketSubscriptionManager;

  constructor(
    configManager: ConfigManager,
    cameraManager: CameraManager,
    wsManager: WebSocketSubscriptionManager
  ) {
    this.configManager = configManager;
    this.cameraManager = cameraManager;
    this.wsManager = wsManager;
  }

  /**
   * 保存所有上下文到持久化存储
   */
  saveContexts(): void {
    console.log('Function: saveContexts - Saving all contexts to persistent storage');
    
    // 获取所有相机
    const cameras = this.cameraManager.getAllCameras();
    
    // 创建上下文配置数组
    const contextConfigs: CameraContextConfig[] = cameras.map(ip => {
      // 获取相机状态
      const cameraStatus = this.getCameraStatus(ip);
      
      // 获取订阅选项
      const subscriptionOptions = this.wsManager.getSubscriptionOptions(ip);
      
      // 创建上下文配置
      const contextConfig: CameraContextConfig = {
        id: this.generateContextId(ip),
        cameraIp: ip,
        alias: cameraStatus?.name || `Z CAM ${ip.split('.').pop()}`,
        isActive: this.cameraManager.getCurrentContext().currentCamera === ip,
        lastUpdated: new Date(),
        cameraInfo: {
          recording: cameraStatus?.recording,
          batteryVoltage: cameraStatus?.batteryVoltage,
          temperature: cameraStatus?.temperature,
          panPosition: cameraStatus?.panPosition,
          tiltPosition: cameraStatus?.tiltPosition,
          focusDistance: cameraStatus?.focusDistance
        },
        subscriptionOptions: subscriptionOptions
      };
      
      return contextConfig;
    });
    
    // 保存到配置管理器
    this.configManager.saveContexts(contextConfigs);
  }

  /**
   * 从持久化存储加载上下文
   */
  async loadContexts(): Promise<void> {
    console.log('Function: loadContexts - Loading contexts from persistent storage');
    
    // 从配置管理器获取上下文配置
    const contextConfigs = this.configManager.getContexts();
    
    // 为每个上下文配置重新建立连接
    for (const contextConfig of contextConfigs) {
      try {
        // 添加相机到相机管理器
        await this.cameraManager.addCamera(contextConfig.cameraIp);
        
        // 更新相机别名
        if (contextConfig.alias) {
          await this.cameraManager.updateCameraAlias(contextConfig.cameraIp, contextConfig.alias);
        }
        
        // 设置订阅选项
        if (contextConfig.subscriptionOptions) {
          this.wsManager.setSubscriptionOptions(contextConfig.cameraIp, contextConfig.subscriptionOptions);
        }
        
        // 如果是活动上下文，切换到该相机
        if (contextConfig.isActive) {
          this.cameraManager.switchCamera(contextConfig.cameraIp);
        }
        
        // 建立WebSocket连接
        await this.wsManager.connect(contextConfig.cameraIp);
      } catch (error) {
        console.error(`Failed to restore context for camera ${contextConfig.cameraIp}:`, error);
      }
    }
  }

  /**
   * 获取相机状态
   * @param ip 相机IP地址
   */
  private getCameraStatus(ip: string): CameraStatus | undefined {
    // 获取所有相机状态并查找指定IP的相机
    const allCameras = this.cameraManager.getAllCameraStatus();
    return allCameras.get(ip);
  }

  /**
   * 生成上下文ID
   * @param ip 相机IP地址
   */
  private generateContextId(ip: string): string {
    // 简单的ID生成策略，可以使用IP和时间戳
    return `ctx-${ip.replace(/\./g, '-')}-${Date.now()}`;
  }
}