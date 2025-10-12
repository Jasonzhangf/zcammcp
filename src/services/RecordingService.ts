// 录制服务模块
console.log('Module: RecordingService');

import * as http from 'http';
import * as url from 'url';

export class RecordingService {
  /**
   * 开始录制
   */
  async startRecording(ip: string): Promise<any> {
    console.log(`Function: startRecording - Starting recording for camera ${ip}`);
    
    try {
      const requestUrl = `http://${ip}/recording/start`;
      console.log(`Sending recording start request to: ${requestUrl}`);
      
      // 使用Node.js内置的http模块发送请求
      const result = await this.makeHttpRequest(requestUrl, 'GET');
      
      if (result.success) {
        return {
          content: [{
            type: 'text',
            text: `⏺️ 已开始录制相机 ${ip}`
          }]
        };
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      console.error(`Error starting recording for camera ${ip}:`, error);
      return {
        content: [{
          type: 'text',
          text: `❌ 开始录制相机 ${ip} 失败: ${error instanceof Error ? error.message : String(error)}`
        }]
      };
    }
  }

  /**
   * 停止录制
   */
  async stopRecording(ip: string): Promise<any> {
    console.log(`Function: stopRecording - Stopping recording for camera ${ip}`);
    
    try {
      const requestUrl = `http://${ip}/recording/stop`;
      console.log(`Sending recording stop request to: ${requestUrl}`);
      
      // 使用Node.js内置的http模块发送请求
      const result = await this.makeHttpRequest(requestUrl, 'GET');
      
      if (result.success) {
        return {
          content: [{
            type: 'text',
            text: `⏹️ 已停止录制相机 ${ip}`
          }]
        };
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      console.error(`Error stopping recording for camera ${ip}:`, error);
      return {
        content: [{
          type: 'text',
          text: `❌ 停止录制相机 ${ip} 失败: ${error instanceof Error ? error.message : String(error)}`
        }]
      };
    }
  }

  /**
   * 设置录制格式
   */
  async setRecordingFormat(ip: string, format: string): Promise<any> {
    console.log(`Function: setRecordingFormat - Setting recording format to ${format} for camera ${ip}`);
    
    try {
      const requestUrl = `http://${ip}/recording/format?value=${encodeURIComponent(format)}`;
      console.log(`Sending recording format set request to: ${requestUrl}`);
      
      // 使用Node.js内置的http模块发送请求
      const result = await this.makeHttpRequest(requestUrl, 'GET');
      
      if (result.success) {
        return {
          content: [{
            type: 'text',
            text: `⏺️ 已设置相机 ${ip} 录制格式为 ${format}`
          }]
        };
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      console.error(`Error setting recording format for camera ${ip}:`, error);
      return {
        content: [{
          type: 'text',
          text: `❌ 设置相机 ${ip} 录制格式失败: ${error instanceof Error ? error.message : String(error)}`
        }]
      };
    }
  }

  /**
   * 获取录制状态
   */
  async getRecordingStatus(ip: string): Promise<any> {
    console.log(`Function: getRecordingStatus - Getting recording status for camera: ${ip}`);
    
    try {
      const requestUrl = `http://${ip}/recording/status`;
      console.log(`Sending recording status request to: ${requestUrl}`);
      
      // 使用Node.js内置的http模块发送请求
      const result = await this.makeHttpRequest(requestUrl, 'GET');
      
      if (result.success) {
        // 解析响应数据
        let recordingData;
        try {
          recordingData = JSON.parse(result.data || '{}');
        } catch (parseError) {
          // 如果解析失败，使用原始数据
          recordingData = { raw: result.data };
        }
        
        // 格式化录制状态信息
        const status = recordingData.status !== undefined ? recordingData.status : 'N/A';
        const format = recordingData.format !== undefined ? recordingData.format : 'N/A';
        const duration = recordingData.duration !== undefined ? recordingData.duration : '00:00:00';
        
        return {
          content: [{
            type: 'text',
            text: `📊 相机 ${ip} 录制状态:\n状态: ${status}\n格式: ${format}\n时长: ${duration}`
          }]
        };
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      console.error(`Error getting recording status for camera ${ip}:`, error);
      return {
        content: [{
          type: 'text',
          text: `❌ 获取相机 ${ip} 录制状态失败: ${error instanceof Error ? error.message : String(error)}`
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