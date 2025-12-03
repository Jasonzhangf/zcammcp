/**
 * 重构的流媒体服务模块
 * 使用共享HTTP客户端，替代重复的HTTP plumbing
 */

import { ZCamHttpClient } from '../core/ZCamHttpClient.js';

export class StreamingService {
  private httpClient: ZCamHttpClient;

  constructor(httpClient?: ZCamHttpClient) {
    console.log('StreamingService initialized with shared HTTP client');
    this.httpClient = httpClient || new ZCamHttpClient();
  }

  /**
   * 设置RTMP推流
   */
  async setRtmpStreaming(ip: string, enabled: boolean, url?: string, key?: string): Promise<any> {
    console.log(`Function: setRtmpStreaming - Setting RTMP streaming for camera: ${ip}`);
    
    try {
      const requestUrl = this.httpClient.buildStreamingUrl(ip, 'rtmp', enabled ? 'start' : 'stop');
      console.log(`Sending RTMP streaming request to: ${requestUrl}`);
      
      // 使用共享HTTP客户端
      const response = await this.httpClient.get(requestUrl);
      
      if (response.success) {
        return {
          content: [{
            type: 'text',
            text: `${enabled ? '✅' : '⏹️'} 相机 ${ip} RTMP流媒体${enabled ? '已启用' : '已禁用'}`
          }]
        };
      } else {
        throw new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`);
      }
    } catch (error) {
      console.error(`Error setting RTMP streaming for camera ${ip}:`, error);
      return {
        content: [{
          type: 'text',
          text: `❌ 设置相机 ${ip} RTMP流媒体失败: ${error instanceof Error ? error.message : String(error)}`
        }]
      };
    }
  }

  /**
   * 设置流媒体地址
   */
  async setStreamingUrl(ip: string, type: 'rtmp' | 'srt' | 'ndi', url: string): Promise<any> {
    console.log(`Function: setStreamingUrl - Setting streaming URL for camera: ${ip}`);
    
    try {
      if (!url) {
        throw new Error('流媒体地址不能为空');
      }
      
      const requestUrl = this.httpClient.buildStreamingUrl(ip, type, 'set', { url });
      console.log(`Sending streaming URL request to: ${requestUrl}`);
      
      // 使用共享HTTP客户端
      const response = await this.httpClient.get(requestUrl);
      
      if (response.success) {
        return {
          content: [{
            type: 'text',
            text: `🌐 成功设置相机 ${ip} ${type.toUpperCase()}流媒体地址: ${url}`
          }]
        };
      } else {
        throw new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`);
      }
    } catch (error) {
      console.error(`Error setting streaming URL for camera ${ip}:`, error);
      return {
        content: [{
          type: 'text',
          text: `❌ 设置相机 ${ip} ${type.toUpperCase()}流媒体地址失败: ${error instanceof Error ? error.message : String(error)}`
        }]
      };
    }
  }

  /**
   * 获取流媒体设置
   */
  async getStreamingSettings(ip: string): Promise<any> {
    console.log(`Function: getStreamingSettings - Getting streaming settings for camera: ${ip}`);
    
    try {
      const requestUrl = this.httpClient.buildStreamingUrl(ip, 'rtmp', 'query');
      console.log(`Sending streaming settings request to: ${requestUrl}`);
      
      // 使用共享HTTP客户端
      const response = await this.httpClient.get(requestUrl);
      
      if (response.success) {
        // 解析响应数据
        let streamingData;
        try {
          streamingData = this.httpClient.parseJsonResponse(response);
        } catch (parseError) {
          // 如果解析失败，使用原始数据
          streamingData = { raw: response.data };
        }
        
        // 格式化流媒体设置信息
        const enabled = streamingData.enabled !== undefined ? streamingData.enabled : 'N/A';
        const url = streamingData.url !== undefined ? streamingData.url : 'N/A';
        
        return {
          content: [{
            type: 'text',
            text: `📊 相机 ${ip} 流媒体设置:\n启用: ${enabled}\n地址: ${url}`
          }]
        };
      } else {
        throw new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`);
      }
    } catch (error) {
      console.error(`Error getting streaming settings for camera ${ip}:`, error);
      return {
        content: [{
          type: 'text',
          text: `❌ 获取相机 ${ip} 流媒体设置失败: ${error instanceof Error ? error.message : String(error)}`
        }]
      };
    }
  }

  /**
   * 停止所有流媒体
   */
  async stopAllStreaming(ip: string): Promise<any> {
    console.log(`Function: stopAllStreaming - Stopping all streaming for camera: ${ip}`);
    
    try {
      // 停止RTMP
      const rtmpUrl = this.httpClient.buildStreamingUrl(ip, 'rtmp', 'stop');
      const rtmpResponse = await this.httpClient.get(rtmpUrl);
      
      // 停止SRT
      const srtUrl = this.httpClient.buildStreamingUrl(ip, 'srt', 'stop');
      const srtResponse = await this.httpClient.get(srtUrl);
      
      // 停止NDI
      const ndiUrl = this.httpClient.buildStreamingUrl(ip, 'ndi', 'stop');
      const ndiResponse = await this.httpClient.get(ndiUrl);
      
      const results = [];
      if (rtmpResponse.success) results.push('RTMP');
      if (srtResponse.success) results.push('SRT');
      if (ndiResponse.success) results.push('NDI');
      
      if (results.length > 0) {
        return {
          content: [{
            type: 'text',
            text: `⏹️ 成功停止相机 ${ip} 流媒体: ${results.join(', ')}`
          }]
        };
      } else {
        throw new Error('所有流媒体停止失败');
      }
    } catch (error) {
      console.error(`Error stopping all streaming for camera ${ip}:`, error);
      return {
        content: [{
          type: 'text',
          text: `❌ 停止相机 ${ip} 所有流媒体失败: ${error instanceof Error ? error.message : String(error)}`
        }]
      };
    }
  }

  /**
   * 测试流媒体连接
   */
  async testStreamingConnection(ip: string, type: 'rtmp' | 'srt' | 'ndi' = 'rtmp'): Promise<any> {
    console.log(`Function: testStreamingConnection - Testing ${type} streaming connection for camera: ${ip}`);
    
    try {
      // 首先测试基本HTTP连接
      const basicConnection = await this.httpClient.testCameraConnection(ip);
      if (!basicConnection) {
        throw new Error('相机HTTP连接失败');
      }
      
      // 测试流媒体特定端点
      const requestUrl = this.httpClient.buildStreamingUrl(ip, type, 'query');
      const response = await this.httpClient.get(requestUrl);
      
      if (response.success) {
        return {
          content: [{
            type: 'text',
            text: `✅ 相机 ${ip} ${type.toUpperCase()}流媒体连接正常`
          }]
        };
      } else {
        throw new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`);
      }
    } catch (error) {
      console.error(`Error testing streaming connection for camera ${ip}:`, error);
      return {
        content: [{
          type: 'text',
          text: `❌ 相机 ${ip} ${type.toUpperCase()}流媒体连接测试失败: ${error instanceof Error ? error.message : String(error)}`
        }]
      };
    }
  }

  /**
   * 设置流媒体参数
   */
  async setStreamingParameters(
    ip: string, 
    type: 'rtmp' | 'srt' | 'ndi', 
    params: Record<string, string | number>
  ): Promise<any> {
    console.log(`Function: setStreamingParameters - Setting ${type} parameters for camera: ${ip}`);
    
    try {
      const requestUrl = this.httpClient.buildStreamingUrl(ip, type, 'set', params);
      console.log(`Sending streaming parameters request to: ${requestUrl}`);
      
      // 使用共享HTTP客户端
      const response = await this.httpClient.get(requestUrl);
      
      if (response.success) {
        return {
          content: [{
            type: 'text',
            text: `⚙️ 成功设置相机 ${ip} ${type.toUpperCase()}流媒体参数`
          }]
        };
      } else {
        throw new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`);
      }
    } catch (error) {
      console.error(`Error setting streaming parameters for camera ${ip}:`, error);
      return {
        content: [{
          type: 'text',
          text: `❌ 设置相机 ${ip} ${type.toUpperCase()}流媒体参数失败: ${error instanceof Error ? error.message : String(error)}`
        }]
      };
    }
  }
}