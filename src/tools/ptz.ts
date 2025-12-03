/**
 * PTZ控制工具域
 * PTZ控制功能（移动、变焦、获取状态）
 */

import { PTZService } from '../services/PTZService.js';
import { McpError } from '@modelcontextprotocol/sdk/types.js';
import { ErrorCode } from '@modelcontextprotocol/sdk/types.js';

export interface PTZControlTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: {
      action: {
        type: 'string';
        description: string;
        enum: ['move', 'zoom', 'get_status'];
      };
      ip: {
        type: 'string';
        description: string;
      };
      pan?: {
        type: 'number';
        description: string;
      };
      tilt?: {
        type: 'number';
        description: string;
      };
      zoomValue?: {
        type: 'number';
        description: string;
      };
    };
    required: ['action', 'ip'];
  };
}

export function createPTZControlTool(): PTZControlTool {
  return {
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
  };
}

export async function handlePTZControlTool(
  action: string,
  ip: string,
  pan?: number,
  tilt?: number,
  zoomValue?: number,
  ptzService?: PTZService
): Promise<any> {
  if (!ptzService) {
    return {
      content: [{
        type: 'text',
        text: `❌ PTZ控制失败: PTZService未初始化`
      }]
    };
  }

  console.log(`Handling PTZ control action: ${action} for camera: ${ip}`);

  switch (action) {
    case 'move':
      return await handlePTZMove(ip, pan, tilt, ptzService);
    
    case 'zoom':
      return await handlePTZZoom(ip, zoomValue, ptzService);
    
    case 'get_status':
      return await handleGetPTZStatus(ip, ptzService);
    
    default:
      throw new McpError(
        ErrorCode.InvalidParams,
        `Unknown PTZ action: ${action}`
      );
  }
}

async function handlePTZMove(
  ip: string,
  pan?: number,
  tilt?: number,
  ptzService?: PTZService
): Promise<any> {
  if (!ptzService) {
    return {
      content: [{
        type: 'text',
        text: `❌ PTZ移动失败: PTZService未初始化`
      }]
    };
  }

  console.log(`Function: handlePTZMove - Moving PTZ for camera: ${ip}`);
  
  // 验证参数
  if (pan !== undefined && (pan < -1.0 || pan > 1.0)) {
    return {
      content: [{
        type: 'text',
        text: `❌ PTZ移动失败: 平移值必须在-1.0到1.0之间`
      }]
    };
  }

  if (tilt !== undefined && (tilt < -1.0 || tilt > 1.0)) {
    return {
      content: [{
        type: 'text',
        text: `❌ PTZ移动失败: 俯仰值必须在-1.0到1.0之间`
      }]
    };
  }

  try {
    const result = await ptzService.movePanTilt(ip, pan || 0, tilt || 0);
    
    return {
      content: [{
        type: 'text',
        text: `🎥 已控制相机 ${ip} PTZ移动\nPan: ${pan || 0}\nTilt: ${tilt || 0}`
      }]
    };
  } catch (error) {
    console.error(`Failed to move PTZ for camera ${ip}:`, error);
    return {
      content: [{
        type: 'text',
        text: `❌ 控制相机 ${ip} PTZ移动失败: ${error instanceof Error ? error.message : String(error)}`
      }]
    };
  }
}

async function handlePTZZoom(
  ip: string,
  zoomValue?: number,
  ptzService?: PTZService
): Promise<any> {
  if (!ptzService) {
    return {
      content: [{
        type: 'text',
        text: `❌ PTZ变焦失败: PTZService未初始化`
      }]
    };
  }

  console.log(`Function: handlePTZZoom - Zooming PTZ for camera: ${ip}`);
  
  if (zoomValue === undefined) {
    return {
      content: [{
        type: 'text',
        text: `❌ PTZ变焦失败: 缺少变焦值参数`
      }]
    };
  }

  try {
    const result = await ptzService.zoom(ip, zoomValue);
    
    return {
      content: [{
        type: 'text',
        text: `🔍 已控制相机 ${ip} PTZ变焦\n变焦值: ${zoomValue}`
      }]
    };
  } catch (error) {
    console.error(`Failed to zoom PTZ for camera ${ip}:`, error);
    return {
      content: [{
        type: 'text',
        text: `❌ 控制相机 ${ip} PTZ变焦失败: ${error instanceof Error ? error.message : String(error)}`
      }]
    };
  }
}

async function handleGetPTZStatus(
  ip: string,
  ptzService?: PTZService
): Promise<any> {
  if (!ptzService) {
    return {
      content: [{
        type: 'text',
        text: `❌ 获取PTZ状态失败: PTZService未初始化`
      }]
    };
  }

  console.log(`Function: handleGetPTZStatus - Getting PTZ status for camera: ${ip}`);
  
  try {
    const status = await ptzService.getPTZStatus(ip);
    
    return {
      content: [{
        type: 'text',
        text: `📊 相机 ${ip} PTZ状态:\nPan: ${status.pan || 'N/A'}\nTilt: ${status.tilt || 'N/A'}\nZoom: ${status.zoom || 'N/A'}`
      }]
    };
  } catch (error) {
    console.error(`Failed to get PTZ status for camera ${ip}:`, error);
    return {
      content: [{
        type: 'text',
        text: `❌ 获取相机 ${ip} PTZ状态失败: ${error instanceof Error ? error.message : String(error)}`
      }]
    };
  }
}
