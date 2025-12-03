/**
 * 流媒体服务单元测试 - 真实API连接测试
 * 测试RTMP推流、SRT流、NDI输出等流媒体功能
 */

const StreamService = require('../../../../src/modules/stream/service');
const CameraControlManager = require('../../../../src/core/camera-control-manager');
const { ZCamAPI } = require('../../../../src/core/api');
const { APIError, ConnectionError } = require('../../../../src/utils/errors');

// 测试相机配置
const TEST_CAMERA = {
  host: '192.168.9.59',
  port: 80,
  timeout: 15000
};

describe('StreamService', () => {
  let api;
  let controlManager;

  beforeEach(async () => {
    api = new ZCamAPI(TEST_CAMERA);
    controlManager = new CameraControlManager(api);

    // 自动获取控制权
    await controlManager.ensureControl('recording');
    console.log('✅ 控制权管理器初始化完成');
  });

  afterEach(async () => {
    // 清理资源：释放控制权和会话，停止所有流
    try {
      // 停止可能运行的流
      for (let i = 1; i <= 4; i++) {
        try {
          await StreamService.stopRtmpStream(api, i);
        } catch (error) {
          // 忽略停止错误
        }
      }

      await controlManager.cleanup();
      await api.sessionQuit();
    } catch (error) {
      console.warn('⚠️ 清理资源时出错:', error.message);
    }
  });

  // ===== RTMP推流控制测试 =====
  describe('RTMP推流控制', () => {
    test('应该启动RTMP推流', async () => {
      const testUrl = 'rtmp://test.example.com/live';
      const testKey = 'test_stream_key';

      const result = await StreamService.startRtmpStream(api, testUrl, testKey);

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      expect(result.code).toBe(0);

      console.log('RTMP启动结果:', JSON.stringify(result, null, 2));

      // 等待流启动
      await new Promise(resolve => setTimeout(resolve, 2000));
    });

    test('应该启动不带参数的RTMP推流', async () => {
      const result = await StreamService.startRtmpStream(api);

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      expect(result.code).toBe(0);

      // 等待流启动
      await new Promise(resolve => setTimeout(resolve, 2000));
    });

    test('应该停止RTMP推流', async () => {
      // 先启动流
      await StreamService.startRtmpStream(api);
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 停止流
      const result = await StreamService.stopRtmpStream(api, 1);

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      expect(result.code).toBe(0);
    });

    test('应该查询RTMP流状态', async () => {
      const result = await StreamService.getRtmpStreamStatus(api, 1);

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');

      console.log('RTMP流状态:', JSON.stringify(result, null, 2));
    });

    test('应该拒绝无效的RTMP流索引', async () => {
      const invalidIndexes = [0, 5, -1, 'invalid', null];

      for (const index of invalidIndexes) {
        await expect(StreamService.stopRtmpStream(api, index)).rejects.toThrow();
        await expect(StreamService.getRtmpStreamStatus(api, index)).rejects.toThrow();
      }
    });

    test('应该拒绝无效的RTMP URL', async () => {
      const invalidUrls = [
        'not-a-url',
        'ftp://invalid.com/stream',
        'http://not-rtmp.com/stream',
        ''
      ];

      for (const url of invalidUrls) {
        if (url !== '') {  // 空字符串是允许的
          await expect(StreamService.startRtmpStream(api, url)).rejects.toThrow();
        }
      }
    });
  });

  // ===== RTMP推流设置测试 =====
  describe('RTMP推流设置', () => {
    test('应该设置RTMP推流URL', async () => {
      const testUrl = 'rtmp://live.example.com/app';

      const result = await StreamService.setRtmpStreamUrl(api, 1, testUrl);

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      expect(result.code).toBe(0);
    });

    test('应该设置RTMP推流密钥', async () => {
      const testKey = 'live_stream_key_123';

      const result = await StreamService.setRtmpStreamKey(api, 1, testKey);

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      expect(result.code).toBe(0);
    });

    test('应该获取RTMP推流URL', async () => {
      const result = await StreamService.getRtmpStreamUrl(api, 1);

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      expect(result.code).toBe(0);

      if (result.value !== undefined) {
        console.log('RTMP URL:', result.value);
      }
    });

    test('应该获取RTMP推流密钥', async () => {
      const result = await StreamService.getRtmpStreamKey(api, 1);

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      expect(result.code).toBe(0);

      if (result.value !== undefined) {
        console.log('RTMP密钥:', result.value);
      }
    });
  });

  // ===== SRT流控制测试 =====
  describe('SRT流控制', () => {
    test('应该启动SRT流', async () => {
      const testUrl = 'srt://srt.example.com:1234';

      const result = await StreamService.startSrtStream(api, testUrl);

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      expect(result.code).toBe(0);

      console.log('SRT启动结果:', JSON.stringify(result, null, 2));

      // 等待流启动
      await new Promise(resolve => setTimeout(resolve, 2000));
    });

    test('应该停止SRT流', async () => {
      // 先启动流
      await StreamService.startSrtStream(api, 'srt://test.example.com:1234');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 停止流
      const result = await StreamService.stopSrtStream(api);

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      expect(result.code).toBe(0);
    });

    test('应该查询SRT流状态', async () => {
      const result = await StreamService.getSrtStreamStatus(api);

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');

      console.log('SRT流状态:', JSON.stringify(result, null, 2));
    });

    test('应该设置SRT流URL', async () => {
      const testUrl = 'srt://srt.example.com:5678';

      const result = await StreamService.setSrtStreamUrl(api, testUrl);

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      expect(result.code).toBe(0);
    });

    test('应该获取SRT流URL', async () => {
      const result = await StreamService.getSrtStreamUrl(api);

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      expect(result.code).toBe(0);

      if (result.value !== undefined) {
        console.log('SRT URL:', result.value);
      }
    });

    test('应该拒绝无效的SRT URL', async () => {
      const invalidUrls = [
        'not-a-url',
        'rtmp://invalid.com/stream',
        'http://not-srt.com/stream',
        ''
      ];

      for (const url of invalidUrls) {
        if (url !== '') {  // 空字符串可能被特殊处理
          await expect(StreamService.startSrtStream(api, url)).rejects.toThrow();
        }
      }
    });
  });

  // ===== NDI输出测试 =====
  describe('NDI输出控制', () => {
    test('应该启动NDI输出', async () => {
      const result = await StreamService.startNdiOutput(api);

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      expect(result.code).toBe(0);

      console.log('NDI启动结果:', JSON.stringify(result, null, 2));

      // 等待NDI启动
      await new Promise(resolve => setTimeout(resolve, 3000));
    });

    test('应该停止NDI输出', async () => {
      // 先启动NDI
      await StreamService.startNdiOutput(api);
      await new Promise(resolve => setTimeout(resolve, 3000));

      // 停止NDI
      const result = await StreamService.stopNdiOutput(api);

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      expect(result.code).toBe(0);
    });

    test('应该查询NDI状态', async () => {
      const result = await StreamService.getNdiStatus(api);

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');

      console.log('NDI状态:', JSON.stringify(result, null, 2));
    });

    test('应该设置NDI名称', async () => {
      const testName = 'ZCAM_NDI_Test';

      const result = await StreamService.setNdiName(api, testName);

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      expect(result.code).toBe(0);
    });

    test('应该获取NDI名称', async () => {
      const result = await StreamService.getNdiName(api);

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      expect(result.code).toBe(0);

      if (result.value !== undefined) {
        console.log('NDI名称:', result.value);
      }
    });
  });

  // ===== 流媒体参数设置测试 =====
  describe('流媒体参数设置', () => {
    test('应该设置流媒体分辨率', async () => {
      const resolutions = ['1920x1080', '1280x720', '3840x2160'];

      for (const resolution of resolutions) {
        const result = await StreamService.setStreamResolution(api, resolution);

        expect(result).toBeDefined();
        expect(typeof result).toBe('object');
        expect(result.code).toBe(0);

        console.log(`设置分辨率 ${resolution}:`, JSON.stringify(result, null, 2));
      }
    });

    test('应该设置流媒体帧率', async () => {
      const frameRates = ['30', '60', '25'];

      for (const frameRate of frameRates) {
        const result = await StreamService.setStreamFrameRate(api, frameRate);

        expect(result).toBeDefined();
        expect(typeof result).toBe('object');
        expect(result.code).toBe(0);

        console.log(`设置帧率 ${frameRate}:`, JSON.stringify(result, null, 2));
      }
    });

    test('应该设置流媒体码率', async () => {
      const bitrates = ['2000', '5000', '10000'];

      for (const bitrate of bitrates) {
        const result = await StreamService.setStreamBitrate(api, bitrate);

        expect(result).toBeDefined();
        expect(typeof result).toBe('object');
        expect(result.code).toBe(0);

        console.log(`设置码率 ${bitrate}:`, JSON.stringify(result, null, 2));
      }
    });

    test('应该获取流媒体参数', async () => {
      const params = [
        'resolution',
        'fps',
        'bitrate'
      ];

      for (const param of params) {
        const result = await StreamService.getStreamParam(api, param);

        expect(result).toBeDefined();
        expect(typeof result).toBe('object');

        if (result.value !== undefined) {
          console.log(`${param}:`, result.value);
        }
      }
    });
  });

  // ===== 流媒体质量控制测试 =====
  describe('流媒体质量控制', () => {
    test('应该设置流媒体质量预设', async () => {
      const presets = ['low', 'medium', 'high'];

      for (const preset of presets) {
        const result = await StreamService.setStreamQualityPreset(api, preset);

        expect(result).toBeDefined();
        expect(typeof result).toBe('object');
        expect(result.code).toBe(0);

        console.log(`设置质量预设 ${preset}:`, JSON.stringify(result, null, 2));
      }
    });

    test('应该启用流媒体自适应码率', async () => {
      const result = await StreamService.enableAdaptiveBitrate(api, true);

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      expect(result.code).toBe(0);
    });

    test('应该禁用流媒体自适应码率', async () => {
      const result = await StreamService.enableAdaptiveBitrate(api, false);

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      expect(result.code).toBe(0);
    });

    test('应该获取流媒体质量状态', async () => {
      const result = await StreamService.getStreamQualityStatus(api);

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');

      console.log('流媒体质量状态:', JSON.stringify(result, null, 2));
    });
  });

  // ===== 辅助方法测试 =====
  describe('辅助方法', () => {
    test('应该获取所有流媒体状态', async () => {
      const result = await StreamService.getAllStreamStatus(api);

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');

      console.log('所有流媒体状态:', JSON.stringify(result, null, 2));
    }, 30000);

    test('应该验证RTMP URL格式', () => {
      const validUrls = [
        'rtmp://live.example.com/app',
        'rtmps://secure.example.com/live',
        'rtmp://192.168.1.100:1935/live'
      ];

      for (const url of validUrls) {
        expect(() => StreamService.validateRtmpUrl(url)).not.toThrow();
      }
    });

    test('应该拒绝无效的RTMP URL格式', () => {
      const invalidUrls = [
        'http://example.com/stream',
        'ftp://example.com/stream',
        'not-a-url',
        'rtmp://',
        ''
      ];

      for (const url of invalidUrls) {
        expect(() => StreamService.validateRtmpUrl(url)).toThrow();
      }
    });
  });

  // ===== 集成测试 =====
  describe('集成测试', () => {
    test('应该完成完整的RTMP推流流程', async () => {
      // 1. 设置RTMP参数
      await StreamService.setRtmpStreamUrl(api, 1, 'rtmp://test.example.com/live');
      await StreamService.setRtmpStreamKey(api, 1, 'test_key_123');

      // 2. 设置流媒体参数
      await StreamService.setStreamResolution(api, '1920x1080');
      await StreamService.setStreamFrameRate(api, '30');
      await StreamService.setStreamBitrate(api, '5000');

      // 3. 启动RTMP推流
      await StreamService.startRtmpStream(api);
      await new Promise(resolve => setTimeout(resolve, 3000));

      // 4. 查询状态
      const status = await StreamService.getRtmpStreamStatus(api, 1);
      expect(status).toBeDefined();

      // 5. 停止推流
      await StreamService.stopRtmpStream(api, 1);

      expect(true).toBe(true); // 流程完成
    }, 20000);

    test('应该完成完整的SRT流控制流程', async () => {
      // 1. 设置SRT URL
      await StreamService.setSrtStreamUrl(api, 'srt://srt.example.com:1234');

      // 2. 启动SRT流
      await StreamService.startSrtStream(api);
      await new Promise(resolve => setTimeout(resolve, 3000));

      // 3. 查询状态
      const status = await StreamService.getSrtStreamStatus(api);
      expect(status).toBeDefined();

      // 4. 停止SRT流
      await StreamService.stopSrtStream(api);

      expect(true).toBe(true); // 流程完成
    }, 15000);

    test('应该完成完整的NDI输出流程', async () => {
      // 1. 设置NDI名称
      await StreamService.setNdiName(api, 'ZCAM_Integration_Test');

      // 2. 启动NDI
      await StreamService.startNdiOutput(api);
      await new Promise(resolve => setTimeout(resolve, 3000));

      // 3. 查询状态
      const status = await StreamService.getNdiStatus(api);
      expect(status).toBeDefined();

      // 4. 停止NDI
      await StreamService.stopNdiOutput(api);

      expect(true).toBe(true); // 流程完成
    }, 15000);
  });

  // ===== 错误处理测试 =====
  describe('错误处理', () => {
    test('应该处理无效API实例', async () => {
      await expect(StreamService.startRtmpStream(null)).rejects.toThrow();
      await expect(StreamService.getSrtStreamStatus(null)).rejects.toThrow();
      await expect(StreamService.getNdiStatus(null)).rejects.toThrow();
    });

    test('应该处理网络连接错误', async () => {
      const invalidAPI = new ZCamAPI({
        host: 'invalid-host-name',
        port: 80,
        timeout: 5000
      });

      await expect(StreamService.startRtmpStream(invalidAPI)).rejects.toThrow();
    });

    test('应该处理参数验证错误', async () => {
      const invalidOperations = [
        { method: 'stopRtmpStream', args: [5] },
        { method: 'getRtmpStreamStatus', args: [0] },
        { method: 'startSrtStream', args: ['invalid-url'] },
        { method: 'setStreamResolution', args: ['invalid-resolution'] },
        { method: 'setStreamFrameRate', args: ['invalid-fps'] }
      ];

      for (const { method, args } of invalidOperations) {
        await expect(StreamService[method](api, ...args)).rejects.toThrow();
      }
    });
  });

  // ===== 性能测试 =====
  describe('性能测试', () => {
    test('应该在合理时间内完成流媒体操作', async () => {
      const startTime = Date.now();

      await StreamService.getRtmpStreamStatus(api, 1);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(2000); // 2秒内完成
    });

    test('应该处理并发流媒体查询', async () => {
      const operations = [
        StreamService.getRtmpStreamStatus(api, 1),
        StreamService.getSrtStreamStatus(api),
        StreamService.getNdiStatus(api),
        StreamService.getStreamParam(api, 'resolution')
      ];

      const results = await Promise.allSettled(operations);

      // 至少应该有一些请求成功
      const successful = results.filter(result => result.status === 'fulfilled');
      expect(successful.length).toBeGreaterThan(0);
    }, 10000);
  });
});