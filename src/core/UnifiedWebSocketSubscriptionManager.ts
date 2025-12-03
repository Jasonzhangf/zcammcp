/**
 * 统一的WebSocket订阅管理器
 * 解决多个WebSocket管理器实例导致的状态分歧问题
 * 支持持久化、实时订阅和上下文变更的共享状态
 */

import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { CameraContext, CameraInfo } from './CameraManager.js';
import { ZCamHttpClient } from './ZCamHttpClient.js';

export interface SubscriptionOptions {
  basicInfo?: boolean;      // 基本信息更新
  statusUpdates?: boolean;  // 状态更新
  recordingStatus?: boolean; // 录制状态变化
  ptzPosition?: boolean;    // PTZ位置变化
  batteryStatus?: boolean;  // 电池状态变化
  temperatureStatus?: boolean; // 温度变化
  all?: boolean;            // 订阅所有消息
}

export interface WebSocketConnectionStatus {
  isConnected: boolean;
  lastConnected: Date | null;
  reconnectAttempts: number;
  errorMessage: string | null;
}

export interface CameraWebSocketState {
  connection: WebSocket | null;
  status: WebSocketConnectionStatus;
  subscriptionOptions: SubscriptionOptions;
  lastHeartbeat: Date | null;
  messageBuffer: any[];
}

export class UnifiedWebSocketSubscriptionManager extends EventEmitter {
  private connections: Map<string, CameraWebSocketState> = new Map();
  private httpClient: ZCamHttpClient;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 5000; // 5 seconds
  private heartbeatInterval: number = 30000; // 30 seconds
  private heartbeatTimers: Map<string, NodeJS.Timeout> = new Map();
  private contextUpdateCallback?: (cameraIp: string, info: CameraInfo) => void;

  constructor(
    httpClient?: ZCamHttpClient,
    contextUpdateCallback?: (cameraIp: string, info: CameraInfo) => void
  ) {
    super();
    this.httpClient = httpClient || new ZCamHttpClient();
    this.contextUpdateCallback = contextUpdateCallback;
  }

  /**
   * 设置上下文更新回调
   */
  setContextUpdateCallback(callback: (cameraIp: string, info: CameraInfo) => void): void {
    this.contextUpdateCallback = callback;
  }

  /**
   * 设置订阅选项
   */
  setSubscriptionOptions(cameraIp: string, options: SubscriptionOptions): void {
    const existingState = this.connections.get(cameraIp);
    if (existingState) {
      existingState.subscriptionOptions = options;
      this.connections.set(cameraIp, existingState);
    } else {
      this.connections.set(cameraIp, {
        connection: null,
        status: {
          isConnected: false,
          lastConnected: null,
          reconnectAttempts: 0,
          errorMessage: null,
        },
        subscriptionOptions: options,
        lastHeartbeat: null,
        messageBuffer: [],
      });
    }

    this.emit('subscriptionChanged', cameraIp, options);
  }

  /**
   * 获取订阅选项
   */
  getSubscriptionOptions(cameraIp: string): SubscriptionOptions | undefined {
    return this.connections.get(cameraIp)?.subscriptionOptions;
  }

  /**
   * 获取连接状态
   */
  getConnectionStatus(cameraIp: string): WebSocketConnectionStatus | undefined {
    return this.connections.get(cameraIp)?.status;
  }

  /**
   * 获取所有相机连接状态
   */
  getAllConnectionStatus(): Record<string, WebSocketConnectionStatus> {
    const status: Record<string, WebSocketConnectionStatus> = {};
    
    for (const [ip, state] of this.connections) {
      status[ip] = { ...state.status };
    }
    
    return status;
  }

  /**
   * 建立WebSocket连接
   */
  async connect(cameraIp: string): Promise<boolean> {
    // 如果已经存在连接，先断开
    if (this.connections.has(cameraIp)) {
      await this.disconnect(cameraIp);
    }

    // 设置默认订阅选项（如果没有设置）
    if (!this.connections.has(cameraIp)) {
      this.setSubscriptionOptions(cameraIp, { all: true });
    }

    // 测试HTTP连接
    const httpConnected = await this.httpClient.testCameraConnection(cameraIp);
    if (!httpConnected) {
      this.updateConnectionStatus(cameraIp, {
        errorMessage: 'HTTP connection failed',
      });
      return false;
    }

    // 尝试WebSocket连接
    const wsUrl = `ws://${cameraIp}:81`;
    
    try {
      const state = this.connections.get(cameraIp)!;
      const ws = new WebSocket(wsUrl);

      state.connection = ws;
      this.connections.set(cameraIp, state);

      return new Promise((resolve) => {
        ws.on('open', () => {
          this.handleConnectionOpen(cameraIp);
          resolve(true);
        });

        ws.on('message', (data) => {
          this.handleMessage(cameraIp, data);
        });

        ws.on('error', (err) => {
          this.handleConnectionError(cameraIp, err);
          resolve(false);
        });

        ws.on('close', () => {
          this.handleConnectionClose(cameraIp);
        });

        // 连接超时
        setTimeout(() => {
          if (state.connection === ws && ws.readyState !== WebSocket.OPEN) {
            ws.close();
            this.handleConnectionTimeout(cameraIp);
            resolve(false);
          }
        }, 10000); // 10秒超时
      });
    } catch (error) {
      this.handleConnectionError(cameraIp, error as Error);
      return false;
    }
  }

