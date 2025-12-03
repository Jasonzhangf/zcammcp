// CliChannel.ts
// 统一的 CLI 通道接口 + 一个用于测试的 mock 实现

import type { CliChannel as CliChannelInterface, CliRequest, CliResponse } from '../state/PageStore.js';

export class MockCliChannel implements CliChannelInterface {
  async send(request: CliRequest): Promise<CliResponse> {
    // 测试用: 直接返回 ok, 并回显命令
    return {
      id: request.id,
      ok: true,
      data: { echo: request },
    };
  }
}
