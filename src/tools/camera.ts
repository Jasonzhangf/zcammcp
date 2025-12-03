/**
 * 相机管理工具域
 * 相机管理功能（添加、状态、上下文、别名、收藏夹等）
 */

import { CameraManager } from '../core/CameraManager.js';
import { ContextService } from '../services/ContextService.js';
import { PersistenceManager } from '../services/PersistenceService.js';
import { McpError } from '@modelcontextprotocol/sdk/types.js';
import { ErrorCode } from '@modelcontextprotocol/sdk/types.js';

export interface CameraManagerTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: {
      action: {
        type: 'string';
        description: string;
        enum: ['add', 'remove', 'get_status', 'switch', 'update_alias', 'add_favorite', 'remove_favorite', 'get_favorites', 'get_context'];
      };
      ip?: {
        type: 'string';
        description: string;
      };
      alias?: {
        type: 'string';
        description: string;
      };
    };
    required: ['action'];
  };
}

export function createCameraManagerTool(): CameraManagerTool {
  return {
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
  };
}

export async function handleCameraManagerTool(
  action: string,
  ip?: string,
  alias?: string,
  cameraManager?: CameraManager,
  contextService?: ContextService,
  persistenceManager?: PersistenceManager
): Promise<any> {
  console.log(`Handling camera_manager action: ${action}`);

  switch (action) {
    case 'add':
      if (!ip) {
        throw new McpError(
          ErrorCode.InvalidParams,
          'Missing required parameter: ip'
        );
      }
      return await handleAddCamera(ip, cameraManager, contextService, persistenceManager);
    
    case 'remove':
      if (!ip) {
        throw new McpError(
          ErrorCode.InvalidParams,
          'Missing required parameter: ip'
        );
      }
      return await handleRemoveCamera(ip, cameraManager, contextService, persistenceManager);
    
    case 'get_status':
      if (!ip) {
        throw new McpError(
          ErrorCode.InvalidParams,
          'Missing required parameter: ip'
        );
      }
      return await handleGetCameraStatus(ip, cameraManager);
    
    case 'switch':
      if (!ip) {
        throw new McpError(
          ErrorCode.InvalidParams,
          'Missing required parameter: ip'
        );
      }
      return await handleSwitchCamera(ip, cameraManager, contextService);
    
    case 'update_alias':
      if (!ip || !alias) {
        throw new McpError(
          ErrorCode.InvalidParams,
          'Missing required parameters: ip and alias'
        );
      }
      return await handleUpdateCameraAlias(ip, alias, cameraManager, contextService, persistenceManager);
    
    case 'add_favorite':
      if (!ip) {
        throw new McpError(
          ErrorCode.InvalidParams,
          'Missing required parameter: ip'
        );
      }
      return await handleAddFavorite(ip, cameraManager, persistenceManager);
    
    case 'remove_favorite':
      if (!ip) {
        throw new McpError(
          ErrorCode.InvalidParams,
          'Missing required parameter: ip'
        );
      }
      return await handleRemoveFavorite(ip, cameraManager, persistenceManager);
    
    case 'get_favorites':
      return await handleGetFavorites(cameraManager, persistenceManager);
    
    case 'get_context':
      if (!ip) {
        throw new McpError(
          ErrorCode.InvalidParams,
          'Missing required parameter: ip'
        );
      }
      return await handleGetContext(ip, cameraManager, contextService);
    
    default:
      throw new McpError(
        ErrorCode.InvalidParams,
        `Unknown camera manager action: ${action}`
      );
  }
}

async function handleAddCamera(
  ip: string,
  cameraManager?: CameraManager,
  contextService?: ContextService,
  persistenceManager?: PersistenceManager
): Promise<any> {
  if (!cameraManager) {
    return {
      content: [{
        type: 'text',
        text: `❌ 添加相机失败: cameraManager未初始化`
      }]
    };
  }

  console.log(`Function: addCamera - Adding camera: ${ip}`);
  
  try {
    await cameraManager.addCamera(ip);
    const cameraInfo = await cameraManager.getCameraStatus(ip);
    
    if (contextService) {
      await contextService.addContext(ip, `Camera_${ip}`);
    }
    
    if (persistenceManager) {
      await persistenceManager.saveContexts();
    }
    
    return {
      content: [{
        type: 'text',
        text: `✅ 成功添加相机 ${ip}
名称: ${cameraInfo?.name || `Camera_${ip}`}
型号: ${cameraInfo?.model || 'Unknown'}
固件: ${cameraInfo?.firmware || 'Unknown'}`
      }]
    };
  } catch (error) {
    console.error(`Failed to add camera ${ip}:`, error);
    return {
      content: [{
        type: 'text',
        text: `❌ 添加相机 ${ip} 失败: ${error instanceof Error ? error.message : String(error)}`
      }]
    };
  }
}

