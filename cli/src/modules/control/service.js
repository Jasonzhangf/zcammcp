/**
 * 控制服务层 - 封装PTZ和镜头控制的API调用
 * 对应官方API: Api.pt, Api.lens
 */

class ControlService {
  // ===== 方向映射 =====
  static directionMap = {
    'up': 'up',
    'down': 'down',
    'left': 'left',
    'right': 'right',
    'up-left': 'upleft',
    'up-right': 'upright',
    'down-left': 'downleft',
    'down-right': 'downright'
  };

  // ===== PTZ云台控制 =====

  /**
   * 查询PTZ位置
   * API: /ctrl/pt?action=query
   */
  static async getPTZPosition(api) {
    return await api.get('/ctrl/pt?action=query');
  }

  /**
   * 查询PTZ详细信息
   * API: /ctrl/pt?action=query&detail=y
   */
  static async getPTZDetail(api) {
    return await api.get('/ctrl/pt?action=query&detail=y');
  }

  /**
   * PTZ方向移动
   * API: /ctrl/pt?action={direction}&fspeed={speed}
   */
  static async ptzDirectionMove(api, direction, speed) {
    const validDirection = this.directionMap[direction.toLowerCase()];
    if (!validDirection) {
      throw new Error(`无效的方向: ${direction}。支持的方向: ${Object.keys(this.directionMap).join(', ')}`);
    }

    const speedNum = parseInt(speed);
    if (isNaN(speedNum) || speedNum < 1 || speedNum > 9) {
      throw new Error('速度必须是1-9之间的数字');
    }

    return await api.get(`/ctrl/pt?action=${validDirection}&fspeed=${speedNum}`);
  }

  /**
   * PTZ精确移动
   * API: /ctrl/pt?action=pt&pan_speed={pan}&tilt_speed={tilt}
   */
  static async ptzMove(api, panSpeed, tiltSpeed) {
    const pan = parseInt(panSpeed);
    const tilt = parseInt(tiltSpeed);

    if (isNaN(pan) || pan < 0 || pan > 9) {
      throw new Error('Pan速度必须是0-9之间的数字');
    }
    if (isNaN(tilt) || tilt < 0 || tilt > 9) {
      throw new Error('Tilt速度必须是0-9之间的数字');
    }

    return await api.get(`/ctrl/pt?action=pt&pan_speed=${pan}&tilt_speed=${tilt}`);
  }

  /**
   * 停止PTZ移动
   * API: /ctrl/pt?action=stop
   */
  static async ptzStop(api) {
    return await api.get('/ctrl/pt?action=stop');
  }

  /**
   * 停止所有PTZ移动
   * API: /ctrl/pt?action=stop_all
   */
  static async ptzStopAll(api) {
    return await api.get('/ctrl/pt?action=stop_all');
  }

  /**
   * PTZ回到原点
   * API: /ctrl/pt?action=home
   */
  static async ptzHome(api) {
    return await api.get('/ctrl/pt?action=home');
  }

  /**
   * 重置PTZ
   * API: /ctrl/pt?action=reset
   */
  static async ptzReset(api) {
    return await api.get('/ctrl/pt?action=reset');
  }

  /**
   * 设置PTZ限制
   * API: /ctrl/pt?action=limit&direct={direction}&pan_pos={pan}&tilt_pos={tilt}
   */
  static async ptzLimitUpdate(api, direction, panPos, tiltPos) {
    if (!['start', 'end'].includes(direction)) {
      throw new Error('限制方向必须是 start 或 end');
    }

    const pan = parseFloat(panPos);
    const tilt = parseFloat(tiltPos);

    if (isNaN(pan) || isNaN(tilt)) {
      throw new Error('位置参数必须是数字');
    }

    return await api.get(`/ctrl/pt?action=limit&direct=${direction}&pan_pos=${pan}&tilt_pos=${tilt}`);
  }

