/**
 * 流媒体服务层 - 封装流媒体控制的API调用
 * 对应官方API: Api.streaming
 */

class StreamService {
  // ===== RTMP推流控制 =====

  /**
   * 启动RTMP推流
   * API: /ctrl/rtmp?action=start&url={url}&key={key}
   */
  static async startRtmpStream(api, url = '', key = '') {
    let params = 'action=start';

    if (url && url.length > 0) {
      this.validateRtmpUrl(url);
      params += `&url=${encodeURIComponent(url)}`;
    }

    if (key && key.length > 0) {
      params += `&key=${encodeURIComponent(key)}`;
    }

    return await api.get(`/ctrl/rtmp?${params}`);
  }

  /**
   * 停止RTMP推流
   * API: /ctrl/rtmp?action=stop&index={index}
   */
  static async stopRtmpStream(api, index) {
    const streamIndex = parseInt(index);
    if (isNaN(streamIndex) || streamIndex < 1 || streamIndex > 4) {
      throw new Error('RTMP流索引必须是1-4之间的数字');
    }

    return await api.get(`/ctrl/rtmp?action=stop&index=${streamIndex}`);
  }

  /**
   * 查询RTMP流状态
   * API: /ctrl/rtmp?action=query&index={index}
   */
  static async getRtmpStreamStatus(api, index) {
    const streamIndex = parseInt(index);
    if (isNaN(streamIndex) || streamIndex < 1 || streamIndex > 4) {
      throw new Error('RTMP流索引必须是1-4之间的数字');
    }

    return await api.get(`/ctrl/rtmp?action=query&index=${streamIndex}`);
  }

  /**
   * 设置RTMP推流参数
   * API: /ctrl/rtmp?action=set&url={url}&key={key}
   */
  static async setRtmpStream(api, url, key) {
    if (!url || typeof url !== 'string') {
      throw new Error('RTMP URL不能为空');
    }

    this.validateRtmpUrl(url);

    let params = 'action=set';
    params += `&url=${encodeURIComponent(url)}`;

    if (key && typeof key === 'string') {
      params += `&key=${encodeURIComponent(key)}`;
    }

    return await api.get(`/ctrl/rtmp?${params}`);
  }

  /**
   * 设置指定RTMP流的URL
   */
  static async setRtmpStreamUrl(api, index, url) {
    const streamIndex = this.validateStreamIndex(index);
    if (!url || typeof url !== 'string') {
      throw new Error('RTMP URL不能为空');
    }
    this.validateRtmpUrl(url);
    return await api.get(`/ctrl/rtmp?action=set_url&index=${streamIndex}&url=${encodeURIComponent(url)}`);
  }

  /**
   * 设置指定RTMP流的密钥
   */
  static async setRtmpStreamKey(api, index, key) {
    const streamIndex = this.validateStreamIndex(index);
    if (!key || typeof key !== 'string') {
      throw new Error('RTMP密钥不能为空');
    }
    return await api.get(`/ctrl/rtmp?action=set_key&index=${streamIndex}&key=${encodeURIComponent(key)}`);
  }

  /**
   * 获取RTMP流URL
   */
  static async getRtmpStreamUrl(api, index) {
    const streamIndex = this.validateStreamIndex(index);
    return await api.get(`/ctrl/rtmp?action=get_url&index=${streamIndex}`);
  }

  /**
   * 获取RTMP流密钥
   */
  static async getRtmpStreamKey(api, index) {
    const streamIndex = this.validateStreamIndex(index);
    return await api.get(`/ctrl/rtmp?action=get_key&index=${streamIndex}`);
  }

  /**
   * 设置RTMP自动重启
   * API: /ctrl/rtmp?action=set&autoRestart={enable}
   */
  static async setRtmpAutoRestart(api, enable) {
    const value = enable === true || enable === '1' || enable === 'on' ? 'true' : 'false';
    return await api.get(`/ctrl/rtmp?action=set&autoRestart=${value}`);
  }

  /**
   * 验证RTMP URL格式
   */
  static validateRtmpUrl(url) {
    const rtmpRegex = /^rtmp:\/\/[^\s\/]+\/[^\s]*$/;
    if (!rtmpRegex.test(url)) {
      throw new Error('RTMP URL格式错误，应为: rtmp://server/app/stream');
    }
  }

  // ===== SRT推流控制 =====

  /**
   * 启动SRT推流
   * API: /ctrl/srt?action=start&url={url}
   */
  static async startSrtStream(api, url = '') {
    if (url && typeof url === 'string' && url.length > 0) {
      this.validateSrtUrl(url);
      return await api.get(`/ctrl/srt?action=start&url=${encodeURIComponent(url)}`);
    }
    return await api.get('/ctrl/srt?action=start');
  }

