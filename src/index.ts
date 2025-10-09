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

  constructor() {
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
          {
            name: 'validate_zcam_config',
            description: '验证Zcam配置文件的格式和内容',
            inputSchema: {
              type: 'object',
              properties: {
                configPath: {
                  type: 'string',
                  description: '配置文件路径',
                },
              },
              required: ['configPath'],
            },
          },
          {
            name: 'fix_zcam_config',
            description: '修复Zcam配置文件中缺失的字段',
            inputSchema: {
              type: 'object',
              properties: {
                configPath: {
                  type: 'string',
                  description: '配置文件路径',
                },
                version: {
                  type: 'string',
                  description: '版本号 (例如: 1.0.0)',
                  default: '1.0.0',
                },
                enableLogging: {
                  type: 'boolean',
                  description: '是否启用日志',
                  default: true,
                },
                enableCache: {
                  type: 'boolean',
                  description: '是否启用缓存',
                  default: false,
                },
              },
              required: ['configPath'],
            },
          },
          {
            name: 'start_zcam_server',
            description: '启动Zcam服务器',
            inputSchema: {
              type: 'object',
              properties: {
                configPath: {
                  type: 'string',
                  description: '配置文件路径',
                },
                port: {
                  type: 'number',
                  description: '端口号',
                  default: 8080,
                },
              },
              required: ['configPath'],
            },
          },
          {
            name: 'read_file',
            description: '读取文件内容',
            inputSchema: {
              type: 'object',
              properties: {
                path: {
                  type: 'string',
                  description: '文件路径',
                },
              },
              required: ['path'],
            },
          },
          {
            name: 'write_file',
            description: '写入文件内容',
            inputSchema: {
              type: 'object',
              properties: {
                path: {
                  type: 'string',
                  description: '文件路径',
                },
                content: {
                  type: 'string',
                  description: '文件内容',
                },
              },
              required: ['path', 'content'],
            },
          },
          {
            name: 'list_directory',
            description: '列出目录内容',
            inputSchema: {
              type: 'object',
              properties: {
                path: {
                  type: 'string',
                  description: '目录路径',
                },
              },
              required: ['path'],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'validate_zcam_config':
            return await this.validateZcamConfig(args?.configPath as string);
          
          case 'fix_zcam_config':
            return await this.fixZcamConfig(
              args?.configPath as string,
              args?.version as string,
              args?.enableLogging as boolean,
              args?.enableCache as boolean
            );
          
          case 'start_zcam_server':
            return await this.startZcamServer(args?.configPath as string, args?.port as number);
          
          case 'read_file':
            return await this.readFile(args?.path as string);
          
          case 'write_file':
            return await this.writeFile(args?.path as string, args?.content as string);
          
          case 'list_directory':
            return await this.listDirectory(args?.path as string);
          
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

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Zcam MCP Server running on stdio');
  }
}

const server = new ZcamMcpServer();
server.run().catch(console.error);