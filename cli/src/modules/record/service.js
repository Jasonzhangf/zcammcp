/**
 * 录制服务层 - 封装录制控制的API调用
 * 对应官方API: Api.recording, Api.photo, Api.playback
 */

class RecordService {
  // ===== 基础录制控制 =====

  /**
   * 开始录制
   * API: /ctrl/rec?action=start
   */
  static async startRecording(api) {
    return await api.get('/ctrl/rec?action=start');
  }

  /**
   * 停止录制
   * API: /ctrl/rec?action=stop
   */
  static async stopRecording(api) {
    return await api.get('/ctrl/rec?action=stop');
  }

  /**
   * 查询录制状态
   * API: /ctrl/rec?action=query
   */
  static async getRecordingStatus(api) {
    return await api.get('/ctrl/rec?action=query');
  }

  /**
   * 查询剩余录制时间
   * API: /ctrl/rec?action=remain
   */
  static async getRemainingTime(api) {
    return await api.get('/ctrl/rec?action=remain');
  }

  /**
   * 查询修复状态
   * API: /ctrl/rec?action=query_repairing
   */
  static async getRepairStatus(api) {
    return await api.get('/ctrl/rec?action=query_repairing');
  }

  // ===== 时间码控制 =====

  /**
   * 查询时间码
   * API: /ctrl/tc?action=query
   */
  static async getTimecode(api) {
    return await api.get('/ctrl/tc?action=query');
  }

  /**
   * 重置时间码
   * API: /ctrl/tc?action=reset
   */
  static async resetTimecode(api) {
    return await api.get('/ctrl/tc?action=reset');
  }

  /**
   * 设置为当前时间
   * API: /ctrl/tc?action=current_time
   */
  static async setTimecodeToCurrent(api) {
    return await api.get('/ctrl/tc?action=current_time');
  }

  /**
   * 手动设置时间码
   * API: /ctrl/tc?action=set&tc={timecode}
   */
  static async setTimecode(api, timecode) {
    // 验证时间码格式 HH:MM:SS:FF
    const timecodeRegex = /^\d{2}:\d{2}:\d{2}:\d{2}$/;
    if (!timecodeRegex.test(timecode)) {
      throw new Error('时间码格式错误，应为 HH:MM:SS:FF');
    }

    const [hours, minutes, seconds, frames] = timecode.split(':').map(Number);

    if (hours > 23 || minutes > 59 || seconds > 59 || frames > 59) {
      throw new Error('时间码数值超出有效范围');
    }

    return await api.get(`/ctrl/tc?action=set&tc=${timecode}`);
  }

  // ===== 录制格式设置 =====

  /**
   * 获取分辨率
   * API: /ctrl/get?k=resolution
   */
  static async getResolution(api) {
    return await api.get('/ctrl/get?k=resolution');
  }

  /**
   * 设置分辨率
   * API: /ctrl/set?resolution={resolution}
   */
  static async setResolution(api, resolution) {
    const validResolutions = [
      '3840x2160',  // 4K
      '1920x1080',  // 1080p
      '1280x720',   // 720p
      '4096x2160',  // 4K DCI
      '2048x1080',  // 2K DCI
      '2880x2160'   // 4K 4:3
    ];

    if (!validResolutions.includes(resolution)) {
      throw new Error(`分辨率无效，支持: ${validResolutions.join(', ')}`);
    }

    return await api.get(`/ctrl/set?resolution=${resolution}`);
  }

  /**
   * 获取项目帧率
   * API: /ctrl/get?k=project_fps
   */
  static async getProjectFps(api) {
    return await api.get('/ctrl/get?k=project_fps');
  }

