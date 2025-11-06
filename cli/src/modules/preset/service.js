/**
 * 预设服务层 - 封装预设位置管理的API调用
 * 对应官方API: Api.preset, Api.ptrace
 */

class PresetService {
  // ===== 基础预设操作 =====

  /**
   * 调用预设位置
   * API: /ctrl/preset?action=recall&index={index}
   */
  static async recallPreset(api, index) {
    const presetIndex = parseInt(index);
    if (isNaN(presetIndex) || presetIndex < 1 || presetIndex > 255) {
      throw new Error('预设索引必须是1-255之间的数字');
    }
    return await api.get(`/ctrl/preset?action=recall&index=${presetIndex}`);
  }

  /**
   * 保存当前位置到预设
   * API: /ctrl/preset?action=set&index={index}
   */
  static async savePreset(api, index) {
    const presetIndex = parseInt(index);
    if (isNaN(presetIndex) || presetIndex < 1 || presetIndex > 255) {
      throw new Error('预设索引必须是1-255之间的数字');
    }
    return await api.get(`/ctrl/preset?action=set&index=${presetIndex}`);
  }

  /**
   * 删除预设位置
   * API: /ctrl/preset?action=del&index={index}
   */
  static async deletePreset(api, index) {
    const presetIndex = parseInt(index);
    if (isNaN(presetIndex) || presetIndex < 1 || presetIndex > 255) {
      throw new Error('预设索引必须是1-255之间的数字');
    }
    return await api.get(`/ctrl/preset?action=del&index=${presetIndex}`);
  }

  /**
   * 获取预设信息
   * API: /ctrl/preset?action=get_info&index={index}
   */
  static async getPresetInfo(api, index) {
    const presetIndex = parseInt(index);
    if (isNaN(presetIndex) || presetIndex < 1 || presetIndex > 255) {
      throw new Error('预设索引必须是1-255之间的数字');
    }
    return await api.get(`/ctrl/preset?action=get_info&index=${presetIndex}`);
  }

  /**
   * 设置预设名称
   * API: /ctrl/preset?action=set_name&index={index}&new_name={name}
   */
  static async setPresetName(api, index, name) {
    const presetIndex = parseInt(index);
    if (isNaN(presetIndex) || presetIndex < 1 || presetIndex > 255) {
      throw new Error('预设索引必须是1-255之间的数字');
    }
    if (!name || typeof name !== 'string') {
      throw new Error('预设名称不能为空');
    }
    if (name.length > 50) {
      throw new Error('预设名称长度不能超过50个字符');
    }
    return await api.get(`/ctrl/preset?action=set_name&index=${presetIndex}&new_name=${encodeURIComponent(name)}`);
  }

  /**
   * 设置预设速度
   * API: /ctrl/preset?action=preset_speed&index={index}&preset_speed={speed}
   */
  static async setPresetSpeed(api, index, value, type = 'speed') {
    const presetIndex = parseInt(index);
    if (isNaN(presetIndex) || presetIndex < 1 || presetIndex > 255) {
      throw new Error('预设索引必须是1-255之间的数字');
    }

    let param, paramName;
    if (type === 'time') {
      const time = parseFloat(value);
      if (isNaN(time) || time < 0.1 || time > 60) {
        throw new Error('预设时间必须是0.1-60秒之间的数字');
      }
      param = `preset_time=${time}`;
      paramName = 'time';
    } else {
      const speed = parseInt(value);
      if (isNaN(speed) || speed < 1 || speed > 9) {
        throw new Error('预设速度必须是1-9之间的数字');
      }
      param = `preset_speed=${speed}`;
      paramName = 'speed';
    }

    return await api.get(`/ctrl/preset?action=preset_speed&index=${presetIndex}&${param}`);
  }

  /**
   * 获取通用速度
   * API: /ctrl/get?k=ptz_common_speed
   */
  static async getCommonSpeed(api) {
    return await api.get('/ctrl/get?k=ptz_common_speed');
  }

  /**
   * 设置通用速度
   * API: /ctrl/set?ptz_common_speed={speed}
   */
  static async setCommonSpeed(api, speed) {
    const speedNum = parseInt(speed);
    if (isNaN(speedNum) || speedNum < 1 || speedNum > 9) {
      throw new Error('通用速度必须是1-9之间的数字');
    }
    return await api.get(`/ctrl/set?ptz_common_speed=${speedNum}`);
  }

