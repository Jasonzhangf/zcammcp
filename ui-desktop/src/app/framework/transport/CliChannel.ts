// CliChannel.ts
// 统一的 CLI 通道接口 + 一个用于测试的 mock 实现

import type { CliChannel as CliChannelInterface, CliRequest, CliResponse } from '../state/PageStore.js';
import type { MockCameraDevice } from '../../app/mock/MockCameraDevice.js';

export class MockCliChannel implements CliChannelInterface {
  private requests: CliRequest[] = [];
  private device: MockCameraDevice | null;

  constructor(device?: MockCameraDevice) {
    this.device = device ?? null;
  }

  setDevice(device: MockCameraDevice | null): void {
    this.device = device;
  }

  async send(request: CliRequest): Promise<CliResponse> {
    this.requests.push(request);
    if (this.device) {
      await this.device.handleRequest(request);
    }
    return {
      id: request.id,
      ok: true,
      data: { echo: request },
    };
  }

  getRequests(): CliRequest[] {
    return this.requests;
  }
}