  /**
   * 停止SRT推流
   * API: /ctrl/srt?action=stop
   */
  static async stopSrtStream(api) {
    return await api.get('/ctrl/srt?action=stop');
  }

  /**
   * 查询SRT流状态
   * API: /ctrl/srt?action=query
   */
  static async getSrtStreamStatus(api) {
    return await api.get('/ctrl/srt?action=query');
  }

  /**
   * 设置SRT流URL
   */
  static async setSrtStreamUrl(api, url) {
    return await this.setSrtUrl(api, url);
  }

  /**
   * 获取SRT流URL
   */
  static async getSrtStreamUrl(api) {
    return await api.get('/ctrl/srt?action=get_url');
  }

  /**
   * 设置SRT参数
   * API: /ctrl/srt?action=set&mode={mode}&passphrase={passphrase}&pbkeyLen={pbkeylen}&latency={latency}&ttl={ttl}
   */
  static async setSrtParams(api, params = {}) {
    const searchParams = new URLSearchParams();
    searchParams.append('action', 'set');

    if (params.mode) {
      const validModes = ['caller', 'listener', 'rendezvous'];
      if (!validModes.includes(params.mode)) {
        throw new Error(`SRT模式无效，支持: ${validModes.join(', ')}`);
      }
      searchParams.append('mode', params.mode);
    }

    if (params.passphrase !== undefined) {
      if (params.passphrase.length > 79) {
        throw new Error('SRT密码长度不能超过79个字符');
      }
      searchParams.append('passphrase', params.passphrase);
    }

    if (params.pbkeylen) {
      const pbkeyLen = parseInt(params.pbkeylen);
      const validLengths = [0, 16, 24, 32];
      if (!validLengths.includes(pbkeyLen)) {
        throw new Error(`PB密钥长度无效，支持: ${validLengths.join(', ')}`);
      }
      searchParams.append('pbkeyLen', pbkeyLen);
    }

    if (params.latency) {
      const latency = parseInt(params.latency);
      if (latency < 0 || latency > 30000) {
        throw new Error('延迟时间必须是0-30000ms之间的数字');
      }
      searchParams.append('latency', latency);
    }

    if (params.ttl) {
      const ttl = parseInt(params.ttl);
      if (ttl < 1 || ttl > 255) {
        throw new Error('TTL必须是1-255之间的数字');
      }
      searchParams.append('ttl', ttl);
    }

    return await api.get(`/ctrl/srt?${searchParams.toString()}`);
  }

  /**
   * 设置SRT自动重启
   * API: /ctrl/srt?action=set&autoRestart={enable}
   */
  static async setSrtAutoRestart(api, enable) {
    const value = enable === true || enable === '1' || enable === 'on' ? 'true' : 'false';
    return await api.get(`/ctrl/srt?action=set&autoRestart=${value}`);
  }

  /**
   * 设置SRT URL
   * API: /ctrl/srt?action=set&url={url}
   */
  static async setSrtUrl(api, url) {
    if (!url || typeof url !== 'string') {
      throw new Error('SRT URL不能为空');
    }

    this.validateSrtUrl(url);
    return await api.get(`/ctrl/srt?action=set&url=${encodeURIComponent(url)}`);
  }

  /**
   * 验证SRT URL格式
   */
  static validateSrtUrl(url) {
    const srtRegex = /^srt:\/\/[^\s\/]+(:\d+)?\/[^\s]*$/;
    if (!srtRegex.test(url)) {
      throw new Error('SRT URL格式错误，应为: srt://server:port/stream');
    }
  }

  // ===== NDI推流控制 =====

  /**
   * 查询NDI流状态
   * API: /ctrl/ndi?action=query
   */
  static async getNdiStreamStatus(api) {
    return await api.get('/ctrl/ndi?action=query');
  }

  /**
   * 启动NDI输出
   */
  static async startNdiOutput(api) {
    return await api.get('/ctrl/ndi?action=start');
  }

  /**
   * 停止NDI输出
   */
  static async stopNdiOutput(api) {
    return await api.get('/ctrl/ndi?action=stop');
  }

  /**
   * 获取NDI状态（别名）
   */
  static async getNdiStatus(api) {
    return await this.getNdiStreamStatus(api);
  }

  /**
   * 设置NDI名称
   */
  static async setNdiName(api, name) {
    if (!name || typeof name !== 'string') {
      throw new Error('NDI名称不能为空');
    }
    return await api.get(`/ctrl/ndi?action=set_name&name=${encodeURIComponent(name)}`);
  }

