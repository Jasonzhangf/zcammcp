/**
 * 图像服务层 - 封装图像视频设置的API调用
 * 对应官方API: Api.exposure, Api.whiteBalance, Api.image, Api.video, Api.audio
 */

class ImageService {
  // ===== 曝光控制 =====

  /**
   * 获取EV补偿
   * API: /ctrl/get?k=ev
   */
  static async getEv(api) {
    return await api.get('/ctrl/get?k=ev');
  }

  /**
   * 设置EV补偿
   * API: /ctrl/set?ev={value}
   */
  static async setEv(api, value) {
    const evValue = parseFloat(value);
    if (isNaN(evValue) || evValue < -96 || evValue > 96) {
      throw new Error('EV补偿必须是-96到+96之间的数值');
    }
    return await api.get(`/ctrl/set?ev=${evValue}`);
  }

  /**
   * 获取光圈值
   * API: /ctrl/get?k=iris
   */
  static async getIris(api) {
    return await api.get('/ctrl/get?k=iris');
  }

  /**
   * 兼容别名：获取光圈值
   */
  static async getAperture(api) {
    return await this.getIris(api);
  }

  /**
   * 设置光圈值
   * API: /ctrl/set?iris={value}
   */
  static async setIris(api, value) {
    let irisValue;
    if (typeof value === 'string' && value.toLowerCase().startsWith('f')) {
      // F值格式，如 F2.8
      const fNumber = parseFloat(value.substring(1));
      if (isNaN(fNumber) || fNumber < 1.4 || fNumber > 22) {
        throw new Error('光圈F值必须是F1.4到F22之间的数值');
      }
      irisValue = fNumber;
    } else {
      // 数值格式
      irisValue = parseFloat(value);
      if (isNaN(irisValue) || irisValue < 1.4 || irisValue > 22) {
        throw new Error('光圈值必须是1.4到22之间的数值');
      }
    }
    return await api.get(`/ctrl/set?iris=${irisValue}`);
  }

  /**
   * 获取ISO感光度
   * API: /ctrl/get?k=iso
   */
  static async getIso(api) {
    return await api.get('/ctrl/get?k=iso');
  }

  /**
   * 设置ISO感光度
   * API: /ctrl/set?iso={value}
   */
  static async setIso(api, value) {
    const isoValue = parseInt(value);
    const validIsoValues = [100, 200, 400, 800, 1600, 3200, 6400, 12800, 25600];

    if (!validIsoValues.includes(isoValue)) {
      throw new Error(`ISO无效，支持: ${validIsoValues.join(', ')}`);
    }
    return await api.get(`/ctrl/set?iso=${isoValue}`);
  }

  /**
   * 获取最小ISO
   * API: /ctrl/get?k=min_iso
   */
  static async getMinIso(api) {
    return await api.get('/ctrl/get?k=min_iso');
  }

  /**
   * 设置最小ISO
   * API: /ctrl/set?min_iso={value}
   */
  static async setMinIso(api, value) {
    const isoValue = parseInt(value);
    const validIsoValues = [100, 200, 400, 800];

    if (!validIsoValues.includes(isoValue)) {
      throw new Error(`最小ISO无效，支持: ${validIsoValues.join(', ')}`);
    }
    return await api.get(`/ctrl/set?min_iso=${isoValue}`);
  }

  /**
   * 获取最大ISO
   * API: /ctrl/get?k=max_iso
   */
  static async getMaxIso(api) {
    return await api.get('/ctrl/get?k=max_iso');
  }

  /**
   * 设置最大ISO
   * API: /ctrl/set?max_iso={value}
   */
  static async setMaxIso(api, value) {
    const isoValue = parseInt(value);
    const validIsoValues = [800, 1600, 3200, 6400, 12800, 25600];

    if (!validIsoValues.includes(isoValue)) {
      throw new Error(`最大ISO无效，支持: ${validIsoValues.join(', ')}`);
    }
    return await api.get(`/ctrl/set?max_iso=${isoValue}`);
  }

