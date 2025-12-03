/**
 * 预设管理工具域
 * 预设管理功能（保存、调用、列表）
 */

import { PresetService } from '../services/PresetService.js';
import { McpError } from '@modelcontextprotocol/sdk/types.js';
import { ErrorCode } from '@modelcontextprotocol/sdk/types.js';

export interface PresetManagerTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: {
      action: {
        type: 'string';
        description: string;
        enum: ['save', 'recall', 'list'];
      };
      ip: {
        type: 'string';
        description: string;
      };
      presetId?: {
        type: 'number';
        description: string;
      };
      name?: {
        type: 'string';
        description: string;
      };
    };
    required: ['action', 'ip'];
  };
}

export function createPresetManagerTool(): PresetManagerTool {
  return {
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
  };
}

export async function handlePresetManagerTool(
  action: string,
  ip: string,
  presetId?: number,
  name?: string,
  presetService?: PresetService
): Promise<any> {
  if (!presetService) {
    return {
      content: [{
        type: 'text',
        text: `❌ 预设管理失败: PresetService未初始化`
      }]
    };
  }

  console.log(`Handling preset manager action: ${action} for camera: ${ip}`);

  switch (action) {
    case 'save':
      return await handleSavePreset(ip, presetId, name, presetService);
    
    case 'recall':
      return await handleRecallPreset(ip, presetId, presetService);
    
    case 'list':
      return await handleListPresets(ip, presetService);
    
    default:
      throw new McpError(
        ErrorCode.InvalidParams,
        `Unknown preset action: ${action}`
      );
  }
}

async function handleSavePreset(
  ip: string,
  presetId?: number,
  name?: string,
  presetService?: PresetService
): Promise<any> {
  if (!presetService) {
    return {
      content: [{
        type: 'text',
        text: `❌ 保存预设失败: PresetService未初始化`
      }]
    };
  }

  console.log(`Function: handleSavePreset - Saving preset for camera: ${ip}`);
  
  if (presetId === undefined) {
    return {
      content: [{
        type: 'text',
        text: `❌ 保存预设失败: 缺少预设ID参数`
      }]
    };
  }

  // 验证预设ID范围
  if (presetId < 1 || presetId > 255) {
    return {
      content: [{
        type: 'text',
        text: `❌ 保存预设失败: 预设ID必须在1-255之间`
      }]
    };
  }

  const presetName = name || `预设${presetId}`;

  try {
    const result = await presetService.savePreset(ip, presetId, presetName);
    
    return {
      content: [{
        type: 'text',
        text: `💾 已保存相机 ${ip} 预设 ${presetId}: ${presetName}`
      }]
    };
  } catch (error) {
    console.error(`Failed to save preset for camera ${ip}:`, error);
    return {
      content: [{
        type: 'text',
        text: `❌ 保存相机 ${ip} 预设失败: ${error instanceof Error ? error.message : String(error)}`
      }]
    };
  }
}

async function handleRecallPreset(
  ip: string,
  presetId?: number,
  presetService?: PresetService
): Promise<any> {
  if (!presetService) {
    return {
      content: [{
        type: 'text',
        text: `❌ 调用预设失败: PresetService未初始化`
      }]
    };
  }

  console.log(`Function: handleRecallPreset - Recalling preset for camera: ${ip}`);
  
  if (presetId === undefined) {
    return {
      content: [{
        type: 'text',
        text: `❌ 调用预设失败: 缺少预设ID参数`
      }]
    };
  }

  // 验证预设ID范围
  if (presetId < 1 || presetId > 255) {
    return {
      content: [{
        type: 'text',
        text: `❌ 调用预设失败: 预设ID必须在1-255之间`
      }]
    };
  }

  try {
    const result = await presetService.recallPreset(ip, presetId);
    
    return {
      content: [{
        type: 'text',
        text: `🎯 已调用相机 ${ip} 预设 ${presetId}`
      }]
    };
  } catch (error) {
    console.error(`Failed to recall preset for camera ${ip}:`, error);
    return {
      content: [{
        type: 'text',
        text: `❌ 调用相机 ${ip} 预设失败: ${error instanceof Error ? error.message : String(error)}`
      }]
    };
  }
}

async function handleListPresets(
  ip: string,
  presetService?: PresetService
): Promise<any> {
  if (!presetService) {
    return {
      content: [{
        type: 'text',
        text: `❌ 列出预设失败: PresetService未初始化`
      }]
    };
  }

  console.log(`Function: handleListPresets - Listing presets for camera: ${ip}`);
  
  try {
    const presets = await presetService.listPresets(ip);
    
    if (presets.length === 0) {
      return {
        content: [{
          type: 'text',
          text: `📋 相机 ${ip} 暂无预设`
        }]
      };
    }

    const presetsList = presets
      .map((preset: any) => `• 预设 ${preset.index}: ${preset.name} (${preset.valid ? '有效' : '无效'})`)
      .join('\n');
    
    return {
      content: [{
        type: 'text',
        text: `📋 相机 ${ip} 预设列表:\n${presetsList}`
      }]
    };
  } catch (error) {
    console.error(`Failed to list presets for camera ${ip}:`, error);
    return {
      content: [{
        type: 'text',
        text: `❌ 获取相机 ${ip} 预设列表失败: ${error instanceof Error ? error.message : String(error)}`
      }]
    };
  }
}
