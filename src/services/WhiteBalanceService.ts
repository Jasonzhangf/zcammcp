// 白平衡服务模块
console.log('Module: WhiteBalanceService');

import * as http from 'http';
import * as url from 'url';

export class WhiteBalanceService {
  /**
   * 设置白平衡模式
   */
  async setMode(ip: string, mode: string): Promise<any> {
    console.log(`Function: setMode - Setting white balance mode to ${mode} for camera ${ip}`);
    
    try {
      const requestUrl = `http://${ip}/whitebalance/mode?value=${mode}`;
      console.log(`Sending white balance mode set request to: ${requestUrl}`);
      
      // 使用Node.js内置的http模块发送请求
      const result = await this.makeHttpRequest(requestUrl, 'GET');
      
      if (result.success) {
        return {
          content: [{
            type: 'text',
            text: `🌈 成功设置相机 ${ip} 白平衡模式为 ${mode}`
          }]
        };
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      console.error(`Error setting white balance mode for camera ${ip}:`, error);
      return {
        content: [{
          type: 'text',
          text: `❌ 设置相机 ${ip} 白平衡模式失败: ${error instanceof Error ? error.message : String(error)}`
        }]
      };
    }
  }

  /**
   * 设置色温
   */
  async setTemperature(ip: string, temperature: number): Promise<any> {
    console.log(`Function: setTemperature - Setting white balance temperature to ${temperature}K for camera ${ip}`);
    
    try {
      const requestUrl = `http://${ip}/whitebalance/temperature?value=${temperature}`;
      console.log(`Sending white balance temperature set request to: ${requestUrl}`);
      
      // 使用Node.js内置的http模块发送请求
      const result = await this.makeHttpRequest(requestUrl, 'GET');
      
      if (result.success) {
        return {
          content: [{
            type: 'text',
            text: `🌈 成功设置相机 ${ip} 色温为 ${temperature}K`
          }]
        };
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      console.error(`Error setting white balance temperature for camera ${ip}:`, error);
      return {
        content: [{
          type: 'text',
          text: `❌ 设置相机 ${ip} 色温失败: ${error instanceof Error ? error.message : String(error)}`
        }]
      };
    }
  }

  /**
   * 获取白平衡设置
   */
  async getWhiteBalanceSettings(ip: string): Promise<any> {
    console.log(`Function: getWhiteBalanceSettings - Getting white balance settings for camera: ${ip}`);
    
    try {
      const requestUrl = `http://${ip}/whitebalance/settings`;
      console.log(`Sending white balance settings request to: ${requestUrl}`);
      
      // 使用Node.js内置的http模块发送请求
      const result = await this.makeHttpRequest(requestUrl, 'GET');
      
      if (result.success) {
        // 解析响应数据
        let whiteBalanceData;
        try {
          whiteBalanceData = JSON.parse(result.data || '{}');
        } catch (parseError) {
          // 如果解析失败，使用原始数据
          whiteBalanceData = { raw: result.data };
        }
        
        // 格式化白平衡设置信息
        const mode = whiteBalanceData.mode !== undefined ? whiteBalanceData.mode : 'N/A';
        const temperature = whiteBalanceData.temperature !== undefined ? `${whiteBalanceData.temperature}K` : 'N/A';
        
        return {
          content: [{
            type: 'text',
            text: `📊 相机 ${ip} 白平衡设置:\n模式: ${mode}\n色温: ${temperature}`
          }]
        };
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      console.error(`Error getting white balance settings for camera ${ip}:`, error);
      return {
        content: [{
          type: 'text',
          text: `❌ 获取相机 ${ip} 白平衡设置失败: ${error instanceof Error ? error.message : String(error)}`
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