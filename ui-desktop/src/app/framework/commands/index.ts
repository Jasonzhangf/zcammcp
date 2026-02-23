// index.ts
// Command Registry 初始化与命令注册

import { getCommandRegistry } from './CommandRegistry.js';
import { ptzCommands } from './categories/ptzCommands.js';
import { windowCommands } from './categories/windowCommands.js';

export { 
  CommandRegistry, 
  getCommandRegistry, 
  resetCommandRegistry,
  type CommandDefinition,
  type CommandContext,
  type CommandResult,
  type CommandCategory,
  type ParameterDefinition,
} from './CommandRegistry.js';

export { ptzCommands } from './categories/ptzCommands.js';
export { windowCommands } from './categories/windowCommands.js';

/**
 * 初始化命令注册中心
 */
export function initializeCommands(): void {
  const registry = getCommandRegistry();
  
  // 注册窗口命令
  registry.registerAll(windowCommands);
  
  // 注册 PTZ 命令
  registry.registerAll(ptzCommands);
  
  console.log('[CommandRegistry] Initialized with', registry.getAll().length, 'commands');
}

// 自动初始化
initializeCommands();