  /**
   * 断开连接
   */
  async disconnect(cameraIp: string): Promise<void> {
    const state = this.connections.get(cameraIp);
    if (!state) {
      return;
    }

    // 停止心跳
    const heartbeatTimer = this.heartbeatTimers.get(cameraIp);
    if (heartbeatTimer) {
      clearTimeout(heartbeatTimer);
      this.heartbeatTimers.delete(cameraIp);
    }

    // 关闭连接
    if (state.connection) {
      state.connection.close();
      state.connection = null;
    }

    // 更新状态
    this.updateConnectionStatus(cameraIp, {
      isConnected: false,
      errorMessage: null,
    });

    this.emit('disconnected', cameraIp);
  }

  /**
   * 断开所有连接
   */
  async disconnectAll(): Promise<void> {
    const cameraIPs = Array.from(this.connections.keys());
    await Promise.all(cameraIPs.map(ip => this.disconnect(ip)));
  }

  /**
   * 处理连接成功
   */
  private handleConnectionOpen(cameraIp: string): void {
    console.log(`WebSocket connected to camera ${cameraIp}`);
    
    this.updateConnectionStatus(cameraIp, {
      isConnected: true,
      lastConnected: new Date(),
      reconnectAttempts: 0,
      errorMessage: null,
    });

    // 开始心跳
    this.startHeartbeat(cameraIp);

    this.emit('connected', cameraIp);
  }

  /**
   * 处理连接错误
   */
  private handleConnectionError(cameraIp: string, error: Error): void {
    console.error(`WebSocket error for camera ${cameraIp}:`, error.message);
    
    const state = this.connections.get(cameraIp);
    if (state) {
      state.status.reconnectAttempts++;
      state.status.errorMessage = error.message;
      
      // 如果是首次连接失败，标记为未连接
      if (state.status.reconnectAttempts === 1) {
        state.status.isConnected = false;
      }
      
      this.connections.set(cameraIp, state);
    }

    this.emit('connectionError', cameraIp, error);
  }

  /**
   * 处理连接关闭
   */
  private handleConnectionClose(cameraIp: string): void {
    console.log(`WebSocket connection closed for camera ${cameraIp}`);
    
    // 停止心跳
    const heartbeatTimer = this.heartbeatTimers.get(cameraIp);
    if (heartbeatTimer) {
      clearTimeout(heartbeatTimer);
      this.heartbeatTimers.delete(cameraIp);
    }

    this.updateConnectionStatus(cameraIp, {
      isConnected: false,
    });

    this.emit('disconnected', cameraIp);

    // 尝试重连
    this.attemptReconnect(cameraIp);
  }

  /**
   * 处理连接超时
   */
  private handleConnectionTimeout(cameraIp: string): void {
    console.log(`WebSocket connection timeout for camera ${cameraIp}`);
    
    this.handleConnectionError(cameraIp, new Error('Connection timeout'));
  }

  /**
   * 开始心跳
   */
  private startHeartbeat(cameraIp: string): void {
    const state = this.connections.get(cameraIp);
    if (!state || !state.connection) {
      return;
    }

    // 发送心跳消息
    try {
      state.connection.send(JSON.stringify({ type: 'heartbeat' }));
      state.lastHeartbeat = new Date();
      
      // 设置下次心跳
      const timer = setTimeout(() => {
        this.startHeartbeat(cameraIp);
      }, this.heartbeatInterval);
      
      this.heartbeatTimers.set(cameraIp, timer);
    } catch (error) {
      console.error(`Failed to send heartbeat to camera ${cameraIp}:`, error);
    }
  }

  /**
   * 处理消息
   */
  private handleMessage(cameraIp: string, data: WebSocket.RawData): void {
    try {
      const message = JSON.parse(data.toString());
      const state = this.connections.get(cameraIp);
      
      if (!state) {
        return;
      }

      // 处理心跳响应
      if (message.type === 'heartbeat') {
        state.lastHeartbeat = new Date();
        this.connections.set(cameraIp, state);
        return;
      }

      // 处理相机状态更新
      if (message.type === 'status' || message.type === 'camera_info') {
        this.handleCameraStatusUpdate(cameraIp, message);
      }

      // 缓冲区消息
      state.messageBuffer.push({
        timestamp: new Date(),
        message,
      });

      // 保持缓冲区大小
      if (state.messageBuffer.length > 100) {
        state.messageBuffer.shift();
      }

      this.connections.set(cameraIp, state);
      this.emit('message', cameraIp, message);
    } catch (error) {
      console.error(`Failed to parse message from camera ${cameraIp}:`, error);
    }
  }

