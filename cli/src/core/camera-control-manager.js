/**
 * 相机控制权管理器
 * 提供控制权的获取、检查、释放的原子操作
 */

class CameraControlManager {
  constructor(api) {
    this.api = api;
    this.isControlled = false;
    this.controlMode = null;
    this.heartbeatInterval = null;
    this.lastHeartbeat = 0;
    this.heartbeatTimeout = 30000; // 30秒心跳超时
  }

  /**
   * 检查当前控制权状态
   * @returns {boolean} 是否有控制权
   */
  async checkControlStatus() {
    try {
      const result = await this.api.get('/ctrl/mode');
      // 如果能获取模式信息，说明有控制权
      this.isControlled = true;
      this.lastHeartbeat = Date.now();
      return true;
    } catch (error) {
      this.isControlled = false;
      return false;
    }
  }

  /**
   * 验证控制权上下文是否有效
   * @returns {boolean} 控制权上下文是否有效
   */
  validateControlContext() {
    // 检查基本控制权状态
    if (!this.isControlled) {
      return false;
    }

    // 检查心跳是否超时
    if (Date.now() - this.lastHeartbeat > this.heartbeatTimeout) {
      return false;
    }

    // 检查心跳是否活跃
    if (!this.heartbeatInterval) {
      return false;
    }

    return true;
  }

  /**
   * 确保在有效控制权上下文中执行操作
   * @param {Function} operation 要执行的操作
   * @returns {*} 操作结果
   * @throws {Error} 如果没有有效的控制权上下文
   */
  async ensureControlContext(operation) {
    if (!this.validateControlContext()) {
      throw new Error('无效的控制权上下文：没有控制权或控制权已超时');
    }

    return await operation();
  }

  /**
   * 获取控制权（原子操作）
   * @param {string} mode 控制模式 ('recording', 'standby', 'auto')
   * @returns {boolean} 是否成功获取控制权
   */
  async acquireControl(mode = 'recording') {
    try {
      // 先检查当前状态
      const hasControl = await this.checkControlStatus();
      if (hasControl) {
        this.controlMode = mode;
        this.lastHeartbeat = Date.now();
        this.startHeartbeat();
        return true;
      }

      // 尝试获取控制权
      let action;
      switch (mode) {
        case 'recording':
          action = 'to_rec';
          break;
        case 'standby':
          action = 'to_standby';
          break;
        case 'auto':
          action = 'exit_standby';
          break;
        default:
          throw new Error(`不支持的控制模式: ${mode}`);
      }

      // console.log(`🎯 尝试获取相机控制权，模式: ${mode}`);
      const result = await this.api.get(`/ctrl/mode?action=${action}`);

      if (result && result.code === 0) {
        this.isControlled = true;
        this.controlMode = mode;
        this.lastHeartbeat = Date.now();

        // 启动心跳保持
        this.startHeartbeat();

        // console.log(`✅ 成功获取相机控制权，模式: ${mode}`);
        return true;
      } else {
        // console.error(`❌ 获取相机控制权失败: ${result?.msg || '未知错误'}`);
        return false;
      }
    } catch (error) {
      // console.error(`❌ 获取相机控制权异常:`, error.message);
      this.isControlled = false;
      return false;
    }
  }

  /**
   * 释放控制权（原子操作）
   * @returns {boolean} 是否成功释放控制权
   */
  async releaseControl() {
    try {
      // 停止心跳
      this.stopHeartbeat();

      if (!this.isControlled) {
        // console.log('⚠️ 相机无控制权，无需释放');
        return true;
      }

      // console.log(`🔓 释放相机控制权，当前模式: ${this.controlMode}`);

      // 退出到自动模式
      const result = await this.api.get('/ctrl/mode?action=exit_standby');

      if (result && result.code === 0) {
        this.isControlled = false;
        this.controlMode = null;
        this.lastHeartbeat = 0;

        // console.log('✅ 成功释放相机控制权');
        return true;
      } else {
        // console.error(`❌ 释放相机控制权失败: ${result?.msg || '未知错误'}`);
        return false;
      }
    } catch (error) {
      // console.error(`❌ 释放相机控制权异常:`, error.message);
      return false;
    }
  }

  /**
   * 确保有控制权，如果没有则尝试获取
   * @param {string} mode 控制模式
   * @returns {boolean} 是否有控制权
   */
  async ensureControl(mode = 'recording') {
    if (this.isControlled && this.controlMode === mode) {
      // 检查心跳是否超时
      if (Date.now() - this.lastHeartbeat > this.heartbeatTimeout) {
        // console.log('⚠️ 控制权心跳超时，重新获取');
        this.isControlled = false;
        this.stopHeartbeat();
      }
    }

    if (!this.isControlled) {
      return await this.acquireControl(mode);
    }

    return true;
  }

  /**
   * 启动心跳保持
   */
  startHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(async () => {
      try {
        await this.api.get('/ctrl/session');
        this.lastHeartbeat = Date.now();
      } catch (error) {
        // console.warn('⚠️ 心跳失败:', error.message);
        // 心跳失败可能意味着失去控制权
        this.isControlled = false;
      }
    }, 10000); // 每10秒心跳一次
  }

  /**
   * 停止心跳保持
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * 获取控制权状态信息
   * @returns {Object} 控制权状态
   */
  getStatus() {
    return {
      isControlled: this.isControlled,
      controlMode: this.controlMode,
      lastHeartbeat: this.lastHeartbeat,
      isHeartbeatActive: !!this.heartbeatInterval,
      timeSinceLastHeartbeat: this.lastHeartbeat ? Date.now() - this.lastHeartbeat : null
    };
  }

  /**
   * 原子操作：执行需要控制权的操作
   * @param {Function} operation 要执行的操作
   * @param {string} mode 控制模式
   * @returns {*} 操作结果
   */
  async withControl(operation, mode = 'recording') {
    // 确保有控制权
    const hasControl = await this.ensureControl(mode);
    if (!hasControl) {
      throw new Error(`无法获取相机控制权，模式: ${mode}`);
    }

    try {
      // 执行操作
      const result = await operation();
      return result;
    } catch (error) {
      // console.error('❌ 操作执行失败:', error.message);
      throw error;
    }
  }

  /**
   * 清理资源
   */
  async cleanup() {
    await this.releaseControl();
    this.stopHeartbeat();
  }
}

module.exports = CameraControlManager;