async function handleRemoveCamera(
  ip: string,
  cameraManager?: CameraManager,
  contextService?: ContextService,
  persistenceManager?: PersistenceManager
): Promise<any> {
  if (!cameraManager) {
    return {
      content: [{
        type: 'text',
        text: `❌ 移除相机失败: cameraManager未初始化`
      }]
    };
  }

  console.log(`Function: removeCamera - Removing camera: ${ip}`);
  
  try {
    await cameraManager.removeCamera(ip);
    
    if (contextService) {
      await contextService.removeContext(ip);
    }
    
    if (persistenceManager) {
      await persistenceManager.saveContexts();
    }
    
    return {
      content: [{
        type: 'text',
        text: `✅ 成功移除相机 ${ip}`
      }]
    };
  } catch (error) {
    console.error(`Failed to remove camera ${ip}:`, error);
    return {
      content: [{
        type: 'text',
        text: `❌ 移除相机 ${ip} 失败: ${error instanceof Error ? error.message : String(error)}`
      }]
    };
  }
}

async function handleGetCameraStatus(
  ip: string,
  cameraManager?: CameraManager
): Promise<any> {
  if (!cameraManager) {
    return {
      content: [{
        type: 'text',
        text: `❌ 获取相机状态失败: cameraManager未初始化`
      }]
    };
  }

  console.log(`Function: getCameraStatus - Getting status for camera: ${ip}`);
  
  try {
    const status = await cameraManager.getCameraStatus(ip);
    
    return {
      content: [{
        type: 'text',
        text: `📊 相机 ${ip} 状态:
在线: ${status?.isConnected ? '是' : '否'}
名称: ${status?.name || 'Unknown'}
型号: ${status?.model || 'Unknown'}
固件: ${status?.firmware || 'Unknown'}`
      }]
    };
  } catch (error) {
    console.error(`Failed to get camera status for ${ip}:`, error);
    return {
      content: [{
        type: 'text',
        text: `❌ 获取相机 ${ip} 状态失败: ${error instanceof Error ? error.message : String(error)}`
      }]
    };
  }
}

async function handleSwitchCamera(
  ip: string,
  cameraManager?: CameraManager,
  contextService?: ContextService
): Promise<any> {
  if (!cameraManager || !contextService) {
    return {
      content: [{
        type: 'text',
        text: `❌ 切换相机失败: 管理器未初始化`
      }]
    };
  }

  console.log(`Function: switchCamera - Switching to camera: ${ip}`);
  
  try {
    await cameraManager.addCamera(ip);
    await contextService.switchContext(ip);
    const cameraInfo = await cameraManager.getCameraStatus(ip);
    
    return {
      content: [{
        type: 'text',
        text: `🔄 已切换到相机 ${ip}
名称: ${cameraInfo?.name || `Camera_${ip}`}
型号: ${cameraInfo?.model || 'Unknown'}`
      }]
    };
  } catch (error) {
    console.error(`Failed to switch to camera ${ip}:`, error);
    return {
      content: [{
        type: 'text',
        text: `❌ 切换到相机 ${ip} 失败: ${error instanceof Error ? error.message : String(error)}`
      }]
    };
  }
}

async function handleUpdateCameraAlias(
  ip: string,
  alias: string,
  cameraManager?: CameraManager,
  contextService?: ContextService,
  persistenceManager?: PersistenceManager
): Promise<any> {
  if (!cameraManager || !contextService) {
    return {
      content: [{
        type: 'text',
        text: `❌ 更新相机别名失败: 管理器未初始化`
      }]
    };
  }

  console.log(`Function: updateCameraAlias - Updating alias for camera ${ip}: ${alias}`);
  
  try {
    await cameraManager.updateCameraAlias(ip, alias);
    await contextService.updateContextAlias(ip, alias);
    
    if (persistenceManager) {
      await persistenceManager.saveContexts();
    }
    
    return {
      content: [{
        type: 'text',
        text: `✅ 成功更新相机 ${ip} 别名为: ${alias}`
      }]
    };
  } catch (error) {
    console.error(`Failed to update camera alias for ${ip}:`, error);
    return {
      content: [{
        type: 'text',
        text: `❌ 更新相机 ${ip} 别名失败: ${error instanceof Error ? error.message : String(error)}`
      }]
    };
  }
}

