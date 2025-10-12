// 曝光服务模块
console.log('Module: ExposureService');

import * as http from 'http';
import * as url from 'url';

export class ExposureService {
  /**
   * 设置光圈值
   */
  async setAperture(ip: string, aperture: number): Promise<any> {
    console.log(`Function: setAperture - Setting aperture to ${aperture} for camera ${ip}`);
    
    try {
      const requestUrl = `http://${ip}/exposure/aperture?value=${aperture}`;
      console.log(`Sending aperture set request to: ${requestUrl}`);
      
      // 使用Node.js内置的http模块发送请求
      const result = await this.makeHttpRequest(requestUrl, 'GET');
      
      if (result.success) {
        return {
          content: [{
            type: 'text',
            text: `📷 成功设置相机 ${ip} 光圈值为 f/${aperture}`
          }]
        };
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      console.error(`Error setting aperture for camera ${ip}:`, error);
      return {
        content: [{
          type: 'text',
          text: `❌ 设置相机 ${ip} 光圈值失败: ${error instanceof Error ? error.message : String(error)}`
        }]
      };
    }
  }

  /**
   * 设置快门速度
   */
  async setShutterSpeed(ip: string, shutterSpeed: number): Promise<any> {
    console.log(`Function: setShutterSpeed - Setting shutter speed to ${shutterSpeed} for camera ${ip}`);
    
    try {
      const requestUrl = `http://${ip}/exposure/shutter?value=${shutterSpeed}`;
      console.log(`Sending shutter speed set request to: ${requestUrl}`);
      
      // 使用Node.js内置的http模块发送请求
      const result = await this.makeHttpRequest(requestUrl, 'GET');
      
      if (result.success) {
        return {
          content: [{
            type: 'text',
            text: `📷 成功设置相机 ${ip} 快门速度为 1/${shutterSpeed}s`
          }]
        };
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      console.error(`Error setting shutter speed for camera ${ip}:`, error);
      return {
        content: [{
          type: 'text',
          text: `❌ 设置相机 ${ip} 快门速度失败: ${error instanceof Error ? error.message : String(error)}`
        }]
      };
    }
  }

  /**
   * 设置ISO值
   */
  async setISO(ip: string, iso: number): Promise<any> {
    console.log(`Function: setISO - Setting ISO to ${iso} for camera ${ip}`);
    
    try {
      const requestUrl = `http://${ip}/exposure/iso?value=${iso}`;
      console.log(`Sending ISO set request to: ${requestUrl}`);
      
      // 使用Node.js内置的http模块发送请求
      const result = await this.makeHttpRequest(requestUrl, 'GET');
      
      if (result.success) {
        return {
          content: [{
            type: 'text',
            text: `📷 成功设置相机 ${ip} ISO值为 ${iso}`
          }]
        };
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      console.error(`Error setting ISO for camera ${ip}:`, error);
      return {
        content: [{
          type: 'text',
          text: `❌ 设置相机 ${ip} ISO值失败: ${error instanceof Error ? error.message : String(error)}`
        }]
      };
    }
  }

  /**
   * 获取曝光设置
   */
  async getExposureSettings(ip: string): Promise<any> {
    console.log(`Function: getExposureSettings - Getting exposure settings for camera: ${ip}`);
    
    try {
      const requestUrl = `http://${ip}/exposure/settings`;
      console.log(`Sending exposure settings request to: ${requestUrl}`);
      
      // 使用Node.js内置的http模块发送请求
      const result = await this.makeHttpRequest(requestUrl, 'GET');
      
      if (result.success) {
        // 解析响应数据
        let exposureData;
        try {
          exposureData = JSON.parse(result.data || '{}');
        } catch (parseError) {
          // 如果解析失败，使用原始数据
          exposureData = { raw: result.data };
        }
        
        // 格式化曝光设置信息
        const aperture = exposureData.aperture !== undefined ? `f/${exposureData.aperture}` : 'N/A';
        const shutter = exposureData.shutter !== undefined ? `1/${exposureData.shutter}s` : 'N/A';
        const iso = exposureData.iso !== undefined ? exposureData.iso : 'N/A';
        
        return {
          content: [{
            type: 'text',
            text: `📊 相机 ${ip} 曝光设置:\n光圈: ${aperture}\n快门速度: ${shutter}\nISO: ${iso}`
          }]
        };
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      console.error(`Error getting exposure settings for camera ${ip}:`, error);
      return {
        content: [{
          type: 'text',
          text: `❌ 获取相机 ${ip} 曝光设置失败: ${error instanceof Error ? error.message : String(error)}`
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