// windowCommands.ts
// 窗口控制命令

import type { CommandDefinition, CommandContext, CommandResult } from '../CommandRegistry.js';

export const windowShrinkCommand: CommandDefinition = {
  id: 'window.shrink',
  category: 'window',
  description: 'Shrink main window to ball',
  handler: async (ctx: CommandContext): Promise<CommandResult> => {
    await ctx.store.updateUiState({ layoutMode: 'ball' });
    return { success: true };
  },
};

export const windowRestoreCommand: CommandDefinition = {
  id: 'window.restore',
  category: 'window',
  description: 'Restore window from ball',
  handler: async (ctx: CommandContext): Promise<CommandResult> => {
    await ctx.store.updateUiState({ layoutMode: 'full' });
    return { success: true };
  },
};

export const windowGetStateCommand: CommandDefinition = {
  id: 'window.getState',
  category: 'window',
  description: 'Get window state',
  handler: (ctx: CommandContext): CommandResult => {
    return { 
      success: true, 
      data: {
        layoutMode: ctx.view.ui.layoutMode,
        windowMode: ctx.view.ui.layoutMode === 'ball' ? 'ball' : 'main',
      }
    };
  },
};

export const windowCommands: CommandDefinition[] = [
  windowShrinkCommand,
  windowRestoreCommand,
  windowGetStateCommand,
];
