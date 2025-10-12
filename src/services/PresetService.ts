// 预设服务模块
console.log('Module: PresetService');

import * as http from 'http';
import * as https from 'https';
import * as url from 'url';

export class PresetService {
  /**
   * 保存预设位置
   */
  async savePreset(ip: string, presetId: number, name: string): Promise<any> {
    console.log(`Function: savePreset - Saving preset ${presetId} for camera ${ip} with name: ${name}`);
    
    try {
      const requestUrl = `http://${ip}/preset/set?id=${presetId}`;
      console.log(`Sending preset save request to: ${requestUrl}`);
      
      // 使用Node.js内置的http模块发送请求
      const result = await this.makeHttpRequest(requestUrl, 'GET');
      
      if (result.success) {
        return {
          content: [{
            type: 'text',
            text: `📍 已保存预设位置 ${presetId} (${name}) 到相机 ${ip}`
          }]
        };
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      console.error(`Error saving preset for camera ${ip}:`, error);
      return {
        content: [{
          type: 'text',
          text: `❌ 保存预设位置 ${presetId} 到相机 ${ip} 失败: ${error instanceof Error ? error.message : String(error)}`
        }]
      };
    }
  }

  /**
   * 调用预设位置
   */
  async recallPreset(ip: string, presetId: number): Promise<any> {
    console.log(`Function: recallPreset - Recalling preset ${presetId} for camera ${ip}`);
    
    try {
      const requestUrl = `http://${ip}/preset/goto?id=${presetId}`;
      console.log(`Sending preset recall request to: ${requestUrl}`);
      
      // 使用Node.js内置的http模块发送请求
      const result = await this.makeHttpRequest(requestUrl, 'GET');
      
      if (result.success) {
        return {
          content: [{
            type: 'text',
            text: `↩️ 已调用相机 ${ip} 的预设位置 ${presetId}`
          }]
        };
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      console.error(`Error recalling preset for camera ${ip}:`, error);
      return {
        content: [{
          type: 'text',
          text: `❌ 调用相机 ${ip} 的预设位置 ${presetId} 失败: ${error instanceof Error ? error.message : String(error)}`
        }]
      };
    }
  }

  /**
   * 获取预设列表
   */
  async listPresets(ip: string): Promise<any> {
    console.log(`Function: listPresets - Listing presets for camera: ${ip}`);
    
    try {
      const requestUrl = `http://${ip}/preset/list`;
      console.log(`Sending preset list request to: ${requestUrl}`);
      
      // 使用Node.js内置的http模块发送请求
      const result = await this.makeHttpRequest(requestUrl, 'GET');
      
      if (result.success) {
        // 解析响应数据
        let presetData;
        try {
          presetData = JSON.parse(result.data || '[]');
        } catch (parseError) {
          // 如果解析失败，使用原始数据
          presetData = result.data;
        }
        
        // 格式化预设列表
        let presetList = '📋 相机 ' + ip + ' 的预设列表:\n';
        if (Array.isArray(presetData)) {
          if (presetData.length === 0) {
            presetList += '无预设';
          } else {
            presetData.forEach((preset: any, index: number) => {
              const id = preset.id || index;
              const name = preset.name || `预设${id}`;
              presetList += `${id}. ${name}\n`;
            });
          }
        } else {
          presetList += presetData || '无数据';
        }
        
        return {
          content: [{
            type: 'text',
            text: presetList.trim()
          }]
        };
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      console.error(`Error listing presets for camera ${ip}:`, error);
      return {
        content: [{
          type: 'text',
          text: `❌ 获取相机 ${ip} 的预设列表失败: ${error instanceof Error ? error.message : String(error)}`
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