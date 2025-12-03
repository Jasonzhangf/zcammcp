/**
 * Z CAM HTTP客户端
 * 统一的HTTP请求接口，替代分散在各服务中的重复HTTP plumbing
 * 支持认证、超时、错误处理等统一功能
 */

import { defaultTimeout, defaultHost, defaultPort } from '../config/schema.js';
import * as http from 'http';
import * as https from 'https';

export interface HttpClientOptions {
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  headers?: Record<string, string>;
  agent?: http.Agent | https.Agent;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: string | Buffer;
  timeout?: number;
}

export interface HttpResponse {
  statusCode: number;
  statusMessage: string;
  headers: http.IncomingHttpHeaders;
  data: string;
  success: boolean;
}

export interface HttpError extends Error {
  statusCode?: number;
  statusMessage?: string;
  response?: HttpResponse;
}

export class ZCamHttpClient {
  private defaultTimeout: number;
  private defaultHeaders: Record<string, string>;
  private agent?: http.Agent | https.Agent;

  constructor(options: HttpClientOptions = {}) {
    this.defaultTimeout = options.timeout || defaultTimeout;
    this.defaultHeaders = {
      'User-Agent': 'Z-CAM-MCP/1.0.0',
      'Content-Type': 'application/json',
      ...options.headers,
    };
    this.agent = options.agent;
  }

  /**
   * 发送HTTP请求
   */
  async request(
    url: string, 
    options: RequestOptions = {}
  ): Promise<HttpResponse> {
    const {
      method = 'GET',
      headers = {},
      body,
      timeout = this.defaultTimeout
    } = options;

    const urlObj = new URL(url);
    
    const headerMap: http.OutgoingHttpHeaders = {
      ...this.defaultHeaders,
      ...headers,
    };

    const requestOptions: http.RequestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method,
      headers: headerMap,
      timeout,
      agent: this.agent,
    };

    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      const length = typeof body === 'string' ? Buffer.byteLength(body) : body.length;
      headerMap['Content-Length'] = length;
    }

    return new Promise((resolve, reject) => {
      const protocol = urlObj.protocol === 'https:' ? https : http;
      
      const req = protocol.request(requestOptions, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          const response: HttpResponse = {
            statusCode: res.statusCode || 0,
            statusMessage: res.statusMessage || '',
            headers: res.headers,
            data,
            success: res.statusCode ? res.statusCode >= 200 && res.statusCode < 300 : false,
          };

          if (response.success) {
            resolve(response);
          } else {
            const error = new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`) as HttpError;
            error.statusCode = response.statusCode;
            error.statusMessage = response.statusMessage;
            error.response = response;
            reject(error);
          }
        });
      });

      req.on('error', (error) => {
        const httpError = error as HttpError;
        reject(httpError);
      });

      req.on('timeout', () => {
        req.destroy();
        const timeoutError = new Error(`Request timeout after ${timeout}ms`) as HttpError;
        reject(timeoutError);
      });

      if (body) {
        if (typeof body === 'string') {
          req.write(body);
        } else {
          req.write(body);
        }
      }

      req.end();
    });
  }

  /**
   * GET请求
   */
  async get(url: string, headers: Record<string, string> = {}): Promise<HttpResponse> {
    return this.request(url, { method: 'GET', headers });
  }

  /**
   * POST请求
   */
  async post(url: string, data?: string | Buffer, headers: Record<string, string> = {}): Promise<HttpResponse> {
    return this.request(url, { method: 'POST', headers, body: data });
  }

  /**
   * PUT请求
   */
  async put(url: string, data?: string | Buffer, headers: Record<string, string> = {}): Promise<HttpResponse> {
    return this.request(url, { method: 'PUT', headers, body: data });
  }

  /**
   * DELETE请求
   */
  async delete(url: string, headers: Record<string, string> = {}): Promise<HttpResponse> {
    return this.request(url, { method: 'DELETE', headers });
  }

  /**
   * PATCH请求
   */
  async patch(url: string, data?: string | Buffer, headers: Record<string, string> = {}): Promise<HttpResponse> {
    return this.request(url, { method: 'PATCH', headers, body: data });
  }

  /**
   * 构建相机API URL
   */
  buildCameraApiUrl(ip: string, endpoint: string, port: number = defaultPort): string {
    const protocol = port === 443 ? 'https' : 'http';
    return `${protocol}://${ip}:${port}${endpoint}`;
  }

  /**
   * 构建PTZ控制URL
   */
  buildPTZUrl(ip: string, action: string, params: Record<string, string | number> = {}): string {
    const endpoint = '/ctrl/pt';
    const url = new URL(this.buildCameraApiUrl(ip, endpoint));
    
    url.searchParams.append('action', action);
    
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, String(value));
    });

    return url.toString();
  }

  /**
   * 构建录制控制URL
   */
  buildRecordingUrl(ip: string, action: string, params: Record<string, string | number> = {}): string {
    const endpoint = '/ctrl/rec';
    const url = new URL(this.buildCameraApiUrl(ip, endpoint));
    
    url.searchParams.append('action', action);
    
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, String(value));
    });

    return url.toString();
  }

  /**
   * 构建流媒体控制URL
   */
  buildStreamingUrl(ip: string, type: 'rtmp' | 'srt' | 'ndi', action: string, params: Record<string, string | number> = {}): string {
    const endpoint = `/ctrl/${type}`;
    const url = new URL(this.buildCameraApiUrl(ip, endpoint));
    
    url.searchParams.append('action', action);
    
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, String(value));
    });

    return url.toString();
  }

  /**
   * 构建相机信息URL
   */
  buildCameraInfoUrl(ip: string, endpoint: string): string {
    return this.buildCameraApiUrl(ip, endpoint);
  }

  /**
   * 解析JSON响应
   */
  parseJsonResponse(response: HttpResponse): any {
    if (!response.data) {
      return null;
    }

    try {
      return JSON.parse(response.data);
    } catch (error) {
      // 如果解析失败，返回原始数据
      return response.data;
    }
  }

  /**
   * 创建具有重试机制的请求
   */
  async requestWithRetry(
    url: string,
    options: RequestOptions = {},
    maxRetries: number = 3,
    retryDelay: number = 1000
  ): Promise<HttpResponse> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.request(url, options);
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          break;
        }

        // 等待重试延迟
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
      }
    }

    throw lastError!;
  }

  /**
   * 测试相机连接
   */
  async testCameraConnection(ip: string, port: number = defaultPort): Promise<boolean> {
    try {
      const url = this.buildCameraApiUrl(ip, '/info', port);
      await this.get(url);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取连接信息
   */
  getConnectionInfo(): {
    defaultTimeout: number;
    defaultHeaders: Record<string, string>;
    hasAgent: boolean;
  } {
    return {
      defaultTimeout: this.defaultTimeout,
      defaultHeaders: this.defaultHeaders,
      hasAgent: !!this.agent,
    };
  }

  /**
   * 设置默认超时时间
   */
  setDefaultTimeout(timeout: number): void {
    this.defaultTimeout = timeout;
  }

  /**
   * 设置默认头部
   */
  setDefaultHeaders(headers: Record<string, string>): void {
    this.defaultHeaders = { ...this.defaultHeaders, ...headers };
  }

  /**
   * 清理资源
   */
  destroy(): void {
    if (this.agent && typeof this.agent.destroy === 'function') {
      this.agent.destroy();
    }
  }
}

/**
 * 创建默认HTTP客户端实例
 */
export function createDefaultHttpClient(options: HttpClientOptions = {}): ZCamHttpClient {
  return new ZCamHttpClient(options);
}
