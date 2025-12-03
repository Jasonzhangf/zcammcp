/**
 * API响应分析测试
 * 专门用于分析每个API调用的实际响应内容
 */

const { ZCamAPI } = require('../../src/core/api');
const CameraControlManager = require('../../src/core/camera-control-manager');
const ControlService = require('../../src/modules/control/service');
const ImageService = require('../../src/modules/image/service');
const StreamService = require('../../src/modules/stream/service');

// 测试相机配置
const TEST_CAMERA = {
  host: '192.168.9.59',
  port: 80,
  timeout: 15000
};

describe('API响应分析', () => {
  let api;
  let controlManager;

  beforeAll(async () => {
    api = new ZCamAPI(TEST_CAMERA);
    controlManager = new CameraControlManager(api);
    const acquired = await controlManager.ensureControl('recording');
    console.log('🎯 控制权获取完成:', acquired);

    // 等待控制权稳定
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  afterAll(async () => {
    try {
      await controlManager.cleanup();
      await api.sessionQuit();
    } catch (error) {
      console.warn('⚠️ 清理资源时出错:', error.message);
    }
  });

  describe('基础连接API', () => {
    test('分析连接测试响应', async () => {
      const response = await api.testConnection();
      console.log('📊 testConnection响应:', JSON.stringify(response, null, 2));
      expect(response).toBeDefined();
    });

    test('分析相机信息响应', async () => {
      const response = await api.getCameraInfo();
      console.log('📊 getCameraInfo响应:', JSON.stringify(response, null, 2));
      expect(response).toBeDefined();
    });

    test('分析心跳响应', async () => {
      const response = await api.sessionPing();
      console.log('📊 sessionPing响应:', JSON.stringify(response, null, 2));
      expect(response).toBeDefined();
    });
  });

  describe('PTZ控制API响应分析', () => {
    test('分析PTZ位置查询响应', async () => {
      const response = await controlManager.ensureControlContext(async () => {
        return await ControlService.getPTZPosition(api);
      });
      console.log('📊 getPTZPosition响应:', JSON.stringify(response, null, 2));
      expect(response).toBeDefined();
    });

    test('分析PTZ详细信息响应', async () => {
      const response = await controlManager.ensureControlContext(async () => {
        return await ControlService.getPTZDetail(api);
      });
      console.log('📊 getPTZDetail响应:', JSON.stringify(response, null, 2));
      expect(response).toBeDefined();
    });

    test('分析PTZ方向移动响应', async () => {
      const response = await controlManager.ensureControlContext(async () => {
        return await ControlService.ptzDirectionMove(api, 'up', 3);
      });
      console.log('📊 ptzDirectionMove响应:', JSON.stringify(response, null, 2));
      expect(response).toBeDefined();
    });

    test('分析PTZ停止响应', async () => {
      const response = await controlManager.ensureControlContext(async () => {
        return await ControlService.ptzStop(api);
      });
      console.log('📊 ptzStop响应:', JSON.stringify(response, null, 2));
      expect(response).toBeDefined();
    });
  });

  describe('变焦控制API响应分析', () => {
    test('分析变焦in响应', async () => {
      const response = await controlManager.ensureControlContext(async () => {
        return await ControlService.zoom(api, 'in', 3);
      });
      console.log('📊 zoom in响应:', JSON.stringify(response, null, 2));
      expect(response).toBeDefined();
    });

    test('分析变焦停止响应', async () => {
      const response = await controlManager.ensureControlContext(async () => {
        return await ControlService.zoomStop(api);
      });
      console.log('📊 zoomStop响应:', JSON.stringify(response, null, 2));
      expect(response).toBeDefined();
    });

    test('分析精确变焦响应', async () => {
      const response = await controlManager.ensureControlContext(async () => {
        return await ControlService.zoomValue(api, 1500);
      });
      console.log('📊 zoomValue响应:', JSON.stringify(response, null, 2));
      expect(response).toBeDefined();
    });
  });

  describe('对焦控制API响应分析', () => {
    test('分析对焦near响应', async () => {
      const response = await controlManager.ensureControlContext(async () => {
        return await ControlService.focus(api, 'near', 3);
      });
      console.log('📊 focus near响应:', JSON.stringify(response, null, 2));
      expect(response).toBeDefined();
    });

    test('分析自动对焦响应', async () => {
      const response = await controlManager.ensureControlContext(async () => {
        return await ControlService.autoFocus(api);
      });
      console.log('📊 autoFocus响应:', JSON.stringify(response, null, 2));
      expect(response).toBeDefined();
    });

    test('分析精确对焦响应', async () => {
      const response = await controlManager.ensureControlContext(async () => {
        return await ControlService.focusValue(api, 1500);
      });
      console.log('📊 focusValue响应:', JSON.stringify(response, null, 2));
      expect(response).toBeDefined();
    });
  });

  describe('图像控制API响应分析', () => {
    test('分析EV获取响应', async () => {
      const response = await controlManager.ensureControlContext(async () => {
        return await ImageService.getEv(api);
      });
      console.log('📊 getEv响应:', JSON.stringify(response, null, 2));
      expect(response).toBeDefined();
    });

    test('分析EV设置响应', async () => {
      const response = await controlManager.ensureControlContext(async () => {
        return await ImageService.setEv(api, 5);
      });
      console.log('📊 setEv响应:', JSON.stringify(response, null, 2));
      expect(response).toBeDefined();
    });

    test('分析光圈获取响应', async () => {
      const response = await controlManager.ensureControlContext(async () => {
        return await ImageService.getAperture(api);
      });
      console.log('📊 getAperture响应:', JSON.stringify(response, null, 2));
      expect(response).toBeDefined();
    });
  });

  describe('流媒体控制API响应分析', () => {
    test('分析RTMP状态查询响应', async () => {
      const response = await controlManager.ensureControlContext(async () => {
        return await StreamService.getRtmpStatus(api);
      });
      console.log('📊 getRtmpStatus响应:', JSON.stringify(response, null, 2));
      expect(response).toBeDefined();
    });

    test('分析录制状态查询响应', async () => {
      const response = await controlManager.ensureControlContext(async () => {
        return await StreamService.getRecordingStatus(api);
      });
      console.log('📊 getRecordingStatus响应:', JSON.stringify(response, null, 2));
      expect(response).toBeDefined();
    });
  });

  describe('原始API调用分析', () => {
    test('分析原始GET请求响应格式', async () => {
      // 测试最基本的API调用
      const response1 = await api.get('/ctrl/mode');
      console.log('📊 /ctrl/mode响应:', JSON.stringify(response1, null, 2));

      const response2 = await api.get('/ctrl/pt?action=query');
      console.log('📊 /ctrl/pt?action=query响应:', JSON.stringify(response2, null, 2));

      const response3 = await api.get('/ctrl/get?k=ev');
      console.log('📊 /ctrl/get?k=ev响应:', JSON.stringify(response3, null, 2));

      expect(response1).toBeDefined();
      expect(response2).toBeDefined();
      expect(response3).toBeDefined();
    });
  });

  describe('控制权状态分析', () => {
    test('分析控制权获取过程', async () => {
      // 重新获取控制权的过程分析
      const result = await controlManager.acquireControl('recording');
      console.log('📊 acquireControl响应:', result);

      const status = controlManager.getStatus();
      console.log('📊 控制权状态:', JSON.stringify(status, null, 2));

      expect(typeof result).toBe('boolean');
      expect(status).toBeDefined();
    });
  });
});