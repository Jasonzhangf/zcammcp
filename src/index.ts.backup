#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import * as fs from 'fs/promises';
import { CameraManager } from './core/CameraManager.js';
import { ConfigManager } from './core/ConfigManager.js';
import { ContextService } from './services/ContextService.js';
import { PersistenceManager } from './services/PersistenceService.js';
import { WebSocketSubscriptionManager } from './services/WebSocketSubscriptionManager.js';
import { PTZService } from './services/PTZService.js';
import { PresetService } from './services/PresetService.js';
import { ExposureService } from './services/ExposureService.js';
import { WhiteBalanceService } from './services/WhiteBalanceService.js';
import { ImageService } from './services/ImageService.js';
import { AutoFramingService } from './services/AutoFramingService.js';
import { VideoService } from './services/VideoService.js';
import { StreamingService } from './services/StreamingService.js';
import { RecordingService } from './services/RecordingService.js';

const ZcamConfigSchema = z.object({
  server: z.object({
    port: z.number(),
    host: z.string(),
  }),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  features: z.object({
    enableLogging: z.boolean().default(true),
    enableCache: z.boolean().default(false),
    maxConnections: z.number().default(100),
  }),
});

class ZcamMcpServer {
  private server: Server;
  private cameraManager: CameraManager;
  private contextService: ContextService;
  private persistenceManager: PersistenceManager;
  private wsManager: WebSocketSubscriptionManager;
  private ptzService: PTZService;
  private presetService: PresetService;
  private exposureService: ExposureService;
  private whiteBalanceService: WhiteBalanceService;
  private imageService: ImageService;
  private autoFramingService: AutoFramingService;
  private videoService: VideoService;
  private streamingService: StreamingService;
  private recordingService: RecordingService;

