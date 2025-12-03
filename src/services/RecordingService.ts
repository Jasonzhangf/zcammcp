/**
 * 重构的录制服务模块
 * 使用共享HTTP客户端，替代重复的HTTP plumbing
 */

import { ZCamHttpClient } from '../core/ZCamHttpClient.js';

export class RecordingService {
  private httpClient: ZCamHttpClient;

  constructor(httpClient?: ZCamHttpClient) {
    console.log('RecordingService initialized with shared HTTP client');
    this.httpClient = httpClient || new ZCamHttpClient();
  }

  /**
   * 开始录制
   */
  async startRecording(ip: string): Promise<any> {
    console.log(`Function: startRecording - Starting recording for camera: ${ip}`);
    
    try {
      const requestUrl = this.httpClient.buildRecordingUrl(ip, 'start');
      console.log(`Sending recording start request to: ${requestUrl}`);
      
      // 使用共享HTTP客户端
      const response = await this.httpClient.get(requestUrl);
      
      if (response.success) {
        return {
          content: [{
            type: 'text',
            text: `⏺️ 已开始相机 ${ip} 录制`
          }]
        };
      } else {
        throw new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`);
      }
    } catch (error) {
      console.error(`Error starting recording for camera ${ip}:`, error);
      return {
        content: [{
          type: 'text',
          text: `❌ 开始相机 ${ip} 录制失败: ${error instanceof Error ? error.message : String(error)}`
        }]
      };
    }
  }

  /**
   * 停止录制
   */
  async stopRecording(ip: string): Promise<any> {
    console.log(`Function: stopRecording - Stopping recording for camera: ${ip}`);
    
    try {
      const requestUrl = this.httpClient.buildRecordingUrl(ip, 'stop');
      console.log(`Sending recording stop request to: ${requestUrl}`);
      
      // 使用共享HTTP客户端
      const response = await this.httpClient.get(requestUrl);
      
      if (response.success) {
        return {
          content: [{
            type: 'text',
            text: `⏹️ 已停止相机 ${ip} 录制`
          }]
        };
      } else {
        throw new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`);
      }
    } catch (error) {
      console.error(`Error stopping recording for camera ${ip}:`, error);
      return {
        content: [{
          type: 'text',
          text: `❌ 停止相机 ${ip} 录制失败: ${error instanceof Error ? error.message : String(error)}`
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
      const requestUrl = this.httpClient.buildRecordingUrl(ip, 'query');
      console.log(`Sending recording status request to: ${requestUrl}`);
      
      // 使用共享HTTP客户端
      const response = await this.httpClient.get(requestUrl);
      
      if (response.success) {
        // 解析响应数据
        let recordingData;
        try {
          recordingData = this.httpClient.parseJsonResponse(response);
        } catch (parseError) {
          // 如果解析失败，使用原始数据
          recordingData = { raw: response.data };
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
        throw new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`);
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
   * 暂停录制
   */
  async pauseRecording(ip: string): Promise<any> {
    console.log(`Function: pauseRecording - Pausing recording for camera: ${ip}`);
    
    try {
      const requestUrl = this.httpClient.buildRecordingUrl(ip, 'pause');
      console.log(`Sending recording pause request to: ${requestUrl}`);
      
      // 使用共享HTTP客户端
      const response = await this.httpClient.get(requestUrl);
      
      if (response.success) {
        return {
          content: [{
            type: 'text',
            text: `⏸️ 已暂停相机 ${ip} 录制`
          }]
        };
      } else {
        throw new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`);
      }
    } catch (error) {
      console.error(`Error pausing recording for camera ${ip}:`, error);
      return {
        content: [{
          type: 'text',
          text: `❌ 暂停相机 ${ip} 录制失败: ${error instanceof Error ? error.message : String(error)}`
        }]
      };
    }
  }

  /**
   * 恢复录制
   */
  async resumeRecording(ip: string): Promise<any> {
    console.log(`Function: resumeRecording - Resuming recording for camera: ${ip}`);
    
    try {
      const requestUrl = this.httpClient.buildRecordingUrl(ip, 'resume');
      console.log(`Sending recording resume request to: ${requestUrl}`);
      
      // 使用共享HTTP客户端
      const response = await this.httpClient.get(requestUrl);
      
      if (response.success) {
        return {
          content: [{
            type: 'text',
            text: `▶️ 已恢复相机 ${ip} 录制`
          }]
        };
      } else {
        throw new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`);
      }
    } catch (error) {
      console.error(`Error resuming recording for camera ${ip}:`, error);
      return {
        content: [{
          type: 'text',
          text: `❌ 恢复相机 ${ip} 录制失败: ${error instanceof Error ? error.message : String(error)}`
        }]
      };
    }
  }

  /**
   * 设置录制格式
   */
  async setRecordingFormat(ip: string, format: string): Promise<any> {
    console.log(`Function: setRecordingFormat - Setting recording format for camera: ${ip} to: ${format}`);
    
    try {
      if (!format) {
        throw new Error('录制格式不能为空');
      }
      
      const requestUrl = this.httpClient.buildRecordingUrl(ip, 'set_format', { format });
      console.log(`Sending recording format request to: ${requestUrl}`);
      
      // 使用共享HTTP客户端
      const response = await this.httpClient.get(requestUrl);
      
      if (response.success) {
        return {
          content: [{
            type: 'text',
            text: `⏺️ 已设置相机 ${ip} 录制格式为 ${format}`
          }]
        };
      } else {
        throw new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`);
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
   * 获取录制信息
   */
  async getRecordingInfo(ip: string): Promise<any> {
    console.log(`Function: getRecordingInfo - Getting recording info for camera: ${ip}`);
    
    try {
      const requestUrl = this.httpClient.buildRecordingUrl(ip, 'info');
      console.log(`Sending recording info request to: ${requestUrl}`);
      
      // 使用共享HTTP客户端
      const response = await this.httpClient.get(requestUrl);
      
      if (response.success) {
        // 解析响应数据
        let infoData;
        try {
          infoData = this.httpClient.parseJsonResponse(response);
        } catch (parseError) {
          // 如果解析失败，使用原始数据
          infoData = { raw: response.data };
        }
        
        return {
          content: [{
            type: 'text',
            text: `📁 相机 ${ip} 录制信息:\n${JSON.stringify(infoData, null, 2)}`
          }]
        };
      } else {
        throw new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`);
      }
    } catch (error) {
      console.error(`Error getting recording info for camera ${ip}:`, error);
      return {
        content: [{
          type: 'text',
          text: `❌ 获取相机 ${ip} 录制信息失败: ${error instanceof Error ? error.message : String(error)}`
        }]
      };
    }
  }

  /**
   * 删除录制文件
   */
  async deleteRecording(ip: string, filename: string): Promise<any> {
    console.log(`Function: deleteRecording - Deleting recording file for camera: ${ip}: ${filename}`);
    
    try {
      if (!filename) {
        throw new Error('录制文件名不能为空');
      }
      
      const requestUrl = this.httpClient.buildRecordingUrl(ip, 'delete', { filename });
      console.log(`Sending recording delete request to: ${requestUrl}`);
      
      // 使用共享HTTP客户端
      const response = await this.httpClient.get(requestUrl);
      
      if (response.success) {
        return {
          content: [{
            type: 'text',
            text: `🗑️ 已删除相机 ${ip} 录制文件: ${filename}`
          }]
        };
      } else {
        throw new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`);
      }
    } catch (error) {
      console.error(`Error deleting recording file for camera ${ip}:`, error);
      return {
        content: [{
          type: 'text',
          text: `❌ 删除相机 ${ip} 录制文件失败: ${error instanceof Error ? error.message : String(error)}`
        }]
      };
    }
  }
}