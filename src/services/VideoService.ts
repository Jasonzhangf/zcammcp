// 视频设置服务模块
console.log('Module: VideoService');

import * as http from 'http';
import * as url from 'url';

export class VideoService {
  /**
   * 设置视频分辨率
   */
  async setResolution(ip: string, resolution: string): Promise<any> {
    console.log(`Function: setResolution - Setting resolution to ${resolution} for camera ${ip}`);
    
    try {
      const requestUrl = `http://${ip}/video/resolution?value=${resolution}`;
      console.log(`Sending resolution set request to: ${requestUrl}`);
      
      // 使用Node.js内置的http模块发送请求
      const result = await this.makeHttpRequest(requestUrl, 'GET');
      
      if (result.success) {
        return {
          content: [{
            type: 'text',
            text: `📹 已设置相机 ${ip} 视频分辨率为 ${resolution}`
          }]
        };
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      console.error(`Error setting resolution for camera ${ip}:`, error);
      return {
        content: [{
          type: 'text',
          text: `❌ 设置相机 ${ip} 视频分辨率失败: ${error instanceof Error ? error.message : String(error)}`
        }]
      };
    }
  }

  /**
   * 设置帧率
   */
  async setFrameRate(ip: string, frameRate: number): Promise<any> {
    console.log(`Function: setFrameRate - Setting frame rate to ${frameRate} for camera ${ip}`);
    
    try {
      const requestUrl = `http://${ip}/video/framerate?value=${frameRate}`;
      console.log(`Sending frame rate set request to: ${requestUrl}`);
      
      // 使用Node.js内置的http模块发送请求
      const result = await this.makeHttpRequest(requestUrl, 'GET');
      
      if (result.success) {
        return {
          content: [{
            type: 'text',
            text: `📹 已设置相机 ${ip} 帧率为 ${frameRate}fps`
          }]
        };
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      console.error(`Error setting frame rate for camera ${ip}:`, error);
      return {
        content: [{
          type: 'text',
          text: `❌ 设置相机 ${ip} 帧率失败: ${error instanceof Error ? error.message : String(error)}`
        }]
      };
    }
  }

  /**
   * 设置视频编码格式
   */
  async setCodec(ip: string, codec: string): Promise<any> {
    console.log(`Function: setCodec - Setting codec to ${codec} for camera ${ip}`);
    
    try {
      const requestUrl = `http://${ip}/video/codec?value=${codec}`;
      console.log(`Sending codec set request to: ${requestUrl}`);
      
      // 使用Node.js内置的http模块发送请求
      const result = await this.makeHttpRequest(requestUrl, 'GET');
      
      if (result.success) {
        return {
          content: [{
            type: 'text',
            text: `📹 已设置相机 ${ip} 视频编码为 ${codec}`
          }]
        };
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      console.error(`Error setting codec for camera ${ip}:`, error);
      return {
        content: [{
          type: 'text',
          text: `❌ 设置相机 ${ip} 视频编码失败: ${error instanceof Error ? error.message : String(error)}`
        }]
      };
    }
  }

  /**
   * 获取视频设置
   */
  async getVideoSettings(ip: string): Promise<any> {
    console.log(`Function: getVideoSettings - Getting video settings for camera: ${ip}`);
    
    try {
      const requestUrl = `http://${ip}/video/settings`;
      console.log(`Sending video settings request to: ${requestUrl}`);
      
      // 使用Node.js内置的http模块发送请求
      const result = await this.makeHttpRequest(requestUrl, 'GET');
      
      if (result.success) {
        // 在实际实现中，您可能需要解析响应数据
        // 这里返回模拟数据
        return {
          content: [{
            type: 'text',
            text: `📊 相机 ${ip} 视频设置:\n分辨率: 1920x1080\n帧率: 30fps\n编码: H.264`
          }]
        };
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      console.error(`Error getting video settings for camera ${ip}:`, error);
      return {
        content: [{
          type: 'text',
          text: `❌ 获取相机 ${ip} 视频设置失败: ${error instanceof Error ? error.message : String(error)}`
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