  /**
   * 设置项目帧率
   * API: /ctrl/set?project_fps={fps}
   */
  static async setProjectFps(api, fps) {
    const fpsNum = parseFloat(fps);
    const validFps = [23.976, 24, 25, 29.97, 30, 50, 59.94, 60];

    if (!validFps.includes(fpsNum)) {
      throw new Error(`帧率无效，支持: ${validFps.join(', ')}`);
    }

    return await api.get(`/ctrl/set?project_fps=${fpsNum}`);
  }

  /**
   * 获取录制帧率
   * API: /ctrl/get?k=rec_fps
   */
  static async getRecordingFps(api) {
    return await api.get('/ctrl/get?k=rec_fps');
  }

  /**
   * 设置录制帧率
   * API: /ctrl/set?rec_fps={fps}
   */
  static async setRecordingFps(api, fps) {
    const fpsNum = parseFloat(fps);
    const validFps = [23.976, 24, 25, 29.97, 30, 50, 59.94, 60];

    if (!validFps.includes(fpsNum)) {
      throw new Error(`帧率无效，支持: ${validFps.join(', ')}`);
    }

    return await api.get(`/ctrl/set?rec_fps=${fpsNum}`);
  }

  /**
   * 获取视频编码器
   * API: /ctrl/get?k=video_encoder
   */
  static async getVideoEncoder(api) {
    return await api.get('/ctrl/get?k=video_encoder');
  }

  /**
   * 设置视频编码器
   * API: /ctrl/set?video_encoder={encoder}
   */
  static async setVideoEncoder(api, encoder) {
    const validEncoders = ['h264', 'h265', 'prores'];
    if (!validEncoders.includes(encoder)) {
      throw new Error(`编码器无效，支持: ${validEncoders.join(', ')}`);
    }

    return await api.get(`/ctrl/set?video_encoder=${encoder}`);
  }

  /**
   * 获取文件格式
   * API: /ctrl/get?k=record_file_format
   */
  static async getFileFormat(api) {
    return await api.get('/ctrl/get?k=record_file_format');
  }

  /**
   * 设置文件格式
   * API: /ctrl/set?record_file_format={format}
   */
  static async setFileFormat(api, format) {
    const validFormats = ['mov', 'mp4'];
    if (!validFormats.includes(format)) {
      throw new Error(`文件格式无效，支持: ${validFormats.join(', ')}`);
    }

    return await api.get(`/ctrl/set?record_file_format=${format}`);
  }

  /**
   * 获取文件旋转
   * API: /ctrl/get?k=rotation
   */
  static async getRotation(api) {
    return await api.get('/ctrl/get?k=rotation');
  }

  /**
   * 设置文件旋转
   * API: /ctrl/set?rotation={rotation}
   */
  static async setRotation(api, rotation) {
    const rotationNum = parseInt(rotation);
    const validRotations = [0, 90, 180, 270];

    if (!validRotations.includes(rotationNum)) {
      throw new Error(`旋转角度无效，支持: ${validRotations.join(', ')}`);
    }

    return await api.get(`/ctrl/set?rotation=${rotationNum}`);
  }

  /**
   * 获取分段时长
   * API: /ctrl/get?k=split_duration
   */
  static async getSplitDuration(api) {
    return await api.get('/ctrl/get?k=split_duration');
  }

  /**
   * 设置分段时长
   * API: /ctrl/set?split_duration={duration}
   */
  static async setSplitDuration(api, duration) {
    const durationNum = parseInt(duration);
    if (isNaN(durationNum) || durationNum < 60 || durationNum > 3600) {
      throw new Error('分段时长必须是60-3600秒之间的数字');
    }

    return await api.get(`/ctrl/set?split_duration=${durationNum}`);
  }

  // ===== VFR控制 =====

  /**
   * 获取VFR控制
   * API: /ctrl/get?k=vfr_ctrl
   */
  static async getVfrControl(api) {
    return await api.get('/ctrl/get?k=vfr_ctrl');
  }

