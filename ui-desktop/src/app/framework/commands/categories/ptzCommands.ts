// ptzCommands.ts
// PTZ 相关命令定义

import type { CommandDefinition, CommandContext, CommandResult } from '../CommandRegistry.js';

/**
 * PTZ 方向移动命令
 */
export const ptzMoveCommand: CommandDefinition = {
  id: 'ptz.move',
  category: 'ptz',
  description: 'Move PTZ in specified direction',
  parameters: [
    {
      name: 'direction',
      type: 'enum',
      required: true,
      options: ['up', 'down', 'left', 'right', 'up-left', 'up-right', 'down-left', 'down-right'],
      description: 'Movement direction',
    },
    {
      name: 'speed',
      type: 'number',
      required: false,
      default: 50,
      description: 'Movement speed (0-100)',
    },
  ],
  handler: async (ctx: CommandContext): Promise<CommandResult> => {
    const direction = ctx.params.direction as string;
    const speed = (ctx.params.speed as number) ?? 50;
    
    // 调用 PageStore 的 runOperation
    await ctx.store.runOperation(
      'ptz.control',
      'ptz',
      'ptz.move',
      { value: { direction, speed } }
    );
    
    return { success: true, data: { direction, speed } };
  },
};

/**
 * PTZ 停止命令
 */
export const ptzStopCommand: CommandDefinition = {
  id: 'ptz.stop',
  category: 'ptz',
  description: 'Stop PTZ movement',
  handler: async (ctx: CommandContext): Promise<CommandResult> => {
    await ctx.store.runOperation('ptz.control', 'ptz', 'ptz.stop', {});
    return { success: true };
  },
};

/**
 * PTZ Zoom 控制命令
 */
export const ptzZoomCommand: CommandDefinition = {
  id: 'ptz.zoom',
  category: 'ptz',
  description: 'Control PTZ zoom',
  parameters: [
    {
      name: 'action',
      type: 'enum',
      required: true,
      options: ['in', 'out', 'stop', 'set'],
      description: 'Zoom action',
    },
    {
      name: 'value',
      type: 'number',
      required: false,
      description: 'Zoom value for set action',
    },
    {
      name: 'speed',
      type: 'number',
      required: false,
      default: 50,
      description: 'Zoom speed (0-100)',
    },
  ],
  handler: async (ctx: CommandContext): Promise<CommandResult> => {
    const action = ctx.params.action as string;
    const value = ctx.params.value as number | undefined;
    const speed = (ctx.params.speed as number) ?? 50;
    
    await ctx.store.runOperation(
      'ptz.zoom',
      'ptz.zoom',
      'ptz.zoom',
      { value: { action, value, speed } }
    );
    
    return { success: true, data: { action, value, speed } };
  },
};

/**
 * PTZ Focus 控制命令
 */
export const ptzFocusCommand: CommandDefinition = {
  id: 'ptz.focus',
  category: 'ptz',
  description: 'Control PTZ focus',
  parameters: [
    {
      name: 'action',
      type: 'enum',
      required: true,
      options: ['near', 'far', 'stop', 'set', 'auto'],
      description: 'Focus action',
    },
    {
      name: 'value',
      type: 'number',
      required: false,
      description: 'Focus value for set action',
    },
    {
      name: 'speed',
      type: 'number',
      required: false,
      default: 50,
      description: 'Focus speed (0-100)',
    },
  ],
  handler: async (ctx: CommandContext): Promise<CommandResult> => {
    const action = ctx.params.action as string;
    const value = ctx.params.value as number | undefined;
    const speed = (ctx.params.speed as number) ?? 50;
    
    await ctx.store.runOperation(
      'ptz.focus',
      'ptz.focus',
      'ptz.focus',
      { value: { action, value, speed } }
    );
    
    return { success: true, data: { action, value, speed } };
  },
};

/**
 * 获取 PTZ 状态
 */
export const ptzGetStateCommand: CommandDefinition = {
  id: 'ptz.getState',
  category: 'ptz',
  description: 'Get current PTZ state',
  handler: (ctx: CommandContext): CommandResult => {
    const { ptz } = ctx.view.camera;
    return { success: true, data: ptz };
  },
};

/**
 * 导出所有 PTZ 命令
 */
export const ptzCommands: CommandDefinition[] = [
  ptzMoveCommand,
  ptzStopCommand,
  ptzZoomCommand,
  ptzFocusCommand,
  ptzGetStateCommand,
];