  /**
   * 启用/禁用PTZ限制
   * API: /ctrl/set?ptz_limit={enable}
   */
  static async setPTZLimit(api, enable) {
    const value = enable === true || enable === '1' || enable === 'on' ? '1' : '0';
    return await api.get(`/ctrl/set?ptz_limit=${value}`);
  }

  /**
   * 获取PTZ限制状态
   * API: /ctrl/get?k=ptz_limit
   */
  static async getPTZLimit(api) {
    return await api.get('/ctrl/get?k=ptz_limit');
  }

  /**
   * 设置PTZ速度模式
   * API: /ctrl/set?pt_speedmode={mode}
   */
  static async setPTZSpeedMode(api, mode) {
    const validModes = ['normal', 'precision', 'fast'];
    if (!validModes.includes(mode)) {
      throw new Error(`速度模式无效，支持: ${validModes.join(', ')}`);
    }
    return await api.get(`/ctrl/set?pt_speedmode=${mode}`);
  }

  /**
   * 设置PTZ翻转
   * API: /ctrl/set?ptz_flip={enable}
   */
  static async setPTZFlip(api, enable) {
    const value = enable === true || enable === '1' || enable === 'on' ? '1' : '0';
    return await api.get(`/ctrl/set?ptz_flip=${value}`);
  }

  /**
   * 设置隐私模式
   * API: /ctrl/set?pt_priv_mode={enable}
   */
  static async setPrivacyMode(api, enable) {
    const value = enable === true || enable === '1' || enable === 'on' ? '1' : '0';
    return await api.get(`/ctrl/set?pt_priv_mode=${value}`);
  }

  // ===== 变焦控制 =====

  /**
   * 统一变焦控制
   * API: /ctrl/lens?action=zoom{in|out}&fspeed={speed}
   */
  static async zoom(api, direction, speed) {
    const validDirections = ['in', 'out'];
    if (!validDirections.includes(direction?.toLowerCase())) {
      throw new Error(`无效的变焦方向: ${direction}。支持的方向: ${validDirections.join(', ')}`);
    }

    const speedNum = parseInt(speed);
    if (isNaN(speedNum) || speedNum < 1 || speedNum > 9) {
      throw new Error('变焦速度必须是1-9之间的数字');
    }

    return await api.get(`/ctrl/lens?action=zoom${direction.toLowerCase()}&fspeed=${speedNum}`);
  }

  /**
   * 放大
   * API: /ctrl/lens?action=zoomin&fspeed={speed}
   */
  static async zoomIn(api, speed = '5') {
    return await this.zoom(api, 'in', speed);
  }

  /**
   * 缩小
   * API: /ctrl/lens?action=zoomout&fspeed={speed}
   */
  static async zoomOut(api, speed = '5') {
    return await this.zoom(api, 'out', speed);
  }

  /**
   * 停止变焦
   * API: /ctrl/lens?action=zoomstop
   */
  static async zoomStop(api) {
    return await api.get('/ctrl/lens?action=zoomstop');
  }

  /**
   * 精确变焦值控制
   * API: /ctrl/lens?action=zoom&value={value}
   */
  static async zoomValue(api, value) {
    const valueNum = parseInt(value);
    if (isNaN(valueNum) || valueNum < 0 || valueNum > 99999) {
      throw new Error('变焦值必须是0-99999之间的数字');
    }

    return await api.get(`/ctrl/lens?action=zoom&value=${valueNum}`);
  }

  /**
   * 查询变焦状态
   * API: /ctrl/lens?action=z_status
   */
  static async getZoomStatus(api) {
    return await api.get('/ctrl/lens?action=z_status');
  }

  /**
   * 获取变焦模式
   * API: /ctrl/get?k=zoom_mode
   */
  static async getZoomMode(api) {
    return await api.get('/ctrl/get?k=zoom_mode');
  }

  /**
   * 设置变焦模式
   * API: /ctrl/set?zoom_mode={mode}
   */
  static async setZoomMode(api, mode) {
    const validModes = ['optical', 'digital', 'auto'];
    if (!validModes.includes(mode)) {
      throw new Error(`变焦模式无效，支持: ${validModes.join(', ')}`);
    }
    return await api.get(`/ctrl/set?zoom_mode=${mode}`);
  }