  /**
   * 获取通用时间
   * API: /ctrl/get?k=ptz_common_time
   */
  static async getCommonTime(api) {
    return await api.get('/ctrl/get?k=ptz_common_time');
  }

  /**
   * 设置通用时间
   * API: /ctrl/set?ptz_common_time={time}
   */
  static async setCommonTime(api, time) {
    const timeNum = parseFloat(time);
    if (isNaN(timeNum) || timeNum < 0.1 || timeNum > 60) {
      throw new Error('通用时间必须是0.1-60秒之间的数字');
    }
    return await api.get(`/ctrl/set?ptz_common_time=${timeNum}`);
  }

  // ===== 预设模式设置 =====

  /**
   * 获取预设调用模式
   * API: /ctrl/get?k=ptz_preset_mode
   */
  static async getRecallMode(api) {
    return await api.get('/ctrl/get?k=ptz_preset_mode');
  }

  /**
   * 设置预设调用模式
   * API: /ctrl/set?ptz_preset_mode={mode}
   */
  static async setRecallMode(api, mode) {
    const validModes = ['normal', 'smooth', 'fast'];
    if (!validModes.includes(mode)) {
      throw new Error(`调用模式无效，支持: ${validModes.join(', ')}`);
    }
    return await api.get(`/ctrl/set?ptz_preset_mode=${mode}`);
  }

  /**
   * 获取预设调用速度模式
   * API: /ctrl/get?k=ptz_speed_mode
   */
  static async getRecallSpeedMode(api) {
    return await api.get('/ctrl/get?k=ptz_speed_mode');
  }

  /**
   * 设置预设调用速度模式
   * API: /ctrl/set?ptz_speed_mode={mode}
   */
  static async setRecallSpeedMode(api, mode) {
    const validModes = ['default', 'high', 'low'];
    if (!validModes.includes(mode)) {
      throw new Error(`速度模式无效，支持: ${validModes.join(', ')}`);
    }
    return await api.get(`/ctrl/set?ptz_speed_mode=${mode}`);
  }

  /**
   * 获取预设调用时冻结设置
   * API: /ctrl/get?k=freeze_during_preset
   */
  static async getFreezeDuringRecall(api) {
    return await api.get('/ctrl/get?k=freeze_during_preset');
  }

  /**
   * 设置预设调用时冻结画面
   * API: /ctrl/set?freeze_during_preset={enable}
   */
  static async setFreezeDuringRecall(api, enable) {
    const value = enable === true || enable === '1' || enable === 'on' ? '1' : '0';
    return await api.get(`/ctrl/set?freeze_during_preset=${value}`);
  }

  /**
   * 获取通用速度单位
   * API: /ctrl/get?k=ptz_common_speed_unit
   */
  static async getCommonSpeedUnit(api) {
    return await api.get('/ctrl/get?k=ptz_common_speed_unit');
  }

  /**
   * 设置通用速度单位
   * API: /ctrl/set?ptz_common_speed_unit={unit}
   */
  static async setCommonSpeedUnit(api, unit) {
    const validUnits = ['percent', 'absolute'];
    if (!validUnits.includes(unit)) {
      throw new Error(`速度单位无效，支持: ${validUnits.join(', ')}`);
    }
    return await api.get(`/ctrl/set?ptz_common_speed_unit=${unit}`);
  }

  // ===== PT轨迹跟踪 =====

  /**
   * 删除PT轨迹
   * API: /ctrl/ptrace?action=del&index={index}
   */
  static async deleteTrace(api, index) {
    const traceIndex = parseInt(index);
    if (isNaN(traceIndex) || traceIndex < 1 || traceIndex > 255) {
      throw new Error('轨迹索引必须是1-255之间的数字');
    }
    return await api.get(`/ctrl/ptrace?action=del&index=${traceIndex}`);
  }