async function handleAddFavorite(
  ip: string,
  cameraManager?: CameraManager,
  persistenceManager?: PersistenceManager
): Promise<any> {
  if (!cameraManager) {
    return {
      content: [{
        type: 'text',
        text: `❌ 添加收藏失败: cameraManager未初始化`
      }]
    };
  }

  console.log(`Function: addFavorite - Adding camera ${ip} to favorites`);
  
  try {
    await cameraManager.addToFavorites(ip);
    
    if (persistenceManager) {
      await persistenceManager.saveContexts();
    }
    
    return {
      content: [{
        type: 'text',
        text: `⭐ 成功将相机 ${ip} 添加到收藏夹`
      }]
    };
  } catch (error) {
    console.error(`Failed to add camera ${ip} to favorites:`, error);
    return {
      content: [{
        type: 'text',
        text: `❌ 添加相机 ${ip} 到收藏夹失败: ${error instanceof Error ? error.message : String(error)}`
      }]
    };
  }
}

async function handleRemoveFavorite(
  ip: string,
  cameraManager?: CameraManager,
  persistenceManager?: PersistenceManager
): Promise<any> {
  if (!cameraManager) {
    return {
      content: [{
        type: 'text',
        text: `❌ 移除收藏失败: cameraManager未初始化`
      }]
    };
  }

  console.log(`Function: removeFavorite - Removing camera ${ip} from favorites`);
  
  try {
    await cameraManager.removeFromFavorites(ip);
    
    if (persistenceManager) {
      await persistenceManager.saveContexts();
    }
    
    return {
      content: [{
        type: 'text',
        text: `🗑️ 成功从收藏夹移除相机 ${ip}`
      }]
    };
  } catch (error) {
    console.error(`Failed to remove camera ${ip} from favorites:`, error);
    return {
      content: [{
        type: 'text',
        text: `❌ 从收藏夹移除相机 ${ip} 失败: ${error instanceof Error ? error.message : String(error)}`
      }]
    };
  }
}

async function handleGetFavorites(
  cameraManager?: CameraManager,
  persistenceManager?: PersistenceManager
): Promise<any> {
  if (!cameraManager) {
    return {
      content: [{
        type: 'text',
        text: `❌ 获取收藏列表失败: cameraManager未初始化`
      }]
    };
  }

  console.log(`Function: getFavorites - Getting favorite cameras`);
  
  try {
    const favorites = cameraManager.getFavoriteCameras();
    
    const favoritesList = favorites.length > 0 
	      ? favorites.map(camera => `• ${camera.ip} (${camera.alias || 'Unknown'})`).join('\n')
      : '暂无收藏的相机';
    
    return {
      content: [{
        type: 'text',
        text: `⭐ 收藏的相机列表:
${favoritesList}`
      }]
    };
  } catch (error) {
    console.error('Failed to get favorite cameras:', error);
    return {
      content: [{
        type: 'text',
        text: `❌ 获取收藏列表失败: ${error instanceof Error ? error.message : String(error)}`
      }]
    };
  }
}

async function handleGetContext(
  ip: string,
  cameraManager?: CameraManager,
  contextService?: ContextService
): Promise<any> {
  if (!cameraManager || !contextService) {
    return {
      content: [{
        type: 'text',
        text: `❌ 获取上下文失败: 管理器未初始化`
      }]
    };
  }

  console.log(`Function: getContext - Getting context for camera: ${ip}`);
  
  try {
    const context = await contextService.getContext(ip);
    
    if (!context) {
      return {
        content: [{
          type: 'text',
          text: `📋 相机 ${ip} 暂无上下文信息`
        }]
      };
    }
    
    return {
      content: [{
        type: 'text',
        text: `📋 相机 ${ip} 上下文:
ID: ${context.id}
别名: ${context.alias}
激活: ${context.isActive ? '是' : '否'}
最后更新: ${context.lastUpdated.toISOString()}`
      }]
    };
  } catch (error) {
    console.error(`Failed to get context for camera ${ip}:`, error);
    return {
      content: [{
        type: 'text',
        text: `❌ 获取相机 ${ip} 上下文失败: ${error instanceof Error ? error.message : String(error)}`
      }]
    };
  }
}