  /**
   * 获取NDI名称
   */
  static async getNdiName(api) {
    return await api.get('/ctrl/ndi?action=get_name');
  }

  /**
   * 设置NDI参数
   * API: /ctrl/ndi?action=set&machine={machine}&stream={stream}&group={group}&ttl={ttl}...
   */
  static async setNdiParams(api, params = {}) {
    const searchParams = new URLSearchParams();
    searchParams.append('action', 'set');

    // 必需参数
    if (params.machine && params.machine.length > 0) {
      if (params.machine.length > 63) {
        throw new Error('NDI机器名长度不能超过63个字符');
      }
      searchParams.append('machine', params.machine);
    }

    if (params.stream && params.stream.length > 0) {
      if (params.stream.length > 63) {
        throw new Error('NDI流名称长度不能超过63个字符');
      }
      searchParams.append('stream', params.stream);
    }

    // 可选参数
    if (params.group !== undefined) {
      searchParams.append('group', params.group);
    }

    if (params.ttl) {
      const ttl = parseInt(params.ttl);
      if (ttl < 1 || ttl > 255) {
        throw new Error('TTL必须是1-255之间的数字');
      }
      searchParams.append('ttl', ttl);
    }

    if (params.multicast !== undefined) {
      const value = params.multicast === true || params.multicast === '1' || params.multicast === 'on' ? '1' : '0';
      searchParams.append('multicastEnable', value);
    }

    if (params.multicast_net && params.multicast_net.length > 0) {
      searchParams.append('multicastNetmask', params.multicast_net);
    }

    if (params.multicast_prefix && params.multicast_prefix.length > 0) {
      searchParams.append('multicastPrefix', params.multicast_prefix);
    }

    if (params.discover1 && params.discover1.length > 0) {
      searchParams.append('discoveryServer1', params.discover1);
    }

    if (params.discover2 && params.discover2.length > 0) {
      searchParams.append('discoveryServer2', params.discover2);
    }

    if (params.bridge_name && params.bridge_name.length > 0) {
      if (params.bridge_name.length > 63) {
        throw new Error('NDI桥接名称长度不能超过63个字符');
      }
      searchParams.append('bridgeName', params.bridge_name);
    }

    if (params.bridge_encry !== undefined) {
      searchParams.append('bridgeEncryptionKey', params.bridge_encry);
    }

    if (params.bridge_server && params.bridge_server.length > 0) {
      searchParams.append('bridgeServer', params.bridge_server);
    }

    if (params.bridge_port) {
      const port = parseInt(params.bridge_port);
      if (port < 1 || port > 65535) {
        throw new Error('桥接端口必须是1-65535之间的数字');
      }
      searchParams.append('bridgePort', port);
    }

    return await api.get(`/ctrl/ndi?${searchParams.toString()}`);
  }

  // ===== RTSP设置 =====

  /**
   * 查询RTSP状态
   * API: /ctrl/rtsp?action=query
   */
  static async getRtspStatus(api) {
    return await api.get('/ctrl/rtsp?action=query');
  }

  /**
   * 设置RTSP认证
   * API: /ctrl/rtsp?action=set&authentication={auth}
   */
  static async setRtspAuth(api, enable) {
    const value = enable === true || enable === '1' || enable === 'on' ? 'on' : 'off';
    return await api.get(`/ctrl/rtsp?action=set&authentication=${value}`);
  }

  // ===== 流设置 =====

  /**
   * 查询流设置
   * API: /ctrl/stream_setting?action=query&index=stream{index}
   */
  static async getStreamSetting(api, index) {
    const streamIndex = parseInt(index);
    if (isNaN(streamIndex) || streamIndex < 1 || streamIndex > 4) {
      throw new Error('流索引必须是1-4之间的数字');
    }

    return await api.get(`/ctrl/stream_setting?action=query&index=stream${streamIndex}`);
  }

  /**
   * 设置流码率
   * API: /ctrl/stream_setting?index=stream{index}&bitrate={bitrate}
   */
  static async setStreamBitrate(api, index, bitrate) {
    const streamIndex = parseInt(index);
    if (isNaN(streamIndex) || streamIndex < 1 || streamIndex > 4) {
      throw new Error('流索引必须是1-4之间的数字');
    }

    const bitrateNum = parseInt(bitrate);
    if (isNaN(bitrateNum) || bitrateNum < 100 || bitrateNum > 50000) {
      throw new Error('码率必须是100-50000kbps之间的数字');
    }

    return await api.get(`/ctrl/stream_setting?index=stream${streamIndex}&bitrate=${bitrateNum}`);
  }

