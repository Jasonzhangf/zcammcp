// CommandRegistry.ts
// CLI 命令与 UI 控件的映射注册中心
// 提供统一的命令注册、分发、执行能力

import type { PageStore, ViewState } from '../state/PageStore.js';

export interface CommandContext {
  store: PageStore;
  view: ViewState;
  params: Record<string, unknown>;
}

export interface CommandHandler {
  (ctx: CommandContext): Promise<CommandResult> | CommandResult;
}

export interface CommandResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface CommandDefinition {
  id: string;
  category: string;
  description: string;
  parameters?: ParameterDefinition[];
  handler: CommandHandler;
}

export interface ParameterDefinition {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'enum';
  required?: boolean;
  default?: unknown;
  description?: string;
  options?: string[]; // for enum type
}

export type CommandCategory = 
  | 'window'      // 窗口控制
  | 'ptz'         // PTZ 控制
  | 'exposure'    // 曝光控制
  | 'image'       // 图像控制
  | 'whitebalance' // 白平衡
  | 'device'      // 设备管理
  | 'system';     // 系统命令

/**
 * CommandRegistry - 命令注册中心
 * 
 * 职责：
 * 1. 注册命令定义
 * 2. 命令路由与分发
 * 3. 参数校验
 * 4. 结果格式化
 */
export class CommandRegistry {
  private commands = new Map<string, CommandDefinition>();
  private categories = new Map<CommandCategory, Set<string>>();

  /**
   * 注册命令
   */
  register(def: CommandDefinition): void {
    if (this.commands.has(def.id)) {
      console.warn(`[CommandRegistry] Command ${def.id} already registered, overwriting`);
    }
    this.commands.set(def.id, def);
    
    // 分类索引
    const categorySet = this.categories.get(def.category as CommandCategory) ?? new Set();
    categorySet.add(def.id);
    this.categories.set(def.category as CommandCategory, categorySet);
  }

  /**
   * 批量注册命令
   */
  registerAll(defs: CommandDefinition[]): void {
    for (const def of defs) {
      this.register(def);
    }
  }

  /**
   * 获取命令定义
   */
  get(id: string): CommandDefinition | undefined {
    return this.commands.get(id);
  }

  /**
   * 检查命令是否存在
   */
  has(id: string): boolean {
    return this.commands.has(id);
  }

  /**
   * 获取分类下的所有命令
   */
  getByCategory(category: CommandCategory): CommandDefinition[] {
    const ids = this.categories.get(category);
    if (!ids) return [];
    return Array.from(ids).map(id => this.commands.get(id)!).filter(Boolean);
  }

  /**
   * 获取所有命令列表
   */
  getAll(): CommandDefinition[] {
    return Array.from(this.commands.values());
  }

  /**
   * 获取所有分类
   */
  getCategories(): CommandCategory[] {
    return Array.from(this.categories.keys());
  }

  /**
   * 执行命令
   */
  async execute(id: string, ctx: CommandContext): Promise<CommandResult> {
    const def = this.commands.get(id);
    if (!def) {
      return { success: false, error: `Command not found: ${id}` };
    }

    // 参数校验
    const validation = this.validateParams(def, ctx.params);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    try {
      const result = await def.handler(ctx);
      return result;
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : String(err) 
      };
    }
  }

  /**
   * 参数校验
   */
  private validateParams(
    def: CommandDefinition, 
    params: Record<string, unknown>
  ): { valid: boolean; error?: string } {
    if (!def.parameters) return { valid: true };

    for (const param of def.parameters) {
      const value = params[param.name];
      
      // 检查必填
      if (param.required && (value === undefined || value === null)) {
        return { valid: false, error: `Missing required parameter: ${param.name}` };
      }

      // 有值时检查类型
      if (value !== undefined && value !== null) {
        const typeValid = this.checkType(value, param.type, param.options);
        if (!typeValid) {
          return { 
            valid: false, 
            error: `Invalid type for parameter ${param.name}: expected ${param.type}` 
          };
        }
      }
    }

    return { valid: true };
  }

  private checkType(value: unknown, type: ParameterDefinition['type'], options?: string[]): boolean {
    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !Number.isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'enum':
        return typeof value === 'string' && (options?.includes(value) ?? true);
      default:
        return true;
    }
  }
}

// 全局单例
let globalRegistry: CommandRegistry | null = null;

export function getCommandRegistry(): CommandRegistry {
  if (!globalRegistry) {
    globalRegistry = new CommandRegistry();
  }
  return globalRegistry;
}

export function resetCommandRegistry(): void {
  globalRegistry = null;
}
