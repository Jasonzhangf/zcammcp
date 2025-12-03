#!/usr/bin/env node

/**
 * Z CAM MCP服务器 - 重构后的主入口
 * 使用统一组件和工具域架构，大幅减少代码复杂度
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

// 导入统一组件
import { CameraManager } from './core/CameraManager.js';
import { ConfigManager } from './core/ConfigManager.js';
import { createConfigManager } from './core/ConfigManager.js';
import { createUnifiedWebSocketManager, UnifiedWebSocketSubscriptionManager } from './core/UnifiedWebSocketSubscriptionManager.js';
import { createDefaultHttpClient, ZCamHttpClient } from './core/ZCamHttpClient.js';

// 导入服务
import { ContextService } from './services/ContextService.js';
import { PersistenceManager } from './services/PersistenceService.js';
import { PTZService } from './services/PTZService.js';
import { PresetService } from './services/PresetService.js';
import { ExposureService } from './services/ExposureService.js';
import { WhiteBalanceService } from './services/WhiteBalanceService.js';
import { ImageService } from './services/ImageService.js';
import { AutoFramingService } from './services/AutoFramingService.js';
import { VideoService } from './services/VideoService.js';
import { StreamingService } from './services/StreamingService.js';
import { RecordingService } from './services/RecordingService.js';

// 导入工具域和配置
import { ToolRegistry } from './tools/index.js';
import { 
  ZcamMcpConfigSchema, 
  defaultMcpConfig,
  validateMcpConfig 
} from './config/schema.js';

class ZcamMcpServer {
  private server: Server;
  private configManager: ConfigManager;
  private cameraManager: CameraManager;
  private httpClient: ZCamHttpClient;
  private wsManager: UnifiedWebSocketSubscriptionManager;
  private contextService: ContextService;
  private persistenceManager: PersistenceManager;
  
  // 服务实例
  private services: {
    ptz: PTZService;
    preset: PresetService;
    exposure: ExposureService;
    whiteBalance: WhiteBalanceService;
    image: ImageService;
    autoFraming: AutoFramingService;
    video: VideoService;
    streaming: StreamingService;
    recording: RecordingService;
  };

  constructor(config?: unknown) {
    console.log('ZcamMcpServer initializing...');

    // 验证和加载配置
    const validatedConfig = validateMcpConfig(config || defaultMcpConfig);
    
    // 初始化统一组件
    this.configManager = createConfigManager();
    this.httpClient = createDefaultHttpClient({
      timeout: validatedConfig.network.defaultTimeout,
    });
    
    // 初始化相机管理器
    this.cameraManager = new CameraManager(this.configManager);
    
    // 初始化统一WebSocket管理器
    this.wsManager = createUnifiedWebSocketManager(
      this.httpClient,
      (cameraIp, info) => this.cameraManager.updateCameraInfo(cameraIp, info)
    );
    
    // 初始化上下文服务
    this.contextService = new ContextService(this.cameraManager);
    
    // 初始化持久化管理器
    this.persistenceManager = new PersistenceManager(
      this.configManager,
      this.cameraManager,
      this.wsManager
    );

    // 初始化所有服务（使用共享HTTP客户端）
    this.services = {
      ptz: new PTZService(this.httpClient),
      preset: new PresetService(),
      exposure: new ExposureService(),
      whiteBalance: new WhiteBalanceService(),
      image: new ImageService(),
      autoFraming: new AutoFramingService(),
      video: new VideoService(),
      streaming: new StreamingService(this.httpClient),
      recording: new RecordingService(this.httpClient),
    };

    // 初始化MCP服务器
    this.server = new Server(
      {
        name: 'zcammcp',
        version: validatedConfig.version.version,
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // 初始化工具域
    this.initializeToolDomains();
    
    // 设置MCP处理程序
    this.setupMcpHandlers();
    
    // 加载持久化上下文
    this.loadPersistedContexts();
  }

  /**
   * 初始化工具域
   */
  private initializeToolDomains(): void {
    console.log('Initializing tool domains...');
    
    // 初始化工具注册器
    ToolRegistry.initializeTools();
    
    // 传递服务依赖到相机管理工具
    const cameraManagerHandler = ToolRegistry.getHandler('camera_manager');
    if (cameraManagerHandler) {
      // 这里可以通过闭包或其他方式传递依赖
      // 或者在ToolRegistry中改进依赖注入机制
    }
    
    // 传递PTZ服务到PTZ工具
    const ptzHandler = ToolRegistry.getHandler('ptz_control');
    if (ptzHandler) {
      // 同上
    }
    
    // 传递预设服务到预设工具
    const presetHandler = ToolRegistry.getHandler('preset_manager');
    if (presetHandler) {
      // 同上
    }
  }

  /**
   * 设置MCP处理程序
   */
  private setupMcpHandlers(): void {
    // ListTools处理程序
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      console.log('ListTools request received');
      return {
        tools: ToolRegistry.getAllTools(),
      };
    });

    // CallTool处理程序
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      console.log('CallTool request received:', request.params.name);
      
      const { name, arguments: args } = request.params;

      try {
        // 获取工具处理函数
        const handler = ToolRegistry.getHandler(name);
        if (!handler) {
          throw new McpError(
            ErrorCode.InvalidParams,
            `Unknown tool: ${name}`
          );
        }

        // 根据工具名称传递相应的服务依赖
        switch (name) {
          case 'camera_manager':
            return await handler({
              ...args,
              cameraManager: this.cameraManager,
              contextService: this.contextService,
              persistenceManager: this.persistenceManager,
            });
          
          case 'ptz_control':
            return await handler({
              ...args,
              ptzService: this.services.ptz,
            });
          
          case 'preset_manager':
            return await handler({
              ...args,
              presetService: this.services.preset,
            });
          
          // 其他工具的处理将在这里添加
          default:
            return await handler(args);
        }
      } catch (error) {
        console.error(`Error handling tool ${name}:`, error);
        
        if (error instanceof McpError) {
          throw error;
        }
        
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  }

  /**
   * 加载持久化上下文
   */
  private async loadPersistedContexts(): Promise<void> {
    try {
      await this.persistenceManager.loadContexts();
      console.log('Persisted contexts loaded successfully');
    } catch (error) {
      console.error('Failed to load persisted contexts:', error);
    }
  }

  /**
   * 启动服务器
   */
  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    
    console.log('Starting Z CAM MCP Server...');
    
    try {
      await this.server.connect(transport);
      console.log('Z CAM MCP Server started successfully');
    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  /**
   * 停止服务器
   */
  async stop(): Promise<void> {
    console.log('Stopping Z CAM MCP Server...');
    
    try {
      // 清理资源
      this.wsManager.destroy();
      this.httpClient.destroy();
      this.configManager.destroy();
      
      await this.server.close();
      console.log('Z CAM MCP Server stopped successfully');
    } catch (error) {
      console.error('Error stopping server:', error);
    }
  }

  /**
   * 获取服务器状态信息
   */
  getServerStatus(): {
    activeConnections: number;
    connectedCameras: number;
    totalCameras: number;
    wsManagerStats: any;
    configPath: string;
  } {
    return {
      activeConnections: this.wsManager.getActiveConnectionsCount(),
      connectedCameras: this.cameraManager.getConnectedCameras().length,
      totalCameras: this.cameraManager.getAllCameras().length,
      wsManagerStats: this.wsManager.getConnectionStatistics(),
      configPath: this.configManager.getConfigPath(),
    };
  }
}

// 命令行启动逻辑
async function main(): Promise<void> {
  const server = new ZcamMcpServer();
  
  // 优雅关闭处理
  process.on('SIGINT', async () => {
    console.log('Received SIGINT, shutting down gracefully...');
    await server.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('Received SIGTERM, shutting down gracefully...');
    await server.stop();
    process.exit(0);
  });

  await server.start();
}

// 如果直接运行此文件，启动服务器
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { ZcamMcpServer };