  constructor() {
    // 初始化配置管理器和相机管理器
    const configManager = new ConfigManager();
    this.cameraManager = new CameraManager(configManager);
    
    // 初始化WebSocket管理器
    this.wsManager = new WebSocketSubscriptionManager(
      (cameraIp: string, info: any) => {
        this.cameraManager.updateCameraInfo(cameraIp, info);
      }
    );
    
    // 初始化上下文服务
    this.contextService = new ContextService(this.cameraManager);
    
    // 初始化持久化管理器
    this.persistenceManager = new PersistenceManager(
      configManager,
      this.cameraManager,
      this.wsManager
    );
    
    // 初始化PTZ服务
    this.ptzService = new PTZService();
    
    // 初始化预设服务
    this.presetService = new PresetService();
    
    // 初始化曝光服务
    this.exposureService = new ExposureService();
    
    // 初始化白平衡服务
    this.whiteBalanceService = new WhiteBalanceService();
    
    // 初始化图像调整服务
    this.imageService = new ImageService();
    
    // 初始化自动取景服务
    this.autoFramingService = new AutoFramingService();
    
    // 初始化视频设置服务
    this.videoService = new VideoService();
    
    // 初始化流媒体服务
    this.streamingService = new StreamingService();
    
    // 初始化录制服务
    this.recordingService = new RecordingService();
    
    this.server = new Server(
      {
        name: 'zcammcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    
    // 在服务器启动时加载持久化的上下文
    this.loadPersistedContexts();
  }

  private async loadPersistedContexts() {
    try {
      await this.persistenceManager.loadContexts();
      console.log('Persisted contexts loaded successfully');
    } catch (error) {
      console.error('Failed to load persisted contexts:', error);
    }
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          // 相机管理工具
          {
            name: 'camera_manager',
            description: '相机管理功能（添加、状态、上下文、别名、收藏夹等）',
            inputSchema: {
              type: 'object',
              properties: {
                action: {
                  type: 'string',
                  description: '操作类型: add, remove, get_status, switch, update_alias, add_favorite, remove_favorite, get_favorites, get_context',
                  enum: ['add', 'remove', 'get_status', 'switch', 'update_alias', 'add_favorite', 'remove_favorite', 'get_favorites', 'get_context']
                },
                ip: {
                  type: 'string',
                  description: '相机IP地址',
                },
                alias: {
                  type: 'string',
                  description: '相机别名（用于update_alias操作）',
                },
              },
              required: ['action'],
            },
          },
          
          // PTZ控制工具
          {
            name: 'ptz_control',
            description: 'PTZ控制功能（移动、变焦、获取状态）',
            inputSchema: {
              type: 'object',
              properties: {
                action: {
                  type: 'string',
                  description: '操作类型: move, zoom, get_status',
                  enum: ['move', 'zoom', 'get_status']
                },
                ip: {
                  type: 'string',
                  description: '相机IP地址',
                },
                pan: {
                  type: 'number',
                  description: '平移值 (-1.0 到 1.0)',
                },
                tilt: {
                  type: 'number',
                  description: '俯仰值 (-1.0 到 1.0)',
                },
                zoomValue: {
                  type: 'number',
                  description: '变焦值',
                },
              },
              required: ['action', 'ip'],
            },
          },
          
          // 预设管理工具
          {
            name: 'preset_manager',
            description: '预设管理功能（保存、调用、列表）',
            inputSchema: {
              type: 'object',
              properties: {
                action: {
                  type: 'string',
                  description: '操作类型: save, recall, list',
                  enum: ['save', 'recall', 'list']
                },
                ip: {
                  type: 'string',
                  description: '相机IP地址',
                },
                presetId: {
                  type: 'number',
                  description: '预设ID',
                },
                name: {
                  type: 'string',
                  description: '预设名称',
                },
              },
              required: ['action', 'ip'],
            },
          },
          
          // 曝光控制工具
          {
            name: 'exposure_control',
            description: '曝光控制功能（光圈、快门速度、ISO、获取设置）',
            inputSchema: {
              type: 'object',
              properties: {
                action: {
                  type: 'string',
                  description: '操作类型: set_aperture, set_shutter_speed, set_iso, get_settings',
                  enum: ['set_aperture', 'set_shutter_speed', 'set_iso', 'get_settings']
                },
                ip: {
                  type: 'string',
                  description: '相机IP地址',
                },
                aperture: {
                  type: 'number',
                  description: '光圈值',
                },
                shutterSpeed: {
                  type: 'number',
                  description: '快门速度',
                },
                iso: {
                  type: 'number',
                  description: 'ISO值',
                },
              },
              required: ['action', 'ip'],
            },
          },
          
          // 白平衡工具
          {
            name: 'white_balance',
            description: '白平衡功能（模式、色温、获取设置）',
            inputSchema: {
              type: 'object',
              properties: {
                action: {
                  type: 'string',
                  description: '操作类型: set_mode, set_temperature, get_settings',
                  enum: ['set_mode', 'set_temperature', 'get_settings']
                },
                ip: {
                  type: 'string',
                  description: '相机IP地址',
                },
                mode: {
                  type: 'string',
                  description: '白平衡模式',
                },
                temperature: {
                  type: 'number',
                  description: '色温值 (K)',
                },
              },
              required: ['action', 'ip'],
            },
          },
          
          // 图像调整工具
          {
            name: 'image_adjustment',
            description: '图像调整功能（亮度、对比度、饱和度、获取设置）',
            inputSchema: {
              type: 'object',
              properties: {
                action: {
                  type: 'string',
                  description: '操作类型: set_brightness, set_contrast, set_saturation, get_settings',
                  enum: ['set_brightness', 'set_contrast', 'set_saturation', 'get_settings']
                },
                ip: {
                  type: 'string',
                  description: '相机IP地址',
                },
                brightness: {
                  type: 'number',
                  description: '亮度值',
                },
                contrast: {
                  type: 'number',
                  description: '对比度值',
                },
                saturation: {
                  type: 'number',
                  description: '饱和度值',
                },
              },
              required: ['action', 'ip'],
            },
          },
          
          // 自动取景工具
          {
            name: 'auto_framing',
            description: '自动取景功能（启用/禁用、模式、获取设置）',
            inputSchema: {
              type: 'object',
              properties: {
                action: {
                  type: 'string',
                  description: '操作类型: set_enabled, set_mode, get_settings',
                  enum: ['set_enabled', 'set_mode', 'get_settings']
                },
                ip: {
                  type: 'string',
                  description: '相机IP地址',
                },
                enabled: {
                  type: 'boolean',
                  description: '是否启用自动取景',
                },
                mode: {
                  type: 'string',
                  description: '自动取景模式',
                },
              },
              required: ['action', 'ip'],
            },
          },
          
          // 视频设置工具
          {
            name: 'video_settings',
            description: '视频设置功能（分辨率、帧率、编码格式、获取设置）',
            inputSchema: {
              type: 'object',
              properties: {
                action: {
                  type: 'string',
                  description: '操作类型: set_resolution, set_frame_rate, set_codec, get_settings',
                  enum: ['set_resolution', 'set_frame_rate', 'set_codec', 'get_settings']
                },
                ip: {
                  type: 'string',
                  description: '相机IP地址',
                },
                resolution: {
                  type: 'string',
                  description: '视频分辨率',
                },
                frameRate: {
                  type: 'number',
                  description: '帧率 (fps)',
                },
                codec: {
                  type: 'string',
                  description: '视频编码格式',
                },
              },
              required: ['action', 'ip'],
            },
          },
          
          // 流媒体工具
          {
            name: 'streaming_control',
            description: '流媒体功能（启用/禁用、RTMP地址、获取设置）',
            inputSchema: {
              type: 'object',
              properties: {
                action: {
                  type: 'string',
                  description: '操作类型: set_enabled, set_rtmp_url, get_settings',
                  enum: ['set_enabled', 'set_rtmp_url', 'get_settings']
                },
                ip: {
                  type: 'string',
                  description: '相机IP地址',
                },
                enabled: {
                  type: 'boolean',
                  description: '是否启用流媒体',
                },
                url: {
                  type: 'string',
                  description: 'RTMP服务器地址',
                },
              },
              required: ['action', 'ip'],
            },
          },
          
          // 录制控制工具
          {
            name: 'recording_control',
            description: '录制控制功能（开始、停止、格式、获取状态）',
            inputSchema: {
              type: 'object',
              properties: {
                action: {
                  type: 'string',
                  description: '操作类型: start, stop, set_format, get_status',
                  enum: ['start', 'stop', 'set_format', 'get_status']
                },
                ip: {
                  type: 'string',
                  description: '相机IP地址',
                },
                format: {
                  type: 'string',
                  description: '录制格式',
                },
              },
              required: ['action', 'ip'],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          // 相机管理工具
          case 'camera_manager':
            return await this.handleCameraManager(args?.action as string, args?.ip as string, args?.alias as string);
          
          // PTZ控制工具
          case 'ptz_control':
            if (!args || !args.ip) {
              throw new McpError(
                ErrorCode.InvalidParams,
                'Missing required parameter: ip'
              );
            }
            
            switch (args.action) {
              case 'move':
                return await this.ptzService.movePanTilt(
                  args.ip as string, 
                  (args.pan as number) || 0, 
                  (args.tilt as number) || 0
                );
              
              case 'zoom':
                return await this.ptzService.zoom(
                  args.ip as string, 
                  (args.zoomValue as number) || 0
                );
              
              case 'get_status':
                return await this.ptzService.getPTZStatus(args.ip as string);
              
              default:
                throw new McpError(
                  ErrorCode.InvalidParams,
                  `Unknown PTZ action: ${args.action}`
                );
            }
          
          // 预设管理工具
          case 'preset_manager':
            switch (args?.action) {
              case 'save':
                if (!args?.ip || args?.presetId === undefined) {
                  throw new McpError(
                    ErrorCode.InvalidParams,
                    'Missing required parameters: ip and presetId'
                  );
                }
                return await this.presetService.savePreset(
                  args.ip as string,
                  args.presetId as number,
                  (args.name as string) || `预设${args.presetId}`
                );
              
              case 'recall':
                if (!args?.ip || args?.presetId === undefined) {
                  throw new McpError(
                    ErrorCode.InvalidParams,
                    'Missing required parameters: ip and presetId'
                  );
                }
                return await this.presetService.recallPreset(
                  args.ip as string,
                  args.presetId as number
                );
              
              case 'list':
                if (!args?.ip) {
                  throw new McpError(
                    ErrorCode.InvalidParams,
                    'Missing required parameter: ip'
                  );
                }
                return await this.presetService.listPresets(args.ip as string);
              
              default:
                throw new McpError(
                  ErrorCode.InvalidParams,
                  `Unknown preset action: ${args?.action}`
                );
            }
          
          // 曝光控制工具
          case 'exposure_control':
            switch (args?.action) {
              case 'set_aperture':
                if (!args?.ip || args?.aperture === undefined) {
                  throw new McpError(
                    ErrorCode.InvalidParams,
                    'Missing required parameters: ip and aperture'
                  );
                }
                return await this.exposureService.setAperture(
                  args.ip as string,
                  args.aperture as number
                );
              
              case 'set_shutter_speed':
                if (!args?.ip || args?.shutterSpeed === undefined) {
                  throw new McpError(
                    ErrorCode.InvalidParams,
                    'Missing required parameters: ip and shutterSpeed'
                  );
                }
                return await this.exposureService.setShutterSpeed(
                  args.ip as string,
                  args.shutterSpeed as number
                );
              
              case 'set_iso':
                if (!args?.ip || args?.iso === undefined) {
                  throw new McpError(
                    ErrorCode.InvalidParams,
                    'Missing required parameters: ip and iso'
                  );
                }
                return await this.exposureService.setISO(
                  args.ip as string,
                  args.iso as number
                );
              
              case 'get_settings':
                if (!args?.ip) {
                  throw new McpError(
                    ErrorCode.InvalidParams,
                    'Missing required parameter: ip'
                  );
                }
                return await this.exposureService.getExposureSettings(args.ip as string);
              
              default:
                throw new McpError(
                  ErrorCode.InvalidParams,
                  `Unknown exposure action: ${args?.action}`
                );
            }
          
          // 白平衡工具
          case 'white_balance':
            switch (args?.action) {
              case 'set_mode':
                if (!args?.ip || !args?.mode) {
                  throw new McpError(
                    ErrorCode.InvalidParams,
                    'Missing required parameters: ip and mode'
                  );
                }
                return await this.whiteBalanceService.setMode(
                  args.ip as string,
                  args.mode as string
                );
              
              case 'set_temperature':
                if (!args?.ip || args?.temperature === undefined) {
                  throw new McpError(
                    ErrorCode.InvalidParams,
                    'Missing required parameters: ip and temperature'
                  );
                }
                return await this.whiteBalanceService.setTemperature(
                  args.ip as string,
                  args.temperature as number
                );
              
              case 'get_settings':
                if (!args?.ip) {
                  throw new McpError(
                    ErrorCode.InvalidParams,
                    'Missing required parameter: ip'
                  );
                }
                return await this.whiteBalanceService.getWhiteBalanceSettings(args.ip as string);
              
              default:
                throw new McpError(
                  ErrorCode.InvalidParams,
                  `Unknown white balance action: ${args?.action}`
                );
            }
          
          // 图像调整工具
          case 'image_adjustment':
            switch (args?.action) {
              case 'set_brightness':
                if (!args?.ip || args?.brightness === undefined) {
                  throw new McpError(
                    ErrorCode.InvalidParams,
                    'Missing required parameters: ip and brightness'
                  );
                }
                return await this.imageService.setBrightness(
                  args.ip as string,
                  args.brightness as number
                );
              
              case 'set_contrast':
                if (!args?.ip || args?.contrast === undefined) {
                  throw new McpError(
                    ErrorCode.InvalidParams,
                    'Missing required parameters: ip and contrast'
                  );
                }
                return await this.imageService.setContrast(
                  args.ip as string,
                  args.contrast as number
                );
              
              case 'set_saturation':
                if (!args?.ip || args?.saturation === undefined) {
                  throw new McpError(
                    ErrorCode.InvalidParams,
                    'Missing required parameters: ip and saturation'
                  );
                }
                return await this.imageService.setSaturation(
                  args.ip as string,
                  args.saturation as number
                );
              
              case 'get_settings':
                if (!args?.ip) {
                  throw new McpError(
                    ErrorCode.InvalidParams,
                    'Missing required parameter: ip'
                  );
                }
                return await this.imageService.getImageSettings(args.ip as string);
              
              default:
                throw new McpError(
                  ErrorCode.InvalidParams,
                  `Unknown image adjustment action: ${args?.action}`
                );
            }
          
          // 自动取景工具
          case 'auto_framing':
            switch (args?.action) {
              case 'set_enabled':
                if (!args?.ip || args?.enabled === undefined) {
                  throw new McpError(
                    ErrorCode.InvalidParams,
                    'Missing required parameters: ip and enabled'
                  );
                }
                return await this.autoFramingService.setAutoFraming(
                  args.ip as string,
                  args.enabled as boolean
                );
              
              case 'set_mode':
                if (!args?.ip || !args?.mode) {
                  throw new McpError(
                    ErrorCode.InvalidParams,
                    'Missing required parameters: ip and mode'
                  );
                }
                return await this.autoFramingService.setAutoFramingMode(
                  args.ip as string,
                  args.mode as string
                );
              
              case 'get_settings':
                if (!args?.ip) {
                  throw new McpError(
                    ErrorCode.InvalidParams,
                    'Missing required parameter: ip'
                  );
                }
                return await this.autoFramingService.getAutoFramingSettings(args.ip as string);
              
              default:
                throw new McpError(
                  ErrorCode.InvalidParams,
                  `Unknown auto framing action: ${args?.action}`
                );
            }
          
          // 视频设置工具
          case 'video_settings':
            switch (args?.action) {
              case 'set_resolution':
                if (!args?.ip || !args?.resolution) {
                  throw new McpError(
                    ErrorCode.InvalidParams,
                    'Missing required parameters: ip and resolution'
                  );
                }
                return await this.videoService.setResolution(
                  args.ip as string,
                  args.resolution as string
                );
              
              case 'set_frame_rate':
                if (!args?.ip || args?.frameRate === undefined) {
                  throw new McpError(
                    ErrorCode.InvalidParams,
                    'Missing required parameters: ip and frameRate'
                  );
                }
                return await this.videoService.setFrameRate(
                  args.ip as string,
                  args.frameRate as number
                );
              
              case 'set_codec':
                if (!args?.ip || !args?.codec) {
                  throw new McpError(
                    ErrorCode.InvalidParams,
                    'Missing required parameters: ip and codec'
                  );
                }
                return await this.videoService.setCodec(
                  args.ip as string,
                  args.codec as string
                );
              
              case 'get_settings':
                if (!args?.ip) {
                  throw new McpError(
                    ErrorCode.InvalidParams,
                    'Missing required parameter: ip'
                  );
                }
                return await this.videoService.getVideoSettings(args.ip as string);
              
              default:
                throw new McpError(
                  ErrorCode.InvalidParams,
                  `Unknown video settings action: ${args?.action}`
                );
            }
          
          // 流媒体工具
          case 'streaming_control':
            switch (args?.action) {
              case 'set_enabled':
                if (!args?.ip || args?.enabled === undefined) {
                  throw new McpError(
                    ErrorCode.InvalidParams,
                    'Missing required parameters: ip and enabled'
                  );
                }
                return await this.streamingService.setEnabled(
                  args.ip as string,
                  args.enabled as boolean
                );
              
              case 'set_rtmp_url':
                if (!args?.ip || !args?.url) {
                  throw new McpError(
                    ErrorCode.InvalidParams,
                    'Missing required parameters: ip and url'
                  );
                }
                return await this.streamingService.setRtmpUrl(
                  args.ip as string,
                  args.url as string
                );
              
              case 'get_settings':
                if (!args?.ip) {
                  throw new McpError(
                    ErrorCode.InvalidParams,
                    'Missing required parameter: ip'
                  );
                }
                return await this.streamingService.getStreamingSettings(args.ip as string);
              
              default:
                throw new McpError(
                  ErrorCode.InvalidParams,
                  `Unknown streaming action: ${args?.action}`
                );
            }
          
          // 录制控制工具
          case 'recording_control':
            switch (args?.action) {
              case 'start':
                if (!args?.ip) {
                  throw new McpError(
                    ErrorCode.InvalidParams,
                    'Missing required parameter: ip'
                  );
                }
                return await this.recordingService.startRecording(args.ip as string);
              
              case 'stop':
                if (!args?.ip) {
                  throw new McpError(
                    ErrorCode.InvalidParams,
                    'Missing required parameter: ip'
                  );
                }
                return await this.recordingService.stopRecording(args.ip as string);
              
              case 'set_format':
                if (!args?.ip || !args?.format) {
                  throw new McpError(
                    ErrorCode.InvalidParams,
                    'Missing required parameters: ip and format'
                  );
                }
                return await this.recordingService.setRecordingFormat(
                  args.ip as string,
                  args.format as string
                );
              
              case 'get_status':
                if (!args?.ip) {
                  throw new McpError(
                    ErrorCode.InvalidParams,
                    'Missing required parameter: ip'
                  );
                }
                return await this.recordingService.getRecordingStatus(args.ip as string);
              
              default:
                throw new McpError(
                  ErrorCode.InvalidParams,
                  `Unknown recording action: ${args?.action}`
                );
            }
          
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${errorMessage}`
        );
      }
    });
  }

  private async validateZcamConfig(configPath: string) {
    try {
      const configContent = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(configContent);
      
      const result = ZcamConfigSchema.safeParse(config);
      
      return {
        content: [
          {
            type: 'text',
            text: result.success 
              ? '✅ Zcam配置文件验证通过'
              : `❌ Zcam配置文件验证失败:\n${result.error.issues.map(i => `- ${i.path.join('.')}: ${i.message}`).join('\n')}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ 读取配置文件失败: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }

  private async fixZcamConfig(
    configPath: string,
    version: string = '1.0.0',
    enableLogging: boolean = true,
    enableCache: boolean = false
  ) {
    try {
      const configContent = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(configContent);
      
      // 修复缺失的字段
      if (!config.version) {
        config.version = version;
      }
      
      if (!config.features) {
        config.features = {};
      }
      
      if (config.features.enableLogging === undefined) {
        config.features.enableLogging = enableLogging;
      }
      
      if (config.features.enableCache === undefined) {
        config.features.enableCache = enableCache;
      }
      
      if (config.features.maxConnections === undefined) {
        config.features.maxConnections = 100;
      }
      
      // 保存修复后的配置
      await fs.writeFile(configPath, JSON.stringify(config, null, 2));
      
      return {
        content: [
          {
            type: 'text',
            text: `✅ Zcam配置文件已修复并保存到: ${configPath}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ 修复配置文件失败: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }

  private async startZcamServer(configPath: string, port: number = 8080) {
    try {
      return new Promise((resolve) => {
        const { spawn } = require('child_process');
        const childProcess = spawn('node', ['dist/index.js'], {
          stdio: ['pipe', 'pipe', 'pipe'],
          env: {
            ...process.env,
            PORT: port.toString(),
            CONFIG_PATH: configPath,
          },
        });
        
        let stdout = '';
        let stderr = '';
        
        childProcess.stdout?.on('data', (data: Buffer) => {
          stdout += data.toString();
        });
        
        childProcess.stderr?.on('data', (data: Buffer) => {
          stderr += data.toString();
        });
        
        childProcess.on('close', (code: number | null) => {
          resolve({
            content: [
              {
                type: 'text',
                text: `Zcam服务器启动完成\n退出代码: ${code}\n\n标准输出:\n${stdout}\n\n错误输出:\n${stderr}`,
              },
            ],
          });
        });
        
        childProcess.on('error', (error: Error) => {
          resolve({
            content: [
              {
                type: 'text',
                text: `❌ 启动Zcam服务器失败: ${error.message}`,
              },
            ],
          });
        });
      });
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ 启动服务器失败: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }

  private async readFile(path: string) {
    try {
      const content = await fs.readFile(path, 'utf-8');
      return {
        content: [
          {
            type: 'text',
            text: content,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ 读取文件失败: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }

  private async writeFile(path: string, content: string) {
    try {
      await fs.writeFile(path, content, 'utf-8');
      return {
        content: [
          {
            type: 'text',
            text: `✅ 文件已成功写入: ${path}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ 写入文件失败: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }

  private async listDirectory(path: string) {
    try {
      const entries = await fs.readdir(path, { withFileTypes: true });
      const list = entries.map(entry => `${entry.isDirectory() ? '[DIR]' : '[FILE]'} ${entry.name}`).join('\n');
      
      return {
        content: [
          {
            type: 'text',
            text: list,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ 列出目录失败: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }

  private async handleCameraManager(action: string, ip?: string, alias?: string) {
    try {
      switch (action) {
        case 'add':
          if (!ip) {
            return {
              content: [
                {
                  type: 'text',
                  text: '❌ 添加相机失败: 缺少IP地址参数',
                },
              ],
            };
          }
          await this.contextService.addCamera(ip, alias);
          return {
            content: [
              {
                type: 'text',
                text: `✅ 相机 ${ip} 已添加并建立WebSocket连接`,
              },
            ],
          };

        case 'remove':
          if (!ip) {
            return {
              content: [
                {
                  type: 'text',
                  text: '❌ 移除相机失败: 缺少IP地址参数',
                },
              ],
            };
          }
          await this.contextService.removeCamera(ip);
          return {
            content: [
              {
                type: 'text',
                text: `✅ 相机 ${ip} 已移除并断开WebSocket连接`,
              },
            ],
          };

        case 'get_status':
          if (!ip) {
            return {
              content: [
                {
                  type: 'text',
                  text: '❌ 获取相机状态失败: 缺少IP地址参数',
                },
              ],
            };
          }
          const status = await this.cameraManager.getCameraStatus(ip);
          if (!status) {
            return {
              content: [
                {
                  type: 'text',
                  text: `❌ 相机 ${ip} 不存在或未连接`,
                },
              ],
            };
          }
          return {
            content: [
              {
                type: 'text',
                text: `📊 相机 ${ip} 状态:\n名称: ${status.name}\n型号: ${status.model}\n固件: ${status.firmware}\nMAC: ${status.mac}\n序列号: ${status.serialNumber}\n连接状态: ${status.isConnected ? '已连接' : '未连接'}\n录制状态: ${status.recording ? '录制中' : '停止'}\n电池电压: ${status.batteryVoltage || 'N/A'}\n温度: ${status.temperature || 'N/A'}°C`,
              },
            ],
          };

        case 'switch':
          if (!ip) {
            return {
              content: [
                {
                  type: 'text',
                  text: '❌ 切换相机失败: 缺少IP地址参数',
                },
              ],
            };
          }
          const switchResult = this.contextService.switchCamera(ip);
          if (switchResult) {
            return {
              content: [
                {
                  type: 'text',
                  text: `✅ 已切换到相机 ${ip}`,
                },
              ],
            };
          } else {
            return {
              content: [
                {
                  type: 'text',
                  text: `❌ 切换相机失败: 相机 ${ip} 不存在`,
                },
              ],
            };
          }

        case 'update_alias':
          if (!ip || !alias) {
            return {
              content: [
                {
                  type: 'text',
                  text: '❌ 更新相机别名失败: 缺少IP地址或别名参数',
                },
              ],
            };
          }
          const updateResult = await this.contextService.updateCameraAlias(ip, alias);
          if (updateResult) {
            return {
              content: [
                {
                  type: 'text',
                text: `✅ 相机 ${ip} 别名已更新为 ${alias}`,
                },
              ],
            };
          } else {
            return {
              content: [
                {
                  type: 'text',
                  text: `❌ 更新相机别名失败: 相机 ${ip} 不存在`,
                },
              ],
            };
          }

        case 'add_favorite':
          if (!ip) {
            return {
              content: [
                {
                  type: 'text',
                  text: '❌ 添加到收藏夹失败: 缺少IP地址参数',
                },
              ],
            };
          }
          const addFavResult = await this.contextService.addToFavorites(ip);
          if (addFavResult) {
            return {
              content: [
                {
                  type: 'text',
                  text: `✅ 相机 ${ip} 已添加到收藏夹`,
                },
              ],
            };
          } else {
            return {
              content: [
                {
                  type: 'text',
                  text: `❌ 添加到收藏夹失败: 相机 ${ip} 不存在`,
                },
              ],
            };
          }

        case 'remove_favorite':
          if (!ip) {
            return {
              content: [
                {
                  type: 'text',
                  text: '❌ 从收藏夹移除失败: 缺少IP地址参数',
                },
              ],
            };
          }
          const removeFavResult = await this.contextService.removeFromFavorites(ip);
          if (removeFavResult) {
            return {
              content: [
                {
                  type: 'text',
                  text: `✅ 相机 ${ip} 已从收藏夹移除`,
                },
              ],
            };
          } else {
            return {
              content: [
                {
                  type: 'text',
                  text: `❌ 从收藏夹移除失败: 相机 ${ip} 不存在`,
                },
              ],
            };
          }

        case 'get_favorites':
          const favorites = this.contextService.getFavoriteCameras();
          return {
            content: [
              {
                type: 'text',
                text: `🌟 收藏夹中的相机:\n${favorites.length > 0 ? favorites.join('\n') : '暂无收藏相机'}`,
              },
            ],
          };
          
        case 'get_context':
          const context = this.contextService.getCurrentContext();
          return {
            content: [
              {
                type: 'text',
                text: `📋 当前相机上下文:\n当前相机: ${context.currentCamera || '无'}\n已连接相机: ${Array.from(context.cameras.keys()).join(', ') || '无'}`,
              },
            ],
          };

        default:
          return {
            content: [
              {
                type: 'text',
                text: `❌ 未知的相机管理操作: ${action}`,
              },
            ],
          };
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ 相机管理操作失败: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Zcam MCP Server running on stdio');
    
    // 监听退出信号，保存上下文
    process.on('SIGINT', async () => {
      console.log('Received SIGINT, saving contexts...');
      this.persistenceManager.saveContexts();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      console.log('Received SIGTERM, saving contexts...');
      this.persistenceManager.saveContexts();
      process.exit(0);
    });
  }
}

const server = new ZcamMcpServer();
server.run().catch(console.error);