  /**
   * 设置流分辨率
   * API: /ctrl/set?stream_resolution={resolution}
   */
  static async setStreamResolution(api, index, resolution) {
    const streamIndex = parseInt(index);
    if (isNaN(streamIndex) || streamIndex < 1 || streamIndex > 4) {
      throw new Error('流索引必须是1-4之间的数字');
    }

    const validResolutions = [
      '1920x1080', '1280x720', '3840x2160', '4096x2160',
      '2048x1080', '1024x576', '640x360'
    ];

    if (!validResolutions.includes(resolution)) {
      throw new Error(`分辨率无效，支持: ${validResolutions.join(', ')}`);
    }

    return await api.get(`/ctrl/set?stream_resolution=${resolution}`);
  }

  /**
   * 设置流帧率
   * API: /ctrl/set?stream_fps={fps}
   */
  static async setStreamFps(api, index, fps) {
    const streamIndex = parseInt(index);
    if (isNaN(streamIndex) || streamIndex < 1 || streamIndex > 4) {
      throw new Error('流索引必须是1-4之间的数字');
    }

    const fpsNum = parseFloat(fps);
    const validFps = [23.976, 24, 25, 29.97, 30, 50, 59.94, 60];

    if (!validFps.includes(fpsNum)) {
      throw new Error(`帧率无效，支持: ${validFps.join(', ')}`);
    }

    return await api.get(`/ctrl/set?stream_fps=${fpsNum}`);
  }

  /**
   * 设置流编码器
   * API: /ctrl/set?stream_video_encoder={encoder}
   */
  static async setStreamEncoder(api, index, encoder) {
    const streamIndex = parseInt(index);
    if (isNaN(streamIndex) || streamIndex < 1 || streamIndex > 4) {
      throw new Error('流索引必须是1-4之间的数字');
    }

    const validEncoders = ['h264', 'h265'];
    if (!validEncoders.includes(encoder)) {
      throw new Error(`编码器无效，支持: ${validEncoders.join(', ')}`);
    }

    return await api.get(`/ctrl/set?stream_video_encoder=${encoder}`);
  }

  /**
   * 查询流性能
   * API: /ctrl/stream_setting?action=stream_performance&index=stream{index}
   */
  static async getStreamPerformance(api, index) {
    const streamIndex = parseInt(index);
    if (isNaN(streamIndex) || streamIndex < 1 || streamIndex > 4) {
      throw new Error('流索引必须是1-4之间的数字');
    }

    return await api.get(`/ctrl/stream_setting?action=stream_performance&index=stream${streamIndex}`);
  }

  // ===== 流参数管理 =====

  /**
   * 获取流分辨率
   * API: /ctrl/get?k=stream_resolution
   */
  static async getStreamResolution(api) {
    return await api.get('/ctrl/get?k=stream_resolution');
  }

  /**
   * 获取流帧率
   * API: /ctrl/get?k=stream_fps
   */
  static async getStreamFps(api) {
    return await api.get('/ctrl/get?k=stream_fps');
  }

  /**
   * 获取流编码器
   * API: /ctrl/get?k=stream_video_encoder
   */
  static async getStreamEncoder(api) {
    return await api.get('/ctrl/get?k=stream_video_encoder');
  }

  /**
   * 获取流参数保存设置
   * API: /ctrl/get?k=stream_param_save
   */
  static async getStreamParamSave(api) {
    return await api.get('/ctrl/get?k=stream_param_save');
  }

  /**
   * 设置流参数保存
   * API: /ctrl/set?stream_param_save={enable}
   */
  static async setStreamParamSave(api, enable) {
    const value = enable === true || enable === '1' || enable === 'on' ? '1' : '0';
    return await api.get(`/ctrl/set?stream_param_save=${value}`);
  }

  // ===== 辅助方法 =====

  /**
   * 获取所有流状态
   */
  static async getAllStreamStatus(api) {
    const statuses = {};

    // RTMP流状态
    for (let i = 1; i <= 4; i++) {
      try {
        statuses[`rtmp_${i}`] = await this.getRtmpStreamStatus(api, i);
      } catch (error) {
        statuses[`rtmp_${i}`] = { error: error.message };
      }
    }

    // SRT流状态
    try {
      statuses.srt = await this.getSrtStreamStatus(api);
    } catch (error) {
      statuses.srt = { error: error.message };
    }

    // NDI流状态
    try {
      statuses.ndi = await this.getNdiStreamStatus(api);
    } catch (error) {
      statuses.ndi = { error: error.message };
    }

    // RTSP状态
    try {
      statuses.rtsp = await this.getRtspStatus(api);
    } catch (error) {
      statuses.rtsp = { error: error.message };
    }

    return statuses;
  }

