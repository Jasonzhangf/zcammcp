// 图像调整服务模块
console.log('Module: ImageService');

import * as http from 'http';
import * as url from 'url';

export class ImageService {
  /**
   * 设置亮度
   */
  async setBrightness(ip: string, brightness: number): Promise<any> {
    console.log(`Function: setBrightness - Setting brightness to ${brightness} for camera ${ip}`);
    
    try {
      const requestUrl = `http://${ip}/image/brightness?value=${brightness}`;
      console.log(`Sending brightness set request to: ${requestUrl}`);
      
      // 使用Node.js内置的http模块发送请求
      const result = await this.makeHttpRequest(requestUrl, 'GET');
      
      if (result.success) {
        return {
          content: [{
            type: 'text',
            text: `밝️ 成功设置相机 ${ip} 亮度为 ${brightness}`
          }]
        };
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      console.error(`Error setting brightness for camera ${ip}:`, error);
      return {
        content: [{
          type: 'text',
          text: `❌ 设置相机 ${ip} 亮度失败: ${error instanceof Error ? error.message : String(error)}`
        }]
        };
    }
  }

  /**
   * 设置对比度
   */
  async setContrast(ip: string, contrast: number): Promise<any> {
    console.log(`Function: setContrast - Setting contrast to ${contrast} for camera ${ip}`);
    
    try {
      const requestUrl = `http://${ip}/image/contrast?value=${contrast}`;
      console.log(`Sending contrast set request to: ${requestUrl}`);
      
      // 使用Node.js内置的http模块发送请求
      const result = await this.makeHttpRequest(requestUrl, 'GET');
      
      if (result.success) {
        return {
          content: [{
            type: 'text',
            text: `🌈 成功设置相机 ${ip} 对比度为 ${contrast}`
          }]
        };
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      console.error(`Error setting contrast for camera ${ip}:`, error);
      return {
        content: [{
          type: 'text',
          text: `❌ 设置相机 ${ip} 对比度失败: ${error instanceof Error ? error.message : String(error)}`
        }]
      };
    }
  }

  /**
   * 设置饱和度
   */
  async setSaturation(ip: string, saturation: number): Promise<any> {
    console.log(`Function: setSaturation - Setting saturation to ${saturation} for camera ${ip}`);
    
    try {
      const requestUrl = `http://${ip}/image/saturation?value=${saturation}`;
      console.log(`Sending saturation set request to: ${requestUrl}`);
      
      // 使用Node.js内置的http模块发送请求
      const result = await this.makeHttpRequest(requestUrl, 'GET');
      
      if (result.success) {
        return {
          content: [{
            type: 'text',
            text: `🌈 成功设置相机 ${ip} 饱和度为 ${saturation}`
          }]
        };
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      console.error(`Error setting saturation for camera ${ip}:`, error);
      return {
        content: [{
          type: 'text',
          text: `❌ 设置相机 ${ip} 饱和度失败: ${error instanceof Error ? error.message : String(error)}`
        }]
      };
    }
  }

  /**
   * 获取图像设置
   */
  async getImageSettings(ip: string): Promise<any> {
    console.log(`Function: getImageSettings - Getting image settings for camera: ${ip}`);
    
    try {
      const requestUrl = `http://${ip}/image/settings`;
      console.log(`Sending image settings request to: ${requestUrl}`);
      
      // 使用Node.js内置的http模块发送请求
      const result = await this.makeHttpRequest(requestUrl, 'GET');
      
      if (result.success) {
        // 在实际实现中，您可能需要解析响应数据
        // 这里返回模拟数据
        return {
          content: [{
            type: 'text',
            text: `📊 相机 ${ip} 图像设置:\n亮度: 50\n对比度: 50\n饱和度: 50`
          }]
        };
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      console.error(`Error getting image settings for camera ${ip}:`, error);
      return {
        content: [{
          type: 'text',
          text: `❌ 获取相机 ${ip} 图像设置失败: ${error instanceof Error ? error.message : String(error)}`
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