  /**
   * 获取ISO控制
   * API: /ctrl/get?k=iso_ctrl
   */
  static async getIsoControl(api) {
    return await api.get('/ctrl/get?k=iso_ctrl');
  }

  /**
   * 设置ISO控制
   * API: /ctrl/set?iso_ctrl={enable}
   */
  static async setIsoControl(api, enable) {
    const value = enable === true || enable === '1' || enable === 'on' ? '1' : '0';
    return await api.get(`/ctrl/set?iso_ctrl=${value}`);
  }

  /**
   * 获取快门角度控制
   * API: /ctrl/get?k=shutter_angle_ctrl
   */
  static async getShutterAngleControl(api) {
    return await api.get('/ctrl/get?k=shutter_angle_ctrl');
  }

  /**
   * 设置快门角度控制
   * API: /ctrl/set?shutter_angle_ctrl={enable}
   */
  static async setShutterAngleControl(api, enable) {
    const value = enable === true || enable === '1' || enable === 'on' ? '1' : '0';
    return await api.get(`/ctrl/set?shutter_angle_ctrl=${value}`);
  }

  /**
   * 获取快门操作
   * API: /ctrl/get?k=sht_operation
   */
  static async getShutterOperation(api) {
    return await api.get('/ctrl/get?k=sht_operation');
  }

  /**
   * 设置快门操作
   * API: /ctrl/set?sht_operation={operation}
   */
  static async setShutterOperation(api, operation) {
    const validOperations = ['angle', 'speed'];
    if (!validOperations.includes(operation)) {
      throw new Error(`快门操作无效，支持: ${validOperations.join(', ')}`);
    }
    return await api.get(`/ctrl/set?sht_operation=${operation}`);
  }

  /**
   * 设置快门速度
   * API: /ctrl/set?shutter_angle={value}
   */
  static async setShutter(api, value) {
    let shutterValue;

    if (typeof value === 'string' && value.includes('/')) {
      // 分数格式，如 1/60
      const [numerator, denominator] = value.split('/').map(Number);
      if (isNaN(numerator) || isNaN(denominator) || denominator === 0) {
        throw new Error('快门速度格式错误');
      }
      shutterValue = 360 / (numerator / denominator); // 转换为角度
    } else {
      // 数值或角度格式
      const numValue = parseFloat(value);
      if (isNaN(numValue)) {
        throw new Error('快门值必须是数字');
      }

      if (numValue <= 1) {
        // 小于等于1认为是角度值
        if (numValue < 1 || numValue > 360) {
          throw new Error('快门角度必须是1-360度之间的数值');
        }
        shutterValue = numValue;
      } else {
        // 大于1认为是秒数，转换为角度
        shutterValue = 360 / numValue;
        if (shutterValue < 1 || shutterValue > 360) {
          throw new Error('快门速度超出有效范围');
        }
      }
    }

    return await api.get(`/ctrl/set?shutter_angle=${shutterValue}`);
  }

  /**
   * 获取防闪烁设置
   * API: /ctrl/get?k=flicker
   */
  static async getAntiFlicker(api) {
    return await api.get('/ctrl/get?k=flicker');
  }

  /**
   * 设置防闪烁
   * API: /ctrl/set?flicker={mode}
   */
  static async setAntiFlicker(api, mode) {
    const validModes = ['50', '60', 'off'];
    if (!validModes.includes(mode.toLowerCase())) {
      throw new Error(`防闪烁模式无效，支持: ${validModes.join(', ')}`);
    }
    return await api.get(`/ctrl/set?flicker=${mode.toLowerCase()}`);
  }

  /**
   * 获取测光模式
   * API: /ctrl/get?k=meter_mode
   */
  static async getMeterMode(api) {
    return await api.get('/ctrl/get?k=meter_mode');
  }

  /**
   * 设置测光模式
   * API: /ctrl/set?meter_mode={mode}
   */
  static async setMeterMode(api, mode) {
    const validModes = ['center', 'average', 'spot'];
    if (!validModes.includes(mode.toLowerCase())) {
      throw new Error(`测光模式无效，支持: ${validModes.join(', ')}`);
    }
    return await api.get(`/ctrl/set?meter_mode=${mode.toLowerCase()}`);
  }