  /**
   * 停止所有推流
   */
  static async stopAllStreams(api) {
    const results = [];

    // 停止RTMP流
    for (let i = 1; i <= 4; i++) {
      try {
        const result = await this.stopRtmpStream(api, i);
        results.push({ type: 'rtmp', index: i, success: true, result });
      } catch (error) {
        results.push({ type: 'rtmp', index: i, success: false, error: error.message });
      }
    }

    // 停止SRT流
    try {
      const result = await this.stopSrtStream(api);
      results.push({ type: 'srt', success: true, result });
    } catch (error) {
      results.push({ type: 'srt', success: false, error: error.message });
    }

    return results;
  }

  /**
   * 批量配置流设置
   */
  static async batchConfigureStreams(api, configs) {
    const results = [];

    for (const config of configs) {
      try {
        const { index, type, ...params } = config;

        switch (type) {
          case 'rtmp':
            if (params.url && params.key) {
              const result = await this.setRtmpStream(api, params.url, params.key);
              results.push({ type, index, success: true, result });
            }
            break;

          case 'srt':
            if (params.url) {
              const result = await this.setSrtUrl(api, params.url);
              results.push({ type, success: true, result });
            }
            if (Object.keys(params).length > 1) {
              const result = await this.setSrtParams(api, params);
              results.push({ type, success: true, result });
            }
            break;

          case 'ndi':
            if (Object.keys(params).length > 0) {
              const result = await this.setNdiParams(api, params);
              results.push({ type, success: true, result });
            }
            break;

          default:
            results.push({ type, index, success: false, error: `Unknown stream type: ${type}` });
        }
      } catch (error) {
        results.push({ type: config.type, index: config.index, success: false, error: error.message });
      }
    }

    return results;
  }

  /**
   * 验证流索引
   */
  static validateStreamIndex(index, maxStreams = 4) {
    const streamIndex = parseInt(index);
    if (isNaN(streamIndex) || streamIndex < 1 || streamIndex > maxStreams) {
      throw new Error(`流索引必须是1-${maxStreams}之间的数字`);
    }
    return streamIndex;
  }

  /**
   * 验证码率值
   */
  static validateBitrate(bitrate) {
    const bitrateNum = parseInt(bitrate);
    if (isNaN(bitrateNum) || bitrateNum < 100 || bitrateNum > 50000) {
      throw new Error('码率必须是100-50000kbps之间的数字');
    }
    return bitrateNum;
  }

  /**
   * 验证分辨率格式
   */
  static validateResolution(resolution) {
    const resolutionRegex = /^\d+x\d+$/;
    if (!resolutionRegex.test(resolution)) {
      throw new Error('分辨率格式错误，应为 WIDTHxHEIGHT');
    }

    const [width, height] = resolution.split('x').map(Number);
    if (width < 1 || height < 1 || width > 4096 || height > 2160) {
      throw new Error('分辨率数值超出有效范围');
    }

    return true;
  }

  /**
   * 设置流帧率（别名）
   */
  static async setStreamFrameRate(api, index, fps) {
    return await this.setStreamFps(api, index, fps);
  }

  /**
   * 设置流媒体质量预设
   */
  static async setStreamQualityPreset(api, preset) {
    if (!preset || typeof preset !== 'string') {
      throw new Error('质量预设不能为空');
    }
    return await api.get(`/ctrl/stream_setting?action=preset&value=${encodeURIComponent(preset)}`);
  }

  /**
   * 启用/禁用自适应码率
   */
  static async enableAdaptiveBitrate(api, enable) {
    const value = enable === true || enable === '1' || enable === 'on' ? 'on' : 'off';
    return await api.get(`/ctrl/stream_setting?action=adaptive_bitrate&enable=${value}`);
  }

  /**
   * 获取流媒体质量状态
   */
  static async getStreamQualityStatus(api) {
    return await api.get('/ctrl/stream_setting?action=quality_status');
  }

  /**
   * 获取流媒体参数
   */
  static async getStreamParam(api, key) {
    if (!key || typeof key !== 'string') {
      throw new Error('参数名不能为空');
    }
    return await api.get(`/ctrl/get?k=${key}`);
  }

  /**
   * 获取RTMP状态（别名）
   */
  static async getRtmpStatus(api) {
    return await this.getRtmpStreamStatus(api, 1);
  }

  /**
   * 获取录制状态
   */
  static async getRecordingStatus(api) {
    return await api.get('/ctrl/rec?action=query');
  }
}

module.exports = StreamService;