  /**
   * 设置PT轨迹名称
   * API: /ctrl/ptrace?action=set_name&index={index}&new_name={name}
   */
  static async setTraceName(api, index, name) {
    const traceIndex = parseInt(index);
    if (isNaN(traceIndex) || traceIndex < 1 || traceIndex > 255) {
      throw new Error('轨迹索引必须是1-255之间的数字');
    }
    if (!name || typeof name !== 'string') {
      throw new Error('轨迹名称不能为空');
    }
    if (name.length > 50) {
      throw new Error('轨迹名称长度不能超过50个字符');
    }
    return await api.get(`/ctrl/ptrace?action=set_name&index=${traceIndex}&new_name=${encodeURIComponent(name)}`);
  }

  /**
   * 开始录制PT轨迹
   * API: /ctrl/ptrace?action=rec_start&index={index}
   */
  static async startTraceRecord(api, index) {
    const traceIndex = parseInt(index);
    if (isNaN(traceIndex) || traceIndex < 1 || traceIndex > 255) {
      throw new Error('轨迹索引必须是1-255之间的数字');
    }
    return await api.get(`/ctrl/ptrace?action=rec_start&index=${traceIndex}`);
  }

  /**
   * 停止录制PT轨迹
   * API: /ctrl/ptrace?action=rec_stop
   */
  static async stopTraceRecord(api) {
    return await api.get('/ctrl/ptrace?action=rec_stop');
  }

  /**
   * 准备播放PT轨迹
   * API: /ctrl/ptrace?action=play_prepare&index={index}
   */
  static async prepareTracePlay(api, index) {
    const traceIndex = parseInt(index);
    if (isNaN(traceIndex) || traceIndex < 1 || traceIndex > 255) {
      throw new Error('轨迹索引必须是1-255之间的数字');
    }
    return await api.get(`/ctrl/ptrace?action=play_prepare&index=${traceIndex}`);
  }

  /**
   * 开始播放PT轨迹
   * API: /ctrl/ptrace?action=play_start
   */
  static async startTracePlay(api) {
    return await api.get('/ctrl/ptrace?action=play_start');
  }

  /**
   * 停止播放PT轨迹
   * API: /ctrl/ptrace?action=play_stop
   */
  static async stopTracePlay(api) {
    return await api.get('/ctrl/ptrace?action=play_stop');
  }

  /**
   * 查询PT轨迹状态
   * API: /ctrl/ptrace?action=query
   */
  static async queryTrace(api) {
    return await api.get('/ctrl/ptrace?action=query');
  }

  /**
   * 获取PT轨迹信息
   * API: /ctrl/ptrace?action=get_info&index={index}
   */
  static async getTraceInfo(api, index) {
    const traceIndex = parseInt(index);
    if (isNaN(traceIndex) || traceIndex < 1 || traceIndex > 255) {
      throw new Error('轨迹索引必须是1-255之间的数字');
    }
    return await api.get(`/ctrl/ptrace?action=get_info&index=${traceIndex}`);
  }

  // ===== 辅助方法 =====

  /**
   * 列出所有预设（通过遍历获取）
   */
  static async listPresets(api) {
    const presets = [];
    const maxPresets = 255;

    for (let i = 1; i <= maxPresets; i++) {
      try {
        const info = await this.getPresetInfo(api, i);
        if (info && info.valid) {
          presets.push({
            index: i,
            name: info.name || `Preset ${i}`,
            valid: true,
            ...info
          });
        }
      } catch (error) {
        // 忽略无效预设的错误
        continue;
      }
    }

    return presets;
  }

  /**
   * 批量保存预设
   */
  static async batchSavePresets(api, presetData) {
    const results = [];

    for (const preset of presetData) {
      try {
        const result = await this.savePreset(api, preset.index);
        if (preset.name) {
          await this.setPresetName(api, preset.index, preset.name);
        }
        if (preset.speed) {
          await this.setPresetSpeed(api, preset.index, preset.speed);
        }
        results.push({ index: preset.index, success: true, result });
      } catch (error) {
        results.push({ index: preset.index, success: false, error: error.message });
      }
    }

    return results;
  }

  /**
   * 验证预设索引
   */
  static validatePresetIndex(index) {
    const presetIndex = parseInt(index);
    if (isNaN(presetIndex) || presetIndex < 1 || presetIndex > 255) {
      throw new Error('预设索引必须是1-255之间的数字');
    }
    return presetIndex;
  }
}

module.exports = PresetService;