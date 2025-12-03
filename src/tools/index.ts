/**
 * 工具域统一导出
 * 导出所有工具域的定义和处理函数
 */

import { 
  createCameraManagerTool, 
  handleCameraManagerTool 
} from './camera.js';
import { 
  createPTZControlTool, 
  handlePTZControlTool 
} from './ptz.js';
import { 
  createPresetManagerTool, 
  handlePresetManagerTool 
} from './preset.js';

export type { CameraManagerTool } from './camera.js';
export type { PTZControlTool } from './ptz.js';
export type { PresetManagerTool } from './preset.js';

// 工具域注册器
export class ToolRegistry {
  private static tools: Array<{ name: string; description: string; inputSchema: any }> = [];
  private static handlers: Map<string, (args: any) => Promise<any>> = new Map();

  /**
   * 注册工具定义
   */
  static registerTool(tool: { name: string; description: string; inputSchema: any }): void {
    this.tools.push(tool);
  }

  /**
   * 注册工具处理函数
   */
  static registerHandler(name: string, handler: (args: any) => Promise<any>): void {
    this.handlers.set(name, handler);
  }

  /**
   * 获取所有工具定义
   */
  static getAllTools(): Array<{ name: string; description: string; inputSchema: any }> {
    return [...this.tools];
  }

  /**
   * 获取工具处理函数
   */
  static getHandler(name: string): ((args: any) => Promise<any>) | undefined {
    return this.handlers.get(name);
  }

  /**
   * 初始化所有工具域
   */
  static initializeTools(): void {
    console.log('Initializing tool domains...');

    // 注册相机管理工具
    this.registerTool(createCameraManagerTool());
    this.registerHandler('camera_manager', async (args) => {
      return handleCameraManagerTool(
        args.action,
        args.ip,
        args.alias,
        args.cameraManager,
        args.contextService,
        args.persistenceManager
      );
    });

    // 注册PTZ控制工具
    this.registerTool(createPTZControlTool());
    this.registerHandler('ptz_control', async (args) => {
      return handlePTZControlTool(
        args.action,
        args.ip,
        args.pan,
        args.tilt,
        args.zoomValue,
        args.ptzService
      );
    });

    // 注册预设管理工具
    this.registerTool(createPresetManagerTool());
    this.registerHandler('preset_manager', async (args) => {
      return handlePresetManagerTool(
        args.action,
        args.ip,
        args.presetId,
        args.name,
        args.presetService
      );
    });

    console.log(`Registered ${this.tools.length} tool domains`);
  }
}

export { createCameraManagerTool, handleCameraManagerTool } from './camera.js';
export { createPTZControlTool, handlePTZControlTool } from './ptz.js';
export { createPresetManagerTool, handlePresetManagerTool } from './preset.js';