  // ===== 白平衡控制 =====

  /**
   * 获取白平衡模式
   * API: /ctrl/get?k=wb
   */
  static async getWhiteBalanceMode(api) {
    return await api.get('/ctrl/get?k=wb');
  }

  /**
   * 设置白平衡模式
   * API: /ctrl/set?wb={mode}
   */
  static async setWhiteBalanceMode(api, mode) {
    const validModes = ['auto', 'manual', 'daylight', 'tungsten', 'fluorescent', 'cloudy', 'shade'];
    if (!validModes.includes(mode.toLowerCase())) {
      throw new Error(`白平衡模式无效，支持: ${validModes.join(', ')}`);
    }
    return await api.get(`/ctrl/set?wb=${mode.toLowerCase()}`);
  }

  /**
   * 获取手动色温
   * API: /ctrl/get?k=mwb
   */
  static async getManualKelvin(api) {
    return await api.get('/ctrl/get?k=mwb');
  }

  /**
   * 设置手动色温
   * API: /ctrl/set?mwb={kelvin}
   */
  static async setManualKelvin(api, value) {
    const kelvin = parseInt(value);
    if (isNaN(kelvin) || kelvin < 2000 || kelvin > 10000) {
      throw new Error('色温必须是2000K-10000K之间的整数');
    }
    return await api.get(`/ctrl/set?mwb=${kelvin}`);
  }

  /**
   * 获取手动色调
   * API: /ctrl/get?k=tint
   */
  static async getManualTint(api) {
    return await api.get('/ctrl/get?k=tint');
  }

  /**
   * 设置手动色调
   * API: /ctrl/set?tint={value}
   */
  static async setManualTint(api, value) {
    const tintValue = parseInt(value);
    if (isNaN(tintValue) || tintValue < -50 || tintValue > 50) {
      throw new Error('色调必须是-50到+50之间的整数');
    }
    return await api.get(`/ctrl/set?tint=${tintValue}`);
  }

  /**
   * 获取手动R增益
   * API: /ctrl/get?k=mwb_r
   */
  static async getManualR(api) {
    return await api.get('/ctrl/get?k=mwb_r');
  }

  /**
   * 设置手动R增益
   * API: /ctrl/set?mwb_r={value}
   */
  static async setManualR(api, value) {
    const rValue = parseInt(value);
    if (isNaN(rValue) || rValue < 0 || rValue > 255) {
      throw new Error('R增益必须是0-255之间的整数');
    }
    return await api.get(`/ctrl/set?mwb_r=${rValue}`);
  }

  /**
   * 获取手动G增益
   * API: /ctrl/get?k=mwb_g
   */
  static async getManualG(api) {
    return await api.get('/ctrl/get?k=mwb_g');
  }

  /**
   * 设置手动G增益
   * API: /ctrl/set?mwb_g={value}
   */
  static async setManualG(api, value) {
    const gValue = parseInt(value);
    if (isNaN(gValue) || gValue < 0 || gValue > 255) {
      throw new Error('G增益必须是0-255之间的整数');
    }
    return await api.get(`/ctrl/set?mwb_g=${gValue}`);
  }

  /**
   * 获取手动B增益
   * API: /ctrl/get?k=mwb_b
   */
  static async getManualB(api) {
    return await api.get('/ctrl/get?k=mwb_b');
  }

  /**
   * 设置手动B增益
   * API: /ctrl/set?mwb_b={value}
   */
  static async setManualB(api, value) {
    const bValue = parseInt(value);
    if (isNaN(bValue) || bValue < 0 || bValue > 255) {
      throw new Error('B增益必须是0-255之间的整数');
    }
    return await api.get(`/ctrl/set?mwb_b=${bValue}`);
  }

  /**
   * 获取AWB优先级
   * API: /ctrl/get?k=wb_priority
   */
  static async getAwbPriority(api) {
    return await api.get('/ctrl/get?k=wb_priority');
  }

