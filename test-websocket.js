const WebSocket = require('ws');

// ZCAM相机WebSocket连接测试
const cameraIp = '192.168.9.59';
const wsUrl = `ws://${cameraIp}:81`;

console.log(`Connecting to ZCAM at ${wsUrl}`);

const ws = new WebSocket(wsUrl);

ws.on('open', function open() {
  console.log('Connected to ZCAM WebSocket');
  
  // 发送订阅请求来测试订阅机制
  const subscribeMessage = {
    type: 'subscribe',
    property: 'camera.status.batteryLevel'
  };
  
  console.log('Sending subscribe message:', JSON.stringify(subscribeMessage));
  ws.send(JSON.stringify(subscribeMessage));
});

ws.on('message', function incoming(data) {
  console.log('Received:', data);
  
  try {
    const message = JSON.parse(data);
    console.log('Parsed message:', message);
    
    // 检查是否是属性更新消息
    if (message.what) {
      console.log('Message type:', message.what);
      
      // 如果是basicInfo消息，显示相机信息
      if (message.what === 'basicInfo') {
        console.log('Camera info:');
        console.log('- Nickname:', message.nickname);
        console.log('- Recording:', message.recording);
        console.log('- Battery voltage:', message.batVolt);
        console.log('- Temperature:', message.temp);
      }
    }
  } catch (error) {
    console.log('Raw message:', data.toString());
  }
});

ws.on('error', function error(err) {
  console.log('WebSocket error:', err);
});

ws.on('close', function close() {
  console.log('Disconnected from ZCAM WebSocket');
});

// 10秒后关闭连接
setTimeout(() => {
  console.log('Closing connection...');
  ws.close();
}, 10000);