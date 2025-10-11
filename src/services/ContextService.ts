// 上下文服务模块
console.log('Module: ContextService');

import { CameraManager } from '../core/CameraManager.js';

export class ContextService {
  private cameraManager: CameraManager;

  constructor(cameraManager: CameraManager) {
    console.log('ContextService initialized');
    this.cameraManager = cameraManager;
  }

  /**
   * 切换当前相机上下文
   */
  switchCamera(ip: string): boolean {
    console.log(`Function: switchCamera - Switching to camera: ${ip}`);
    return this.cameraManager.switchCamera(ip);
  }

  /**
   * 获取当前相机上下文
   */
  getCurrentContext(): any {
    console.log('Function: getCurrentContext - Getting current camera context');
    return this.cameraManager.getCurrentContext();
  }
}