  /**
   * 设置AWB优先级
   * API: /ctrl/set?wb_priority={priority}
   */
  static async setAwbPriority(api, priority) {
    const validPriorities = ['accuracy', 'speed'];
    if (!validPriorities.includes(priority.toLowerCase())) {
      throw new Error(`AWB优先级无效，支持: ${validPriorities.join(', ')}`);
    }
    return await api.get(`/ctrl/set?wb_priority=${priority.toLowerCase()}`);
  }

  /**
   * 获取录制中锁定AWB
   * API: /ctrl/get?k=lock_awb_in_rec
   */
  static async getLockAwbInRec(api) {
    return await api.get('/ctrl/get?k=lock_awb_in_rec');
  }

  /**
   * 设置录制中锁定AWB
   * API: /ctrl/set?lock_awb_in_rec={enable}
   */
  static async setLockAwbInRec(api, enable) {
    const value = enable === true || enable === '1' || enable === 'on' ? '1' : '0';
    return await api.get(`/ctrl/set?lock_awb_in_rec=${value}`);
  }

  /**
   * 一键白平衡
   * API: /ctrl/wb?action=one_push
   */
  static async onePushWhiteBalance(api) {
    return await api.get('/ctrl/wb?action=one_push');
  }

  // ===== 图像调整 =====

  /**
   * 获取图像配置文件
   * API: /ctrl/get?k=lut
   */
  static async getImageProfile(api) {
    return await api.get('/ctrl/get?k=lut');
  }

  /**
   * 设置图像配置文件
   * API: /ctrl/set?lut={profile}
   */
  static async setImageProfile(api, profile) {
    const validProfiles = ['rec709', 'slog3', 'slog2', 'zlog2', 'zlog3', 'hlgbt', 'bt709', 'bt2020'];
    if (!validProfiles.includes(profile.toLowerCase())) {
      throw new Error(`图像配置文件无效，支持: ${validProfiles.join(', ')}`);
    }
    return await api.get(`/ctrl/set?lut=${profile.toLowerCase()}`);
  }

  /**
   * 获取降噪设置
   * API: /ctrl/get?k=noise_reduction
   */
  static async getNoiseReduction(api) {
    return await api.get('/ctrl/get?k=noise_reduction');
  }

  /**
   * 设置降噪
   * API: /ctrl/set?noise_reduction={enable}
   */
  static async setNoiseReduction(api, enable) {
    const value = enable === true || enable === '1' || enable === 'on' ? '1' : '0';
    return await api.get(`/ctrl/set?noise_reduction=${value}`);
  }

  /**
   * 获取亮度级别
   * API: /ctrl/get?k=luma_level
   */
  static async getLumaLevel(api) {
    return await api.get('/ctrl/get?k=luma_level');
  }

  /**
   * 设置亮度级别
   * API: /ctrl/set?luma_level={level}
   */
  static async setLumaLevel(api, level) {
    const levelValue = parseInt(level);
    if (isNaN(levelValue) || levelValue < 0 || levelValue > 100) {
      throw new Error('亮度级别必须是0-100之间的整数');
    }
    return await api.get(`/ctrl/set?luma_level=${levelValue}`);
  }

  /**
   * 获取亮度
   * API: /ctrl/get?k=brightness
   */
  static async getBrightness(api) {
    return await api.get('/ctrl/get?k=brightness');
  }

  /**
   * 设置亮度
   * API: /ctrl/set?brightness={value}
   */
  static async setBrightness(api, value) {
    const brightnessValue = parseInt(value);
    if (isNaN(brightnessValue) || brightnessValue < 0 || brightnessValue > 100) {
      throw new Error('亮度必须是0-100之间的整数');
    }
    return await api.get(`/ctrl/set?brightness=${brightnessValue}`);
  }

  /**
   * 获取对比度
   * API: /ctrl/get?k=contrast
   */
  static async getContrast(api) {
    return await api.get('/ctrl/get?k=contrast');
  }

