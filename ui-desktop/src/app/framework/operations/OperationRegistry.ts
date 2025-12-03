// OperationRegistry.ts
// Operation 注册与分发的简单实现, 不含任何业务逻辑

import type {
  OperationContext,
  OperationPayload,
  OperationResult,
  OperationDefinition,
  OperationRegistry as OperationRegistryInterface,
} from '../state/PageStore.js';

export class OperationRegistry implements OperationRegistryInterface {
  private readonly defs: Map<string, OperationDefinition> = new Map();

  register(def: OperationDefinition): void {
    if (this.defs.has(def.id)) {
      throw new Error(`Operation already registered: ${def.id}`);
    }
    this.defs.set(def.id, def);
  }

  async run(id: string, ctx: OperationContext, payload: OperationPayload): Promise<OperationResult> {
    const def = this.defs.get(id);
    if (!def) {
      throw new Error(`Operation not found: ${id}`);
    }
    return def.handler(ctx, payload);
  }
}
