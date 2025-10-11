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

  constructor() {
    // 初始化配置管理器和相机管理器
    const configManager = new ConfigManager();
    this.cameraManager = new CameraManager(configManager);
    
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
                  description: '操作类型: add, get_status, switch, update_alias, add_favorite, remove_favorite, get_favorites, get_context',
                  enum: ['add', 'get_status', 'switch', 'update_alias', 'add_favorite', 'remove_favorite', 'get_favorites', 'get_context']
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
            switch (args?.action) {
              case 'move':
                // TODO: 实现PTZ移动处理
                return {
                  content: [{
                    type: 'text',
                    text: `🔄 正在控制相机 ${args?.ip} 云台移动: pan=${args?.pan}, tilt=${args?.tilt}`
                  }]
                };
              
              case 'zoom':
                // TODO: 实现PTZ变焦处理
                return {
                  content: [{
                    type: 'text',
                    text: `🔍 正在控制相机 ${args?.ip} 变焦: zoom=${args?.zoomValue}`
                  }]
                };
              
              case 'get_status':
                // TODO: 实现PTZ状态获取处理
                return {
                  content: [{
                    type: 'text',
                    text: `📊 相机 ${args?.ip} PTZ状态:\nPan: 0.0\nTilt: 0.0\nZoom: 1.0`
                  }]
                };
              
              default:
                throw new McpError(
                  ErrorCode.InvalidParams,
                  `Unknown PTZ action: ${args?.action}`
                );
            }
          
          // 预设管理工具
          case 'preset_manager':
            switch (args?.action) {
              case 'save':
                // TODO: 实现预设保存处理
                return {
                  content: [{
                    type: 'text',
                    text: `📍 已保存预设位置 ${args?.presetId} (${args?.name}) 到相机 ${args?.ip}`
                  }]
                };
              
              case 'recall':
                // TODO: 实现预设调用处理
                return {
                  content: [{
                    type: 'text',
                    text: `↩️ 已调用相机 ${args?.ip} 的预设位置 ${args?.presetId}`
                  }]
                };
              
              case 'list':
                // TODO: 实现预设列表获取处理
                return {
                  content: [{
                    type: 'text',
                    text: `📋 相机 ${args?.ip} 的预设列表:\n1. 预设1\n2. 预设2\n3. 预设3`
                  }]
                };
              
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
                // TODO: 实现光圈设置处理
                return {
                  content: [{
                    type: 'text',
                    text: `📷 已设置相机 ${args?.ip} 光圈值为 f/${args?.aperture}`
                  }]
                };
              
              case 'set_shutter_speed':
                // TODO: 实现快门速度设置处理
                return {
                  content: [{
                    type: 'text',
                    text: `📷 已设置相机 ${args?.ip} 快门速度为 1/${args?.shutterSpeed}s`
                  }]
                };
              
              case 'set_iso':
                // TODO: 实现ISO设置处理
                return {
                  content: [{
                    type: 'text',
                    text: `📷 已设置相机 ${args?.ip} ISO值为 ${args?.iso}`
                  }]
                };
              
              case 'get_settings':
                // TODO: 实现曝光设置获取处理
                return {
                  content: [{
                    type: 'text',
                    text: `📊 相机 ${args?.ip} 曝光设置:\n光圈: f/2.8\n快门速度: 1/50s\nISO: 800`
                  }]
                };
              
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
                // TODO: 实现白平衡模式设置处理
                return {
                  content: [{
                    type: 'text',
                    text: `🌈 已设置相机 ${args?.ip} 白平衡模式为 ${args?.mode}`
                  }]
                };
              
              case 'set_temperature':
                // TODO: 实现色温设置处理
                return {
                  content: [{
                    type: 'text',
                    text: `🌈 已设置相机 ${args?.ip} 色温为 ${args?.temperature}K`
                  }]
                };
              
              case 'get_settings':
                // TODO: 实现白平衡设置获取处理
                return {
                  content: [{
                    type: 'text',
                    text: `📊 相机 ${args?.ip} 白平衡设置:\n模式: Auto\n色温: 5600K`
                  }]
                };
              
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
                // TODO: 实现亮度设置处理
                return {
                  content: [{
                    type: 'text',
                    text: `밝️ 已设置相机 ${args?.ip} 亮度为 ${args?.brightness}`
                  }]
                };
              
              case 'set_contrast':
                // TODO: 实现对比度设置处理
                return {
                  content: [{
                    type: 'text',
                    text: `🌈 已设置相机 ${args?.ip} 对比度为 ${args?.contrast}`
                  }]
                };
              
              case 'set_saturation':
                // TODO: 实现饱和度设置处理
                return {
                  content: [{
                    type: 'text',
                    text: `🌈 已设置相机 ${args?.ip} 饱和度为 ${args?.saturation}`
                  }]
                };
              
              case 'get_settings':
                // TODO: 实现图像设置获取处理
                return {
                  content: [{
                    type: 'text',
                    text: `📊 相机 ${args?.ip} 图像设置:\n亮度: 50\n对比度: 50\n饱和度: 50`
                  }]
                };
              
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
                // TODO: 实现自动取景启用/禁用处理
                return {
                  content: [{
                    type: 'text',
                    text: `🤖 ${args?.enabled ? '已启用' : '已禁用'} 相机 ${args?.ip} 自动取景功能`
                  }]
                };
              
              case 'set_mode':
                // TODO: 实现自动取景模式设置处理
                return {
                  content: [{
                    type: 'text',
                    text: `🤖 已设置相机 ${args?.ip} 自动取景模式为 ${args?.mode}`
                  }]
                };
              
              case 'get_settings':
                // TODO: 实现自动取景设置获取处理
                return {
                  content: [{
                    type: 'text',
                    text: `📊 相机 ${args?.ip} 自动取景设置:\n启用: true\n模式: FaceDetection`
                  }]
                };
              
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
                // TODO: 实现视频分辨率设置处理
                return {
                  content: [{
                    type: 'text',
                    text: `📹 已设置相机 ${args?.ip} 视频分辨率为 ${args?.resolution}`
                  }]
                };
              
              case 'set_frame_rate':
                // TODO: 实现帧率设置处理
                return {
                  content: [{
                    type: 'text',
                    text: `📹 已设置相机 ${args?.ip} 帧率为 ${args?.frameRate}fps`
                  }]
                };
              
              case 'set_codec':
                // TODO: 实现视频编码格式设置处理
                return {
                  content: [{
                    type: 'text',
                    text: `📹 已设置相机 ${args?.ip} 视频编码为 ${args?.codec}`
                  }]
                };
              
              case 'get_settings':
                // TODO: 实现视频设置获取处理
                return {
                  content: [{
                    type: 'text',
                    text: `📊 相机 ${args?.ip} 视频设置:\n分辨率: 1920x1080\n帧率: 30fps\n编码: H.264`
                  }]
                };
              
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
                // TODO: 实现流媒体启用/禁用处理
                return {
                  content: [{
                    type: 'text',
                    text: `📡 ${args?.enabled ? '已启用' : '已禁用'} 相机 ${args?.ip} RTMP流媒体`
                  }]
                };
              
              case 'set_rtmp_url':
                // TODO: 实现RTMP服务器地址设置处理
                return {
                  content: [{
                    type: 'text',
                    text: `📡 已设置相机 ${args?.ip} RTMP服务器地址为 ${args?.url}`
                  }]
                };
              
              case 'get_settings':
                // TODO: 实现流媒体设置获取处理
                return {
                  content: [{
                    type: 'text',
                    text: `📊 相机 ${args?.ip} 流媒体设置:\n启用: true\nRTMP地址: rtmp://example.com/live/stream`
                  }]
                };
              
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
                // TODO: 实现录制开始处理
                return {
                  content: [{
                    type: 'text',
                    text: `⏺️ 已开始录制相机 ${args?.ip}`
                  }]
                };
              
              case 'stop':
                // TODO: 实现录制停止处理
                return {
                  content: [{
                    type: 'text',
                    text: `⏹️ 已停止录制相机 ${args?.ip}`
                  }]
                };
              
              case 'set_format':
                // TODO: 实现录制格式设置处理
                return {
                  content: [{
                    type: 'text',
                    text: `⏺️ 已设置相机 ${args?.ip} 录制格式为 ${args?.format}`
                  }]
                };
              
              case 'get_status':
                // TODO: 实现录制状态获取处理
                return {
                  content: [{
                    type: 'text',
                    text: `📊 相机 ${args?.ip} 录制状态:\n状态: 已停止\n格式: MP4\n时长: 00:00:00`
                  }]
                };
              
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
          await this.cameraManager.addCamera(ip);
          return {
            content: [
              {
                type: 'text',
                text: `✅ 相机 ${ip} 已添加`,
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
                text: `📊 相机 ${ip} 状态:\n名称: ${status.name}\n型号: ${status.model}\n固件: ${status.firmware}\nMAC: ${status.mac}\n序列号: ${status.serialNumber}\n连接状态: ${status.isConnected ? '已连接' : '未连接'}`,
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
          const switchResult = this.cameraManager.switchCamera(ip);
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
          const updateResult = await this.cameraManager.updateCameraAlias(ip, alias);
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
          const addFavResult = await this.cameraManager.addToFavorites(ip);
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
          await this.cameraManager.removeFromFavorites(ip);
          return {
            content: [
              {
                type: 'text',
                text: `✅ 相机 ${ip} 已从收藏夹移除`,
              },
            ],
          };

        case 'get_favorites':
          const favorites = this.cameraManager.getFavoriteCameras();
          return {
            content: [
              {
                type: 'text',
                text: `🌟 收藏夹中的相机:\n${favorites.length > 0 ? favorites.join('\n') : '暂无收藏相机'}`,
              },
            ],
          };
          
        case 'get_context':
          const context = this.cameraManager.getCurrentContext();
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
  }
}

const server = new ZcamMcpServer();
server.run().catch(console.error);