  /**
   * 设置对比度
   * API: /ctrl/set?contrast={value}
   */
  static async setContrast(api, value) {
    const contrastValue = parseInt(value);
    if (isNaN(contrastValue) || contrastValue < 0 || contrastValue > 100) {
      throw new Error('对比度必须是0-100之间的整数');
    }
    return await api.get(`/ctrl/set?contrast=${contrastValue}`);
  }

  /**
   * 获取饱和度
   * API: /ctrl/get?k=saturation
   */
  static async getSaturation(api) {
    return await api.get('/ctrl/get?k=saturation');
  }

  /**
   * 设置饱和度
   * API: /ctrl/set?saturation={value}
   */
  static async setSaturation(api, value) {
    const saturationValue = parseInt(value);
    if (isNaN(saturationValue) || saturationValue < 0 || saturationValue > 100) {
      throw new Error('饱和度必须是0-100之间的整数');
    }
    return await api.get(`/ctrl/set?saturation=${saturationValue}`);
  }

  /**
   * 获取锐度
   * API: /ctrl/get?k=sharpness
   */
  static async getSharpness(api) {
    return await api.get('/ctrl/get?k=sharpness');
  }

  /**
   * 设置锐度
   * API: /ctrl/set?sharpness={value}
   */
  static async setSharpness(api, value) {
    const sharpnessValue = parseInt(value);
    if (isNaN(sharpnessValue) || sharpnessValue < 0 || sharpnessValue > 100) {
      throw new Error('锐度必须是0-100之间的整数');
    }
    return await api.get(`/ctrl/set?sharpness=${sharpnessValue}`);
  }

  /**
   * 获取色调
   * API: /ctrl/get?k=hue
   */
  static async getHue(api) {
    return await api.get('/ctrl/get?k=hue');
  }

  /**
   * 设置色调
   * API: /ctrl/set?hue={value}
   */
  static async setHue(api, value) {
    const hueValue = parseInt(value);
    if (isNaN(hueValue) || hueValue < -50 || hueValue > 50) {
      throw new Error('色调必须是-50到+50之间的整数');
    }
    return await api.get(`/ctrl/set?hue=${hueValue}`);
  }

