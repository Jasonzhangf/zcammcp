// PresetService功能测试脚本
// 用于测试ZCAM MCP服务器的预设管理功能

console.log('ZCAM MCP PresetService Test');

// 测试用例
const testCases = [
  {
    name: 'Save Preset Test',
    request: {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'preset_manager',
        arguments: {
          action: 'save',
          ip: '192.168.9.59',
          presetId: 1,
          name: '预设位置1'
        }
      }
    }
  },
  {
    name: 'Recall Preset Test',
    request: {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'preset_manager',
        arguments: {
          action: 'recall',
          ip: '192.168.9.59',
          presetId: 1
        }
      }
    }
  },
  {
    name: 'List Presets Test',
    request: {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'preset_manager',
        arguments: {
          action: 'list',
          ip: '192.168.9.59'
        }
      }
    }
  }
];

console.log('准备测试用例:', testCases);

console.log('要完整测试PresetService功能，需要实现一个MCP客户端来与服务器通信。');
console.log('测试步骤:');
console.log('1. 启动MCP服务器');
console.log('2. 使用MCP客户端连接到服务器');
console.log('3. 发送预设管理测试请求并验证响应');
console.log('4. 验证相机的实际预设位置变化');