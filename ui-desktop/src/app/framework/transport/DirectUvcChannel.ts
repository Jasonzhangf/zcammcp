import type { CliChannel as CliChannelInterface, CliRequest, CliResponse } from '../state/PageStore.js';
import { CommandMapper, type UvcRequest } from './CommandMapper.js';

/**
 * DirectUvcChannel - 直接通过Electron IPC发送HTTP请求到UsbCameraService (17988)
 * 
 * 优势:
 * - 绕过CLI Service和CLI进程，减少2个进程
 * - 消除spawn开销，性能更好
 * - 直接HTTP通信，延迟更低
 * 
 * 适用场景:
 * - 生产环境
 * - 需要高性能的实时控制
 */
export class DirectUvcChannel implements CliChannelInterface {
    private electronAPI: {
        sendUvcRequest?: (request: UvcRequest) => Promise<unknown>;
    };

    constructor(options?: { electronAPI?: unknown }) {
        this.electronAPI = (options?.electronAPI || (typeof window !== 'undefined' ? window.electronAPI : undefined)) as {
            sendUvcRequest?: (request: UvcRequest) => Promise<unknown>;
        };
    }

    async send(request: CliRequest): Promise<CliResponse> {
        console.log('[DirectUvcChannel] Sending request:', request);

        // 检查Electron API是否可用
        if (!this.electronAPI?.sendUvcRequest) {
            console.error('[DirectUvcChannel] Electron API not available');
            return {
                id: request.id,
                ok: false,
                error: 'Electron API not available',
            };
        }

        try {
            // 将CLI命令转换为UVC HTTP请求
            const uvcRequest = this.translateToUvcRequest(request);
            console.log('[DirectUvcChannel] Translated to UVC request:', uvcRequest);

            // 通过Electron IPC发送
            const result = await this.electronAPI.sendUvcRequest(uvcRequest);
            console.log('[DirectUvcChannel] Received response:', result);

            // 转换为CLI响应格式
            return this.translateToCliResponse(request.id, result);
        } catch (err) {
            console.error('[DirectUvcChannel] Error:', err);
            return {
                id: request.id,
                ok: false,
                error: err instanceof Error ? err.message : String(err),
            };
        }
    }

    /**
     * 将CLI请求转换为UVC HTTP请求
     */
    private translateToUvcRequest(request: CliRequest): UvcRequest {
        const args = request.args || [];

        if (args.length === 0) {
            throw new Error('Request args are required');
        }

        return CommandMapper.toUvcRequest(args);
    }

    /**
     * 将UVC响应转换为CLI响应格式
     */
    private translateToCliResponse(requestId: string, result: unknown): CliResponse {
        // UVC服务返回的格式通常是 {ok: true, value: ...} 或 JSON字符串
        if (typeof result === 'string') {
            try {
                const parsed = JSON.parse(result);
                return {
                    id: requestId,
                    ok: true,
                    data: parsed,
                };
            } catch {
                return {
                    id: requestId,
                    ok: true,
                    data: result,
                };
            }
        }

        if (typeof result === 'object' && result !== null) {
            const obj = result as Record<string, unknown>;

            // 如果响应包含ok字段，使用它
            if ('ok' in obj) {
                return {
                    id: requestId,
                    ok: Boolean(obj.ok),
                    data: obj,
                    error: obj.ok ? undefined : (obj.error as string),
                };
            }

            // 否则认为成功
            return {
                id: requestId,
                ok: true,
                data: result,
            };
        }

        return {
            id: requestId,
            ok: true,
            data: result,
        };
    }
}