  /**
   * 获取焦距
   * API: /ctrl/get?k=lens_focal_length
   */
  static async getFocalLength(api) {
    return await api.get('/ctrl/get?k=lens_focal_length');
  }

  // ===== 对焦控制 =====

  /**
   * 统一对焦控制
   * API: /ctrl/lens?action=focus{near|far}&fspeed={speed}
   */
  static async focus(api, direction, speed) {
    const validDirections = ['near', 'far'];
    if (!validDirections.includes(direction?.toLowerCase())) {
      throw new Error(`无效的对焦方向: ${direction}。支持的方向: ${validDirections.join(', ')}`);
    }

    const speedNum = parseInt(speed);
    if (isNaN(speedNum) || speedNum < 1 || speedNum > 9) {
      throw new Error('对焦速度必须是1-9之间的数字');
    }

    return await api.get(`/ctrl/lens?action=focus${direction.toLowerCase()}&fspeed=${speedNum}`);
  }

  /**
   * 近焦
   * API: /ctrl/lens?action=focusnear&fspeed={speed}
   */
  static async focusNear(api, speed = '5') {
    return await this.focus(api, 'near', speed);
  }

  /**
   * 远焦
   * API: /ctrl/lens?action=focusfar&fspeed={speed}
   */
  static async focusFar(api, speed = '5') {
    return await this.focus(api, 'far', speed);
  }

  /**
   * 停止对焦
   * API: /ctrl/lens?action=focusstop
   */
  static async focusStop(api) {
    return await api.get('/ctrl/lens?action=focusstop');
  }

  /**
   * 精确对焦值控制
   * API: /ctrl/lens?action=focus&value={value}
   */
  static async focusValue(api, value) {
    const valueNum = parseInt(value);
    if (isNaN(valueNum) || valueNum < 0 || valueNum > 99999) {
      throw new Error('对焦值必须是0-99999之间的数字');
    }

    return await api.get(`/ctrl/lens?action=focus&value=${valueNum}`);
  }

  /**
   * 单次自动对焦
   * API: /ctrl/af
   */
  static async autoFocus(api) {
    return await api.get('/ctrl/af');
  }

  /**
   * 查询对焦状态
   * API: /ctrl/lens?action=f_status
   */
  static async getFocusStatus(api) {
    return await api.get('/ctrl/lens?action=f_status');
  }

  // ===== 自动对焦控制 =====

  /**
   * 切换自动对焦模式
   * API: /ctrl/set?af_mode={mode}
   */
  static async setAutoFocus(api, enable) {
    const value = enable === true || enable === '1' || enable === 'on' ? 'on' : 'off';
    return await api.get(`/ctrl/set?af_mode=${value}`);
  }

  /**
   * 获取对焦方法
   * API: /ctrl/get?k=focus
   */
  static async getFocusMethod(api) {
    return await api.get('/ctrl/get?k=focus');
  }

  /**
   * 设置对焦方法
   * API: /ctrl/set?focus={method}
   */
  static async setFocusMethod(api, method) {
    const validMethods = ['auto', 'manual', 'af', 'mf'];
    if (!validMethods.includes(method)) {
      throw new Error(`对焦方法无效，支持: ${validMethods.join(', ')}`);
    }
    return await api.get(`/ctrl/set?focus=${method}`);
  }

  /**
   * 获取ROI类型
   * API: /ctrl/get?k=af_mode
   */
  static async getROIType(api) {
    return await api.get('/ctrl/get?k=af_mode');
  }

  /**
   * 设置ROI类型
   * API: /ctrl/set?af_mode={type}
   */
  static async setROIType(api, type) {
    const validTypes = ['free', 'face', 'multi', 'single'];
    if (!validTypes.includes(type)) {
      throw new Error(`ROI类型无效，支持: ${validTypes.join(', ')}`);
    }
    return await api.get(`/ctrl/set?af_mode=${type}`);
  }

