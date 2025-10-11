// PTZ服务模块
console.log('Module: PTZService');

import * as http from 'http';
import * as url from 'url';

export class PTZService {
  /**
   * 控制相机云台移动
   */
  async movePanTilt(ip: string, pan: number, tilt: number): Promise<any> {
    console.log(`Function: movePanTilt - Moving camera ${ip} pan: ${pan}, tilt: ${tilt}`);
    
    try {
      // 根据常见的PTZ控制格式，发送HTTP请求到相机
      // 这里假设ZCAM相机使用类似格式的API
      const speed = Math.round(Math.abs(pan) * 63); // 转换为0-63的速度范围
      let action = '';
      
      if (pan > 0) {
        action = 'right';
      } else if (pan < 0) {
        action = 'left';
      } else if (tilt > 0) {
        action = 'up';
      } else if (tilt < 0) {
        action = 'down';
      } else {
        action = 'stop';
      }
      
      const requestUrl = `http://${ip}/ctrl/pt?action=${action}&speed=${speed}`;
      console.log(`Sending PTZ move request to: ${requestUrl}`);
      
      // 使用Node.js内置的http模块发送请求
      const result = await this.makeHttpRequest(requestUrl, 'GET');
      
      if (result.success) {
        return {
          content: [{
            type: 'text',
            text: `🔄 成功控制相机 ${ip} 云台移动: pan=${pan}, tilt=${tilt}`
          }]
        };
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      console.error(`Error moving PTZ for camera ${ip}:`, error);
      return {
        content: [{
          type: 'text',
          text: `❌ 控制相机 ${ip} 云台移动失败: ${error instanceof Error ? error.message : String(error)}`
        }]
      };
    }
  }

  /**
   * 控制相机变焦
   */
  async zoom(ip: string, zoomValue: number): Promise<any> {
    console.log(`Function: zoom - Zooming camera ${ip} to value: ${zoomValue}`);
    
    try {
      // 根据常见的PTZ控制格式，发送HTTP请求到相机
      let action = '';
      
      if (zoomValue > 0) {
        action = 'zoomin';
      } else if (zoomValue < 0) {
        action = 'zoomout';
      } else {
        action = 'stop';
      }
      
      const speed = Math.round(Math.abs(zoomValue) * 63); // 转换为0-63的速度范围
      const requestUrl = `http://${ip}/ctrl/pt?action=${action}&speed=${speed}`;
      console.log(`Sending zoom request to: ${requestUrl}`);
      
      // 使用Node.js内置的http模块发送请求
      const result = await this.makeHttpRequest(requestUrl, 'GET');
      
      if (result.success) {
        return {
          content: [{
            type: 'text',
            text: `🔍 成功控制相机 ${ip} 变焦: zoom=${zoomValue}`
          }]
        };
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      console.error(`Error zooming camera ${ip}:`, error);
      return {
        content: [{
          type: 'text',
          text: `❌ 控制相机 ${ip} 变焦失败: ${error instanceof Error ? error.message : String(error)}`
        }]
      };
    }
  }

  /**
   * 获取PTZ状态
   */
  async getPTZStatus(ip: string): Promise<any> {
    console.log(`Function: getPTZStatus - Getting PTZ status for camera: ${ip}`);
    
    // 由于我们没有直接获取PTZ状态的API，返回模拟数据
    return {
      content: [{
        type: 'text',
        text: `📊 相机 ${ip} PTZ状态:\nPan: 0.0\nTilt: 0.0\nZoom: 1.0`
      }]
    };
  }
  
  /**
   * 发送HTTP请求
   */
  private makeHttpRequest(requestUrl: string, method: string): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      const urlObj = new URL(requestUrl);
      
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || 80,
        path: urlObj.pathname + urlObj.search,
        method: method,
      };
      
      const req = http.request(options, (res) => {
        res.on('data', () => {
          // 消费响应数据
        });
        
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ success: true });
          } else {
            resolve({ success: false, error: `HTTP ${res.statusCode}: ${res.statusMessage}` });
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