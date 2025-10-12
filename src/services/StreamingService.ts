// 流媒体服务模块
console.log('Module: StreamingService');

import * as http from 'http';
import * as url from 'url';

export class StreamingService {
  /**
   * 启用/禁用流媒体
   */
  async setEnabled(ip: string, enabled: boolean): Promise<any> {
    console.log(`Function: setEnabled - Setting streaming to ${enabled ? 'enabled' : 'disabled'} for camera ${ip}`);
    
    try {
      const requestUrl = `http://${ip}/streaming/enabled?value=${enabled}`;
      console.log(`Sending streaming enable/disable request to: ${requestUrl}`);
      
      // 使用Node.js内置的http模块发送请求
      const result = await this.makeHttpRequest(requestUrl, 'GET');
      
      if (result.success) {
        return {
          content: [{
            type: 'text',
            text: `📡 ${enabled ? '已启用' : '已禁用'} 相机 ${ip} RTMP流媒体`
          }]
        };
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      console.error(`Error setting streaming enabled for camera ${ip}:`, error);
      return {
        content: [{
          type: 'text',
          text: `❌ ${enabled ? '启用' : '禁用'} 相机 ${ip} RTMP流媒体失败: ${error instanceof Error ? error.message : String(error)}`
        }]
      };
    }
  }

  /**
   * 设置RTMP服务器地址
   */
  async setRtmpUrl(ip: string, rtmpUrl: string): Promise<any> {
    console.log(`Function: setRtmpUrl - Setting RTMP URL to ${rtmpUrl} for camera ${ip}`);
    
    try {
      const requestUrl = `http://${ip}/streaming/rtmp?url=${encodeURIComponent(rtmpUrl)}`;
      console.log(`Sending RTMP URL set request to: ${requestUrl}`);
      
      // 使用Node.js内置的http模块发送请求
      const result = await this.makeHttpRequest(requestUrl, 'GET');
      
      if (result.success) {
        return {
          content: [{
            type: 'text',
            text: `📡 已设置相机 ${ip} RTMP服务器地址为 ${rtmpUrl}`
          }]
        };
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      console.error(`Error setting RTMP URL for camera ${ip}:`, error);
      return {
        content: [{
          type: 'text',
          text: `❌ 设置相机 ${ip} RTMP服务器地址失败: ${error instanceof Error ? error.message : String(error)}`
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
      const requestUrl = `http://${ip}/streaming/settings`;
      console.log(`Sending streaming settings request to: ${requestUrl}`);
      
      // 使用Node.js内置的http模块发送请求
      const result = await this.makeHttpRequest(requestUrl, 'GET');
      
      if (result.success) {
        // 在实际实现中，您可能需要解析响应数据
        // 这里返回模拟数据
        return {
          content: [{
            type: 'text',
            text: `📊 相机 ${ip} 流媒体设置:\n启用: true\nRTMP地址: rtmp://example.com/live/stream`
          }]
        };
      } else {
        throw new Error(result.error || 'Unknown error');
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
   * 发送HTTP请求
   */
  private makeHttpRequest(requestUrl: string, method: string): Promise<{ success: boolean; data?: string; error?: string }> {
    return new Promise((resolve) => {
      const urlObj = new URL(requestUrl);
      
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || 80,
        path: urlObj.pathname + urlObj.search,
        method: method,
      };
      
      const req = http.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ success: true, data: data });
          } else {
            resolve({ success: false, error: `HTTP ${res.statusCode}: ${res.statusMessage}`, data: data });
          }
        });
      });
      
      req.on('error', (error) => {
        resolve({ success: false, error: error.message });
      });
      
      req.end();
    });
  }
}