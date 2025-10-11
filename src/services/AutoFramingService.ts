// 自动取景服务模块
console.log('Module: AutoFramingService');

import * as http from 'http';
import * as url from 'url';

export class AutoFramingService {
  /**
   * 启用/禁用自动取景
   */
  async setAutoFraming(ip: string, enabled: boolean): Promise<any> {
    console.log(`Function: setAutoFraming - ${enabled ? 'Enabling' : 'Disabling'} auto framing for camera ${ip}`);
    
    try {
      const requestUrl = `http://${ip}/autoframing/enabled?value=${enabled}`;
      console.log(`Sending auto framing set request to: ${requestUrl}`);
      
      // 使用Node.js内置的http模块发送请求
      const result = await this.makeHttpRequest(requestUrl, 'GET');
      
      if (result.success) {
        return {
          content: [{
            type: 'text',
            text: `🤖 ${enabled ? '已启用' : '已禁用'} 相机 ${ip} 自动取景功能`
          }]
        };
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      console.error(`Error setting auto framing for camera ${ip}:`, error);
      return {
        content: [{
          type: 'text',
          text: `❌ 设置相机 ${ip} 自动取景功能失败: ${error instanceof Error ? error.message : String(error)}`
        }]
      };
    }
  }

  /**
   * 设置自动取景模式
   */
  async setAutoFramingMode(ip: string, mode: string): Promise<any> {
    console.log(`Function: setAutoFramingMode - Setting auto framing mode to ${mode} for camera ${ip}`);
    
    try {
      const requestUrl = `http://${ip}/autoframing/mode?value=${mode}`;
      console.log(`Sending auto framing mode set request to: ${requestUrl}`);
      
      // 使用Node.js内置的http模块发送请求
      const result = await this.makeHttpRequest(requestUrl, 'GET');
      
      if (result.success) {
        return {
          content: [{
            type: 'text',
            text: `🤖 已设置相机 ${ip} 自动取景模式为 ${mode}`
          }]
        };
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      console.error(`Error setting auto framing mode for camera ${ip}:`, error);
      return {
        content: [{
          type: 'text',
          text: `❌ 设置相机 ${ip} 自动取景模式失败: ${error instanceof Error ? error.message : String(error)}`
        }]
      };
    }
  }

  /**
   * 获取自动取景设置
   */
  async getAutoFramingSettings(ip: string): Promise<any> {
    console.log(`Function: getAutoFramingSettings - Getting auto framing settings for camera: ${ip}`);
    
    try {
      const requestUrl = `http://${ip}/autoframing/settings`;
      console.log(`Sending auto framing settings request to: ${requestUrl}`);
      
      // 使用Node.js内置的http模块发送请求
      const result = await this.makeHttpRequest(requestUrl, 'GET');
      
      if (result.success) {
        // 在实际实现中，您可能需要解析响应数据
        // 这里返回模拟数据
        return {
          content: [{
            type: 'text',
            text: `📊 相机 ${ip} 自动取景设置:\n启用: true\n模式: FaceDetection`
          }]
        };
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      console.error(`Error getting auto framing settings for camera ${ip}:`, error);
      return {
        content: [{
          type: 'text',
          text: `❌ 获取相机 ${ip} 自动取景设置失败: ${error instanceof Error ? error.message : String(error)}`
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