  /**
   * 更新ROI中心点
   * API: /ctrl/af?action=update_roi_center&x={x}&y={y}
   */
  static async updateROICenter(api, x, y) {
    const xPos = parseInt(x);
    const yPos = parseInt(y);

    if (isNaN(xPos) || xPos < 0 || xPos > 3840) {
      throw new Error('X坐标必须是0-3840之间的数字');
    }
    if (isNaN(yPos) || yPos < 0 || yPos > 2160) {
      throw new Error('Y坐标必须是0-2160之间的数字');
    }

    return await api.get(`/ctrl/af?action=update_roi_center&x=${xPos}&y=${yPos}`);
  }

  /**
   * 查询ROI信息
   * API: /ctrl/af?action=query
   */
  static async getROIInfo(api) {
    return await api.get('/ctrl/af?action=query');
  }

  /**
   * 获取CAF状态
   * API: /ctrl/get?k=caf
   */
  static async getCAF(api) {
    return await api.get('/ctrl/get?k=caf');
  }

  /**
   * 设置CAF
   * API: /ctrl/set?caf={enable}
   */
  static async setCAF(api, enable) {
    const value = enable === true || enable === '1' || enable === 'on' ? '1' : '0';
    return await api.get(`/ctrl/set?caf=${value}`);
  }

  /**
   * 获取CAF敏感度
   * API: /ctrl/get?k=caf_sens
   */
  static async getCAFSensitivity(api) {
    return await api.get('/ctrl/get?k=caf_sens');
  }

  /**
   * 设置CAF敏感度
   * API: /ctrl/set?caf_sens={sensitivity}
   */
  static async setCAFSensitivity(api, sensitivity) {
    const sens = parseInt(sensitivity);
    if (isNaN(sens) || sens < 1 || sens > 5) {
      throw new Error('CAF敏感度必须是1-5之间的数字');
    }
    return await api.get(`/ctrl/set?caf_sens=${sens}`);
  }

  /**
   * 获取实时CAF状态
   * API: /ctrl/get?k=live_caf
   */
  static async getLiveCAF(api) {
    return await api.get('/ctrl/get?k=live_caf');
  }

  /**
   * 设置实时CAF
   * API: /ctrl/set?live_caf={enable}
   */
  static async setLiveCAF(api, enable) {
    const value = enable === true || enable === '1' || enable === 'on' ? '1' : '0';
    return await api.get(`/ctrl/set?live_caf=${value}`);
  }

  /**
   * 获取MF辅助状态
   * API: /ctrl/get?k=mf_mag
   */
  static async getMFAssist(api) {
    return await api.get('/ctrl/get?k=mf_mag');
  }

  /**
   * 设置MF辅助
   * API: /ctrl/set?mf_mag={enable}
   */
  static async setMFAssist(api, enable) {
    const value = enable === true || enable === '1' || enable === 'on' ? '1' : '0';
    return await api.get(`/ctrl/set?mf_mag=${value}`);
  }

  /**
   * 获取AF速度
   * API: /ctrl/get?k=af_speed
   */
  static async getAFSpeed(api) {
    return await api.get('/ctrl/get?k=af_speed');
  }

  /**
   * 设置AF速度
   * API: /ctrl/set?af_speed={speed}
   */
  static async setAFSpeed(api, speed) {
    const speedNum = parseInt(speed);
    if (isNaN(speedNum) || speedNum < 1 || speedNum > 5) {
      throw new Error('AF速度必须是1-5之间的数字');
    }
    return await api.get(`/ctrl/set?af_speed=${speedNum}`);
  }

  /**
   * 跟踪人脸
   * API: /ctrl/af_face/trace_target?id={faceId}
   */
  static async traceFace(api, faceId) {
    const id = parseInt(faceId);
    if (isNaN(id) || id < 0) {
      throw new Error('人脸ID必须是大于等于0的数字');
    }
    return await api.get(`/ctrl/af_face/trace_target?id=${id}`);
  }
}

module.exports = ControlService;