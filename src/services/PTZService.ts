/**
 * 重构的PTZ服务模块
 * 使用共享HTTP客户端，替代重复的HTTP plumbing
 */

import { ZCamHttpClient } from '../core/ZCamHttpClient.js';

export class PTZService {
  private httpClient: ZCamHttpClient;

  constructor(httpClient?: ZCamHttpClient) {
    console.log('PTZService initialized with shared HTTP client');
    this.httpClient = httpClient || new ZCamHttpClient();
  }

  /**
   * 控制相机云台移动
   */
  async movePanTilt(ip: string, pan: number, tilt: number): Promise<any> {
    console.log(`Function: movePanTilt - Moving camera ${ip} pan: ${pan}, tilt: ${tilt}`);
    
    try {
      // 根据常见的PTZ控制格式，发送HTTP请求到相机
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
      
      const requestUrl = this.httpClient.buildPTZUrl(ip, action, { fspeed: speed });
      console.log(`Sending PTZ move request to: ${requestUrl}`);
      
      // 使用共享HTTP客户端
      const response = await this.httpClient.get(requestUrl);
      
      if (response.success) {
        return {
          content: [{
            type: 'text',
            text: `🔄 成功控制相机 ${ip} 云台移动: pan=${pan}, tilt=${tilt}`
          }]
        };
      } else {
        throw new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`);
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
    console.log(`Function: zoom - Zooming camera ${ip} with value: ${zoomValue}`);
    
    try {
      let action = zoomValue > 0 ? 'zoomin' : 'zoomout';
      const speed = Math.min(Math.abs(zoomValue), 9); // 限制速度在1-9范围内
      
      const requestUrl = this.httpClient.buildPTZUrl(ip, action, { fspeed: speed });
      console.log(`Sending PTZ zoom request to: ${requestUrl}`);
      
      // 使用共享HTTP客户端
      const response = await this.httpClient.get(requestUrl);
      
      if (response.success) {
        return {
          content: [{
            type: 'text',
            text: `🔍 成功控制相机 ${ip} 变焦: ${zoomValue}`
          }]
        };
      } else {
        throw new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`);
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
    
    try {
      const requestUrl = this.httpClient.buildPTZUrl(ip, 'query');
      console.log(`Sending PTZ status request to: ${requestUrl}`);
      
      // 使用共享HTTP客户端
      const response = await this.httpClient.get(requestUrl);
      
      if (response.success) {
        // 解析响应数据
        let statusData;
        try {
          statusData = this.httpClient.parseJsonResponse(response);
        } catch (parseError) {
          // 如果解析失败，使用原始数据
          statusData = { raw: response.data };
        }
        
        return {
          content: [{
            type: 'text',
            text: `📊 相机 ${ip} PTZ状态:\nPan: ${statusData.pan || 'N/A'}\nTilt: ${statusData.tilt || 'N/A'}\nZoom: ${statusData.zoom || 'N/A'}`
          }]
        };
      } else {
        throw new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`);
      }
    } catch (error) {
      console.error(`Error getting PTZ status for camera ${ip}:`, error);
      return {
        content: [{
          type: 'text',
          text: `❌ 获取相机 ${ip} PTZ状态失败: ${error instanceof Error ? error.message : String(error)}`
        }]
      };
    }
  }

  /**
   * PTZ停止
   */
  async stopPTZ(ip: string): Promise<any> {
    console.log(`Function: stopPTZ - Stopping PTZ for camera: ${ip}`);
    
    try {
      const requestUrl = this.httpClient.buildPTZUrl(ip, 'stop');
      console.log(`Sending PTZ stop request to: ${requestUrl}`);
      
      // 使用共享HTTP客户端
      const response = await this.httpClient.get(requestUrl);
      
      if (response.success) {
        return {
          content: [{
            type: 'text',
            text: `⏹️ 成功停止相机 ${ip} PTZ移动`
          }]
        };
      } else {
        throw new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`);
      }
    } catch (error) {
      console.error(`Error stopping PTZ for camera ${ip}:`, error);
      return {
        content: [{
          type: 'text',
          text: `❌ 停止相机 ${ip} PTZ失败: ${error instanceof Error ? error.message : String(error)}`
        }]
      };
    }
  }

  /**
   * PTZ归位
   */
  async homePTZ(ip: string): Promise<any> {
    console.log(`Function: homePTZ - Setting PTZ to home for camera: ${ip}`);
    
    try {
      const requestUrl = this.httpClient.buildPTZUrl(ip, 'home');
      console.log(`Sending PTZ home request to: ${requestUrl}`);
      
      // 使用共享HTTP客户端
      const response = await this.httpClient.get(requestUrl);
      
      if (response.success) {
        return {
          content: [{
            type: 'text',
            text: `🏠 成功将相机 ${ip} PTZ归位`
          }]
        };
      } else {
        throw new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`);
      }
    } catch (error) {
      console.error(`Error setting PTZ home for camera ${ip}:`, error);
      return {
        content: [{
          type: 'text',
          text: `❌ 设置相机 ${ip} PTZ归位失败: ${error instanceof Error ? error.message : String(error)}`
        }]
      };
    }
  }

  /**
   * 设置PTZ速度
   */
  async setPTZSpeed(ip: string, speed: number): Promise<any> {
    console.log(`Function: setPTZSpeed - Setting PTZ speed for camera: ${ip} to: ${speed}`);
    
    try {
      if (speed < 0 || speed > 63) {
        throw new Error('PTZ速度必须在0-63之间');
      }
      
      const requestUrl = this.httpClient.buildPTZUrl(ip, 'speed', { speed });
      console.log(`Sending PTZ speed request to: ${requestUrl}`);
      
      // 使用共享HTTP客户端
      const response = await this.httpClient.get(requestUrl);
      
      if (response.success) {
        return {
          content: [{
            type: 'text',
            text: `⚡ 成功设置相机 ${ip} PTZ速度为: ${speed}`
          }]
        };
      } else {
        throw new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`);
      }
    } catch (error) {
      console.error(`Error setting PTZ speed for camera ${ip}:`, error);
      return {
        content: [{
          type: 'text',
          text: `❌ 设置相机 ${ip} PTZ速度失败: ${error instanceof Error ? error.message : String(error)}`
        }]
      };
    }
  }
}