  /**
   * 设置VFR控制
   * API: /ctrl/set?vfr_ctrl={enable}
   */
  static async setVfrControl(api, enable) {
    const value = enable === true || enable === '1' || enable === 'on' ? '1' : '0';
    return await api.get(`/ctrl/set?vfr_ctrl=${value}`);
  }

  /**
   * 获取MOV VFR
   * API: /ctrl/get?k=movvfr
   */
  static async getMovVfr(api) {
    return await api.get('/ctrl/get?k=movvfr');
  }

  /**
   * 设置MOV VFR
   * API: /ctrl/set?movvfr={enable}
   */
  static async setMovVfr(api, enable) {
    const value = enable === true || enable === '1' || enable === 'on' ? '1' : '0';
    return await api.get(`/ctrl/set?movvfr=${value}`);
  }

  // ===== 元数据设置 =====

  /**
   * 获取录制元数据设置
   * API: /ctrl/get?k=record_meta
   */
  static async getRecordMeta(api) {
    return await api.get('/ctrl/get?k=record_meta');
  }

  /**
   * 设置录制元数据
   * API: /ctrl/set?record_meta={enable}
   */
  static async setRecordMeta(api, enable) {
    const value = enable === true || enable === '1' || enable === 'on' ? '1' : '0';
    return await api.get(`/ctrl/set?record_meta=${value}`);
  }

  /**
   * 获取相机ID
   * API: /ctrl/get?k=camera_id
   */
  static async getCameraId(api) {
    return await api.get('/ctrl/get?k=camera_id');
  }

  /**
   * 设置相机ID
   * API: /ctrl/set?camera_id={id}
   */
  static async setCameraId(api, id) {
    if (!id || typeof id !== 'string') {
      throw new Error('相机ID不能为空');
    }
    if (id.length > 32) {
      throw new Error('相机ID长度不能超过32个字符');
    }

    return await api.get(`/ctrl/set?camera_id=${encodeURIComponent(id)}`);
  }

  /**
   * 获取卷名
   * API: /ctrl/get?k=reelname
   */
  static async getReelname(api) {
    return await api.get('/ctrl/get?k=reelname');
  }

  /**
   * 设置卷名
   * API: /ctrl/set?reelname={reelname}
   */
  static async setReelname(api, reelname) {
    if (!reelname || typeof reelname !== 'string') {
      throw new Error('卷名不能为空');
    }
    if (reelname.length > 32) {
      throw new Error('卷名长度不能超过32个字符');
    }

    return await api.get(`/ctrl/set?reelname=${encodeURIComponent(reelname)}`);
  }

  // ===== 其他录制设置 =====

  /**
   * 获取RAW over HDMI
   * API: /ctrl/get?k=raw_over_hdmi
   */
  static async getRawOverHdmi(api) {
    return await api.get('/ctrl/get?k=raw_over_hdmi');
  }

  /**
   * 设置RAW over HDMI
   * API: /ctrl/set?raw_over_hdmi={enable}
   */
  static async setRawOverHdmi(api, enable) {
    const value = enable === true || enable === '1' || enable === 'on' ? '1' : '0';
    return await api.get(`/ctrl/set?raw_over_hdmi=${value}`);
  }

  /**
   * 获取录制帧指示器
   * API: /ctrl/get?k=rec_frame_indicator
   */
  static async getRecFrameIndicator(api) {
    return await api.get('/ctrl/get?k=rec_frame_indicator');
  }

  /**
   * 设置录制帧指示器
   * API: /ctrl/set?rec_frame_indicator={enable}
   */
  static async setRecFrameIndicator(api, enable) {
    const value = enable === true || enable === '1' || enable === 'on' ? '1' : '0';
    return await api.get(`/ctrl/set?rec_frame_indicator=${value}`);
  }

  // ===== 预卷录制 =====

  /**
   * 获取预卷设置
   * API: /ctrl/get?k=preroll
   */
  static async getPreroll(api) {
    return await api.get('/ctrl/get?k=preroll');
  }