  // ===== 视频设置 =====

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
    if (!validEncoders.includes(encoder.toLowerCase())) {
      throw new Error(`视频编码器无效，支持: ${validEncoders.join(', ')}`);
    }
    return await api.get(`/ctrl/set?video_encoder=${encoder.toLowerCase()}`);
  }

  /**
   * 获取码率级别
   * API: /ctrl/get?k=bitrate_level
   */
  static async getBitrateLevel(api) {
    return await api.get('/ctrl/get?k=bitrate_level');
  }

  /**
   * 设置码率级别
   * API: /ctrl/set?bitrate_level={level}
   */
  static async setBitrateLevel(api, level) {
    const validLevels = ['low', 'medium', 'high', 'max'];
    if (!validLevels.includes(level.toLowerCase())) {
      throw new Error(`码率级别无效，支持: ${validLevels.join(', ')}`);
    }
    return await api.get(`/ctrl/set?bitrate_level=${level.toLowerCase()}`);
  }

  /**
   * 获取合成模式
   * API: /ctrl/get?k=compose_mode
   */
  static async getComposeMode(api) {
    return await api.get('/ctrl/get?k=compose_mode');
  }

  /**
   * 设置合成模式
   * API: /ctrl/set?compose_mode={mode}
   */
  static async setComposeMode(api, mode) {
    const validModes = ['normal', 'anamorphic'];
    if (!validModes.includes(mode.toLowerCase())) {
      throw new Error(`合成模式无效，支持: ${validModes.join(', ')}`);
    }
    return await api.get(`/ctrl/set?compose_mode=${mode.toLowerCase()}`);
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
    if (!validQualities.includes(quality.toLowerCase())) {
      throw new Error(`照片质量无效，支持: ${validQualities.join(', ')}`);
    }
    return await api.get(`/ctrl/set?photo_q=${quality.toLowerCase()}`);
  }

  /**
   * 获取电子防抖
   * API: /ctrl/get?k=eis_on_off
   */
  static async getEisOnOff(api) {
    return await api.get('/ctrl/get?k=eis_on_off');
  }

  /**
   * 设置电子防抖
   * API: /ctrl/set?eis_on_off={enable}
   */
  static async setEisOnOff(api, enable) {
    const value = enable === true || enable === '1' || enable === 'on' ? '1' : '0';
    return await api.get(`/ctrl/set?eis_on_off=${value}`);
  }

  /**
   * 获取视频旋转
   * API: /ctrl/get?k=vid_rot
   */
  static async getVideoRotation(api) {
    return await api.get('/ctrl/get?k=vid_rot');
  }

  /**
   * 设置视频旋转
   * API: /ctrl/set?vid_rot={rotation}
   */
  static async setVideoRotation(api, rotation) {
    const rotationValue = parseInt(rotation);
    const validRotations = [0, 90, 180, 270];
    if (!validRotations.includes(rotationValue)) {
      throw new Error(`视频旋转角度无效，支持: ${validRotations.join(', ')}`);
    }
    return await api.get(`/ctrl/set?vid_rot=${rotationValue}`);
  }

  /**
   * 获取录制模式
   * API: /ctrl/get?k=record_mode
   */
  static async getRecordMode(api) {
    return await api.get('/ctrl/get?k=record_mode');
  }

  /**
   * 设置录制模式
   * API: /ctrl/set?record_mode={mode}
   */
  static async setRecordMode(api, mode) {
    const validModes = ['normal', 'timelapse', 'burst'];
    if (!validModes.includes(mode.toLowerCase())) {
      throw new Error(`录制模式无效，支持: ${validModes.join(', ')}`);
    }
    return await api.get(`/ctrl/set?record_mode=${mode.toLowerCase()}`);
  }

  /**
   * 获取视频延时摄影间隔
   * API: /ctrl/get?k=video_tl_interval
   */
  static async getVideoTimelapseInterval(api) {
    return await api.get('/ctrl/get?k=video_tl_interval');
  }

  /**
   * 设置视频延时摄影间隔
   * API: /ctrl/set?video_tl_interval={interval}
   */
  static async setVideoTimelapseInterval(api, interval) {
    const intervalValue = parseInt(interval);
    if (isNaN(intervalValue) || intervalValue < 1 || intervalValue > 3600) {
      throw new Error('延时摄影间隔必须是1-3600秒之间的整数');
    }
    return await api.get(`/ctrl/set?video_tl_interval=${intervalValue}`);
  }

  /**
   * 获取低Jello设置
   * API: /ctrl/get?k=low_jello
   */
  static async getLowJello(api) {
    return await api.get('/ctrl/get?k=low_jello');
  }

  /**
   * 设置低Jello
   * API: /ctrl/set?low_jello={enable}
   */
  static async setLowJello(api, enable) {
    const value = enable === true || enable === '1' || enable === 'on' ? '1' : '0';
    return await api.get(`/ctrl/set?low_jello=${value}`);
  }

  // ===== 音频设置 =====

  /**
   * 获取音频编码器
   * API: /ctrl/get?k=primary_audio
   */
  static async getAudioEncoder(api) {
    return await api.get('/ctrl/get?k=primary_audio');
  }

  /**
   * 设置音频编码器
   * API: /ctrl/set?primary_audio={encoder}
   */
  static async setAudioEncoder(api, encoder) {
    const validEncoders = ['aac', 'pcm'];
    if (!validEncoders.includes(encoder.toLowerCase())) {
      throw new Error(`音频编码器无效，支持: ${validEncoders.join(', ')}`);
    }
    return await api.get(`/ctrl/set?primary_audio=${encoder.toLowerCase()}`);
  }

  /**
   * 获取音频通道
   * API: /ctrl/get?k=audio_channel
   */
  static async getAudioChannel(api) {
    return await api.get('/ctrl/get?k=audio_channel');
  }

  /**
   * 设置音频通道
   * API: /ctrl/set?audio_channel={channel}
   */
  static async setAudioChannel(api, channel) {
    const validChannels = ['stereo', 'mono'];
    if (!validChannels.includes(channel.toLowerCase())) {
      throw new Error(`音频通道无效，支持: ${validChannels.join(', ')}`);
    }
    return await api.get(`/ctrl/set?audio_channel=${channel.toLowerCase()}`);
  }

  /**
   * 获取幻象电源
   * API: /ctrl/get?k=audio_phantom_power
   */
  static async getPhantomPower(api) {
    return await api.get('/ctrl/get?k=audio_phantom_power');
  }

  /**
   * 设置幻象电源
   * API: /ctrl/set?audio_phantom_power={power}
   */
  static async setPhantomPower(api, power) {
    const validPower = ['48', 'off'];
    if (!validPower.includes(power.toLowerCase())) {
      throw new Error(`幻象电源无效，支持: ${validPower.join(', ')}`);
    }
    return await api.get(`/ctrl/set?audio_phantom_power=${power.toLowerCase()}`);
  }

  /**
   * 获取音频电平显示
   * API: /ctrl/get?k=audio_level_display
   */
  static async getAudioLevelDisplay(api) {
    return await api.get('/ctrl/get?k=audio_level_display');
  }

  /**
   * 设置音频电平显示
   * API: /ctrl/set?audio_level_display={display}
   */
  static async setAudioLevelDisplay(api, display) {
    const value = display === true || display === '1' || display === 'on' ? '1' : '0';
    return await api.get(`/ctrl/set?audio_level_display=${value}`);
  }

  /**
   * 获取音频输入增益类型
   * API: /ctrl/get?k=ain_gain_type
   */
  static async getAudioInGainType(api) {
    return await api.get('/ctrl/get?k=ain_gain_type');
  }

  /**
   * 设置音频输入增益类型
   * API: /ctrl/set?ain_gain_type={type}
   */
  static async setAudioInGainType(api, type) {
    const validTypes = ['mic', 'line'];
    if (!validTypes.includes(type.toLowerCase())) {
      throw new Error(`音频输入增益类型无效，支持: ${validTypes.join(', ')}`);
    }
    return await api.get(`/ctrl/set?ain_gain_type=${type.toLowerCase()}`);
  }

  /**
   * 获取音频输入电平
   * API: /ctrl/get?k=audio_input_level
   */
  static async getAudioInputLevel(api) {
    return await api.get('/ctrl/get?k=audio_input_level');
  }

  /**
   * 设置音频输入电平
   * API: /ctrl/set?audio_input_level={level}
   */
  static async setAudioInputLevel(api, level) {
    const levelValue = parseInt(level);
    if (isNaN(levelValue) || levelValue < 0 || levelValue > 100) {
      throw new Error('音频输入电平必须是0-100之间的整数');
    }
    return await api.get(`/ctrl/set?audio_input_level=${levelValue}`);
  }

  /**
   * 获取音频输入增益
   * API: /ctrl/get?k=audio_input_gain
   */
  static async getAudioInputGain(api) {
    return await api.get('/ctrl/get?k=audio_input_gain');
  }

  /**
   * 设置音频输入增益
   * API: /ctrl/set?audio_input_gain={gain}
   */
  static async setAudioInputGain(api, gain) {
    const gainValue = parseInt(gain);
    if (isNaN(gainValue) || gainValue < 0 || gainValue > 100) {
      throw new Error('音频输入增益必须是0-100之间的整数');
    }
    return await api.get(`/ctrl/set?audio_input_gain=${gainValue}`);
  }

  /**
   * 获取音频输出增益
   * API: /ctrl/get?k=audio_output_gain
   */
  static async getAudioOutputGain(api) {
    return await api.get('/ctrl/get?k=audio_output_gain');
  }

  /**
   * 设置音频输出增益
   * API: /ctrl/set?audio_output_gain={gain}
   */
  static async setAudioOutputGain(api, gain) {
    const gainValue = parseInt(gain);
    if (isNaN(gainValue) || gainValue < 0 || gainValue > 100) {
      throw new Error('音频输出增益必须是0-100之间的整数');
    }
    return await api.get(`/ctrl/set?audio_output_gain=${gainValue}`);
  }

  /**
   * 获取音频噪声抑制
   * API: /ctrl/get?k=audio_noise_reduction
   */
  static async getAudioNoiseReduction(api) {
    return await api.get('/ctrl/get?k=audio_noise_reduction');
  }

  /**
   * 设置音频噪声抑制
   * API: /ctrl/set?audio_noise_reduction={enable}
   */
  static async setAudioNoiseReduction(api, enable) {
    const value = enable === true || enable === '1' || enable === 'on' ? '1' : '0';
    return await api.get(`/ctrl/set?audio_noise_reduction=${value}`);
  }

  // ===== 辅助方法 =====

  /**
   * 获取所有图像参数
   */
  static async getAllImageParams(api) {
    const params = [
      'ev', 'iris', 'iso', 'shutter_angle', 'flicker', 'meter_mode',
      'wb', 'mwb', 'tint', 'brightness', 'contrast', 'saturation',
      'sharpness', 'hue', 'lut', 'noise_reduction', 'video_encoder',
      'bitrate_level', 'eis_on_off', 'primary_audio', 'audio_channel'
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
   * 批量设置图像参数
   */
  static async batchSetImageParams(api, params) {
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
   * 验证EV值
   */
  static validateEv(value) {
    const evValue = parseFloat(value);
    if (isNaN(evValue) || evValue < -3.0 || evValue > 3.0) {
      throw new Error('EV补偿必须是-3.0到+3.0之间的数值');
    }
    return evValue;
  }

  /**
   * 验证光圈值
   */
  static validateIris(value) {
    let irisValue;
    if (typeof value === 'string' && value.toLowerCase().startsWith('f')) {
      irisValue = parseFloat(value.substring(1));
    } else {
      irisValue = parseFloat(value);
    }

    if (isNaN(irisValue) || irisValue < 1.4 || irisValue > 22) {
      throw new Error('光圈值必须是F1.4到F22之间的数值');
    }
    return irisValue;
  }

  /**
   * 验证ISO值
   */
  static validateIso(value) {
    const isoValue = parseInt(value);
    const validIsoValues = [100, 200, 400, 800, 1600, 3200, 6400, 12800, 25600];

    if (!validIsoValues.includes(isoValue)) {
      throw new Error(`ISO无效，支持: ${validIsoValues.join(', ')}`);
    }
    return isoValue;
  }

  /**
   * 验证快门值
   */
  static validateShutter(value) {
    let shutterValue;

    if (typeof value === 'string' && value.includes('/')) {
      // 分数格式，如 1/60
      const [numerator, denominator] = value.split('/').map(Number);
      if (isNaN(numerator) || isNaN(denominator) || denominator === 0) {
        throw new Error('快门速度格式错误');
      }
      shutterValue = 360 / (numerator / denominator);
    } else {
      const numValue = parseFloat(value);
      if (isNaN(numValue)) {
        throw new Error('快门值必须是数字');
      }

      if (numValue <= 1) {
        if (numValue < 1 || numValue > 360) {
          throw new Error('快门角度必须是1-360度之间的数值');
        }
        shutterValue = numValue;
      } else {
        shutterValue = 360 / numValue;
        if (shutterValue < 1 || shutterValue > 360) {
          throw new Error('快门速度超出有效范围');
        }
      }
    }

    return shutterValue;
  }

  /**
   * 验证色温值
   */
  static validateKelvin(value) {
    const kelvin = parseInt(value);
    if (isNaN(kelvin) || kelvin < 2000 || kelvin > 10000) {
      throw new Error('色温必须是2000K-10000K之间的整数');
    }
    return kelvin;
  }

  /**
   * 验证图像调整值
   */
  static validateImageValue(value, min = 0, max = 100) {
    const numValue = parseInt(value);
    if (isNaN(numValue) || numValue < min || numValue > max) {
      throw new Error(`数值必须是${min}-${max}之间的整数`);
    }
    return numValue;
  }
}

module.exports = ImageService;