  /**
   * 处理相机状态更新
   */
  private handleCameraStatusUpdate(cameraIp: string, message: any): void {
    if (this.contextUpdateCallback) {
      // 转换消息格式为CameraInfo
      const cameraInfo: CameraInfo = {
        ip: cameraIp,
        name: message.name || cameraIp,
        model: message.model || 'Unknown',
        firmware: message.firmware || 'Unknown',
        mac: message.mac || '',
        serialNumber: message.serialNumber || '',
        addedAt: new Date(),
        ...message,
      };

      this.contextUpdateCallback(cameraIp, cameraInfo);
    }

    this.emit('statusUpdate', cameraIp, message);
  }

  /**
   * 尝试重连
   */
  private async attemptReconnect(cameraIp: string): Promise<void> {
    const state = this.connections.get(cameraIp);
    if (!state || state.status.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log(`Max reconnection attempts reached for camera ${cameraIp}`);
      return;
    }

    setTimeout(async () => {
      console.log(`Attempting to reconnect to camera ${cameraIp} (attempt ${state.status.reconnectAttempts + 1})`);
      await this.connect(cameraIp);
    }, this.reconnectDelay * state.status.reconnectAttempts);
  }

  /**
   * 更新连接状态
   */
  private updateConnectionStatus(cameraIp: string, updates: Partial<WebSocketConnectionStatus>): void {
    const state = this.connections.get(cameraIp);
    if (state) {
      state.status = { ...state.status, ...updates };
      this.connections.set(cameraIp, state);
    }
  }

  /**
   * 发送消息到相机
   */
  async sendMessage(cameraIp: string, message: any): Promise<boolean> {
    const state = this.connections.get(cameraIp);
    if (!state || !state.connection || state.connection.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      state.connection.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error(`Failed to send message to camera ${cameraIp}:`, error);
      return false;
    }
  }

  /**
   * 获取消息历史
   */
  getMessageHistory(cameraIp: string): Array<{ timestamp: Date; message: any }> {
    const state = this.connections.get(cameraIp);
    return state ? [...state.messageBuffer] : [];
  }

  /**
   * 清空消息缓冲区
   */
  clearMessageBuffer(cameraIp: string): void {
    const state = this.connections.get(cameraIp);
    if (state) {
      state.messageBuffer = [];
      this.connections.set(cameraIp, state);
    }
  }

  /**
   * 获取活跃连接数量
   */
  getActiveConnectionsCount(): number {
    let count = 0;
    for (const state of this.connections.values()) {
      if (state.status.isConnected) {
        count++;
      }
    }
    return count;
  }

  /**
   * 检查是否连接到指定相机
   */
  isConnected(cameraIp: string): boolean {
    return this.connections.get(cameraIp)?.status.isConnected || false;
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
    let totalCameras = this.connections.size;
    let activeConnections = 0;
    let failedConnections = 0;
    let totalReconnectAttempts = 0;

    for (const state of this.connections.values()) {
      if (state.status.isConnected) {
        activeConnections++;
      } else if (state.status.errorMessage) {
        failedConnections++;
      }
      totalReconnectAttempts += state.status.reconnectAttempts;
    }

    return {
      totalCameras,
      activeConnections,
      failedConnections,
      totalReconnectAttempts,
    };
  }

  /**
   * 清理资源
   */
  destroy(): void {
    // 断开所有连接
    this.disconnectAll();
    
    // 清理事件监听器
    this.removeAllListeners();
    
    // 清理心跳定时器
    for (const timer of this.heartbeatTimers.values()) {
      clearTimeout(timer);
    }
    this.heartbeatTimers.clear();
    
    this.connections.clear();
  }
}

// 导出单例实例
let singletonInstance: UnifiedWebSocketSubscriptionManager | null = null;

export function createUnifiedWebSocketManager(
  httpClient?: ZCamHttpClient,
  contextUpdateCallback?: (cameraIp: string, info: CameraInfo) => void
): UnifiedWebSocketSubscriptionManager {
  if (!singletonInstance) {
    singletonInstance = new UnifiedWebSocketSubscriptionManager(httpClient, contextUpdateCallback);
  }
  
  // 如果提供了新的回调函数，更新它
  if (contextUpdateCallback) {
    singletonInstance.setContextUpdateCallback(contextUpdateCallback);
  }
  
  return singletonInstance;
}

export function getUnifiedWebSocketManager(): UnifiedWebSocketSubscriptionManager | null {
  return singletonInstance;
}