  /**
   * 设置预卷
   * API: /ctrl/set?preroll={enable}
   */
  static async setPreroll(api, enable) {
    const value = enable === true || enable === '1' || enable === 'on' ? '1' : '0';
    return await api.get(`/ctrl/set?preroll=${value}`);
  }

  /**
   * 获取预卷时长
   * API: /ctrl/get?k=preroll_duration
   */
  static async getPrerollDuration(api) {
    return await api.get('/ctrl/get?k=preroll_duration`);
  }

  /**
   * 设置预卷时长
   * API: /ctrl/set?preroll_duration={duration}
   */
  static async setPrerollDuration(api, duration) {
    const durationNum = parseInt(duration);
    if (isNaN(durationNum) || durationNum < 1 || durationNum > 30) {
      throw new Error('预卷时长必须是1-30秒之间的数字');
    }

    return await api.get(`/ctrl/set?preroll_duration=${durationNum}`);
  }

  // ===== 拍照功能 =====

  /**
   * 拍摄照片
   * API: /ctrl/still?action=cap
   */
  static async capturePhoto(api) {
    return await api.get('/ctrl/still?action=cap');
  }

  /**
   * 获取照片质量
   * API: /ctrl/get?k=photo_q
   */
  static async getPhotoQuality(api) {
    return await api.get('/ctrl/get?k=photo_q');
  }

  /**
   * 设置照片质量
   * API: /ctrl/set?photo_q={quality}
   */
  static async setPhotoQuality(api, quality) {
    const validQualities = ['fine', 'normal', 'basic'];
    if (!validQualities.includes(quality)) {
      throw new Error(`照片质量无效，支持: ${validQualities.join(', ')}`);
    }

    return await api.get(`/ctrl/set?photo_q=${quality}`);
  }

  // ===== 回放控制 =====

  /**
   * 查询回放状态
   * API: /ctrl/pb?action=query
   */
  static async getPlaybackStatus(api) {
    return await api.get('/ctrl/pb?action=query');
  }

  // ===== 辅助方法 =====

  /**
   * 获取所有录制参数
   */
  static async getAllRecordingParams(api) {
    const params = [
      'resolution', 'project_fps', 'rec_fps', 'video_encoder',
      'record_file_format', 'rotation', 'split_duration', 'vfr_ctrl',
      'movvfr', 'record_meta', 'camera_id', 'reelname',
      'raw_over_hdmi', 'rec_frame_indicator', 'preroll', 'preroll_duration'
    ];

    const results = {};
    for (const param of params) {
      try {
        const result = await api.get(`/ctrl/get?k=${param}`);
        results[param] = result;
      } catch (error) {
        results[param] = { error: error.message };
      }
    }

    return results;
  }

  /**
   * 批量设置录制参数
   */
  static async batchSetRecordingParams(api, params) {
    const results = [];

    for (const [key, value] of Object.entries(params)) {
      try {
        const result = await api.get(`/ctrl/set?${key}=${encodeURIComponent(value)}`);
        results.push({ key, value, success: true, result });
      } catch (error) {
        results.push({ key, value, success: false, error: error.message });
      }
    }

    return results;
  }

  /**
   * 验证时间码格式
   */
  static validateTimecode(timecode) {
    const timecodeRegex = /^\d{2}:\d{2}:\d{2}:\d{2}$/;
    if (!timecodeRegex.test(timecode)) {
      throw new Error('时间码格式错误，应为 HH:MM:SS:FF');
    }

    const [hours, minutes, seconds, frames] = timecode.split(':').map(Number);

    if (hours > 23 || minutes > 59 || seconds > 59 || frames > 59) {
      throw new Error('时间码数值超出有效范围');
    }

    return true;
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
    if (width < 1 || height < 1 || width > 8192 || height > 4320) {
      throw new Error('分辨率数值超出有效范围');
    }

    return true;
  }
}

module.exports = RecordService;