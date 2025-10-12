// ExposureService功能测试脚本
// 用于测试ZCAM MCP服务器的曝光控制功能

console.log('ZCAM MCP ExposureService Test');

// 测试用例
const testCases = [
  {
    name: 'Set Aperture Test',
    request: {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'exposure_control',
        arguments: {
          action: 'set_aperture',
          ip: '192.168.9.59',
          aperture: 2.8
        }
      }
    }
  },
  {
    name: 'Set Shutter Speed Test',
    request: {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'exposure_control',
        arguments: {
          action: 'set_shutter_speed',
          ip: '192.168.9.59',
          shutterSpeed: 50
        }
      }
    }
  },
  {
    name: 'Set ISO Test',
    request: {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'exposure_control',
        arguments: {
          action: 'set_iso',
          ip: '192.168.9.59',
          iso: 800
        }
      }
    }
  },
  {
    name: 'Get Exposure Settings Test',
    request: {
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'exposure_control',
        arguments: {
          action: 'get_settings',
          ip: '192.168.9.59'
        }
      }
    }
  }
];

console.log('准备测试用例:', testCases);

console.log('要完整测试ExposureService功能，需要实现一个MCP客户端来与服务器通信。');
console.log('测试步骤:');
console.log('1. 启动MCP服务器');
console.log('2. 使用MCP客户端连接到服务器');
console.log('3. 发送曝光控制测试请求并验证响应');
console.log('4. 验证相机的实际曝光设置变化');