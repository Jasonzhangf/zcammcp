import WebSocket from 'ws';
import { CameraContext, CameraInfo } from '../core/CameraManager.js';

// 订阅选项接口
export interface SubscriptionOptions {
  basicInfo?: boolean;    // 基本信息更新
  ptz?: boolean;          // PTZ变化
  focus?: boolean;        // 对焦变化
  recording?: boolean;    // 录制状态变化
  battery?: boolean;      // 电池状态变化
  temperature?: boolean;  // 温度变化
  all?: boolean;          // 订阅所有消息
}

export class WebSocketSubscriptionManager {
  private connections: Map<string, WebSocket> = new Map();
  private subscriptions: Map<string, SubscriptionOptions> = new Map();
  private contextUpdateCallback: (cameraIp: string, info: CameraInfo) => void;

  constructor(contextUpdateCallback: (cameraIp: string, info: CameraInfo) => void) {
    this.contextUpdateCallback = contextUpdateCallback;
  }

  /**
   * 设置订阅选项
   * @param cameraIp 相机IP地址
   * @param options 订阅选项
   */
  setSubscriptionOptions(cameraIp: string, options: SubscriptionOptions): void {
    console.log(`Setting subscription options for camera ${cameraIp}:`, options);
    this.subscriptions.set(cameraIp, options);
  }

  /**
   * 获取订阅选项
   * @param cameraIp 相机IP地址
   */
  getSubscriptionOptions(cameraIp: string): SubscriptionOptions | undefined {
    return this.subscriptions.get(cameraIp);
  }

  /**
   * 建立WebSocket连接
   * @param cameraIp 相机IP地址
   */
  async connect(cameraIp: string): Promise<void> {
    // 如果已经存在连接，先断开
    if (this.connections.has(cameraIp)) {
      await this.disconnect(cameraIp);
    }

    // 如果没有设置订阅选项，设置默认选项（订阅所有）
    if (!this.subscriptions.has(cameraIp)) {
      this.setSubscriptionOptions(cameraIp, { all: true });
    }

    const wsUrl = `ws://${cameraIp}:81`;
    console.log(`Connecting to ZCAM at ${wsUrl}`);

    return new Promise((resolve, reject) => {
      const ws = new WebSocket(wsUrl);

      // 连接成功处理
      ws.on('open', () => {
        console.log(`Connected to ZCAM WebSocket at ${cameraIp}`);
        this.connections.set(cameraIp, ws);
        resolve();
      });

      // 消息处理
      ws.on('message', (data) => {
        this.handleMessage(cameraIp, data);
      });

      // 错误处理
      ws.on('error', (err) => {
        console.error(`WebSocket error for camera ${cameraIp}:`, err);
        this.connections.delete(cameraIp);
        this.subscriptions.delete(cameraIp);
        // 不要reject，因为这可能是网络问题，我们希望保持服务运行
      });

      // 连接关闭处理
      ws.on('close', () => {
        console.log(`Disconnected from ZCAM WebSocket at ${cameraIp}`);
        this.connections.delete(cameraIp);
      });
    });
  }

  /**
   * 断开WebSocket连接
   * @param cameraIp 相机IP地址
   */
  async disconnect(cameraIp: string): Promise<void> {
    const ws = this.connections.get(cameraIp);
    if (ws) {
      ws.close();
      this.connections.delete(cameraIp);
    }
  }

  /**
   * 获取连接状态
   * @param cameraIp 相机IP地址
   */
  getConnectionStatus(cameraIp: string): 'connected' | 'disconnected' | 'connecting' {
    const ws = this.connections.get(cameraIp);
    if (!ws) {
      return 'disconnected';
    }

    switch (ws.readyState) {
      case WebSocket.OPEN:
        return 'connected';
      case WebSocket.CONNECTING:
        return 'connecting';
      default:
        return 'disconnected';
    }
  }

  /**
   * 处理WebSocket消息
   * @param cameraIp 相机IP地址
   * @param data 消息数据
   */
  private handleMessage(cameraIp: string, data: WebSocket.Data) {
    try {
      const message = JSON.parse(data.toString());
      
      // 获取订阅选项
      const options = this.subscriptions.get(cameraIp) || { all: true };
      
      // 根据订阅选项决定是否处理消息
      const shouldProcess = options.all || 
                          (options.basicInfo && message.what === 'basicInfo') ||
                          (options.ptz && message.what === 'ptzfChange') ||
                          (options.focus && message.what === 'ptzfChange') ||
                          (options.recording && message.what === 'basicInfo' && message.recording !== undefined) ||
                          (options.battery && message.what === 'basicInfo' && message.batVolt !== undefined) ||
                          (options.temperature && message.what === 'basicInfo' && message.temp !== undefined) ||
                          (message.what === 'hb'); // 心跳消息总是处理
      
      if (shouldProcess) {
        // 根据消息类型处理
        switch (message.what) {
          case 'basicInfo':
            this.handleBasicInfo(cameraIp, message);
            break;
          case 'ptzfChange':
            this.handlePtzfChange(cameraIp, message);
            break;
          case 'hb':
            // 心跳消息，可以用于连接状态监控
            break;
          default:
            console.log(`Unknown message type from camera ${cameraIp}:`, message.what);
        }
      }
    } catch (error) {
      console.error(`Error parsing message from camera ${cameraIp}:`, error);
    }
  }

  /**
   * 处理basicInfo消息
   * @param cameraIp 相机IP地址
   * @param message 消息内容
   */
  private handleBasicInfo(cameraIp: string, message: any) {
    const cameraInfo: CameraInfo = {
      ip: cameraIp,
      name: message.nickname || `Z CAM ${cameraIp.split('.').pop()}`,
      model: 'E2', // 假设为E2型号
      firmware: '1.0.0', // 需要从消息中获取实际固件版本
      mac: '', // 需要从消息中获取MAC地址
      serialNumber: '', // 需要从消息中获取序列号
      isConnected: true,
      // 从消息中提取的属性
      recording: message.recording,
      batteryVoltage: message.batVolt,
      temperature: message.temp,
      panPosition: 0, // 在ptzfChange消息中更新
      tiltPosition: 0, // 在ptzfChange消息中更新
      focusDistance: 0 // 在ptzfChange消息中更新
    };

    // 调用回调函数更新上下文
    this.contextUpdateCallback(cameraIp, cameraInfo);
  }

  /**
   * 处理ptzfChange消息
   * @param cameraIp 相机IP地址
   * @param message 消息内容
   */
  private handlePtzfChange(cameraIp: string, message: any) {
    const cameraInfo: Partial<CameraInfo> = {
      panPosition: message.pan_pos,
      tiltPosition: message.tilt_pos,
      focusDistance: message.fDist
    };

    // 调用回调函数更新上下文
    // 注意：这里只更新部分属性，需要在回调函数中合并到现有信息
    this.contextUpdateCallback(cameraIp, cameraInfo as CameraInfo);
  }

  /**
   * 关闭所有连接
   */
  async closeAll(): Promise<void> {
    const disconnectPromises = Array.from(this.connections.keys()).map(ip => 
      this.disconnect(ip)
    );
    await Promise.all(disconnectPromises);
    
    // 清空订阅选项
    this.subscriptions.clear();
  }
}