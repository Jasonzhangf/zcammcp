/**
 * 相机服务层 - 封装相机相关的API调用
 * 对应官方API: Api.camera, Api.session, Api.user
 */

const BaseService = require('../../core/base-service');
const constants = require('../../constants');

class CameraService extends BaseService {
  /**
   * 获取相机基本信息
   * API: /info
   */
  static async getInfo(api) {
    return await api.get(constants.API.ENDPOINTS.INFO);
  }

  /**
   * 获取相机工作模式
   * API: /ctrl/mode
   */
  static async getMode(api) {
    return await api.get(`${constants.API.ENDPOINTS.CTRL_SESSION}?action=query`);
  }

  /**
   * 获取相机昵称
   * API: /ctrl/nick_name
   */
  static async getNickname(api) {
    return await api.get(constants.API.ENDPOINTS.NICK_NAME);
  }

  /**
   * 设置相机昵称
   * API: /ctrl/nick_name?action=set&name={name}
   */
  static async setNickname(api, name) {
    if (!name || typeof name !== 'string') {
      throw new Error('昵称不能为空且必须是字符串');
    }
    if (name.length > 50) {
      throw new Error('昵称长度不能超过50个字符');
    }
    return await api.get(`${constants.API.ENDPOINTS.NICK_NAME}?action=set&name=${encodeURIComponent(name)}`);
  }

  /**
   * 获取相机运行状态
   * API: /camera_status
   */
  static async getStatus(api) {
    return await api.get(constants.API.ENDPOINTS.CAMERA_STATUS);
  }

  /**
   * 提交相机设置
   * API: /commit_info
   */
  static async commit(api) {
    return await api.get(constants.API.ENDPOINTS.COMMIT);
  }

  /**
   * 切换到录制模式
   * API: /ctrl/mode?action=to_rec
   */
  static async gotoRecordingMode(api) {
    return await api.get(`${constants.API.ENDPOINTS.CTRL_SESSION}?action=to_rec`);
  }

  // ===== 会话管理 =====

  /**
   * 会话心跳
   * API: /ctrl/session
   */
  static async sessionPing(api) {
    return await api.get(constants.API.ENDPOINTS.CTRL_SESSION);
  }

  /**
   * 退出会话
   * API: /ctrl/session?action=quit
   */
  static async sessionQuit(api) {
    return await api.get(`${constants.API.ENDPOINTS.CTRL_SESSION}?action=quit`);
  }

  // ===== 时间管理 =====

  /**
   * 获取相机时间
   * API: /datetime/get
   */
  static async getTime(api) {
    return await api.get(`${constants.API.ENDPOINTS.DATETIME}?action=get`);
  }

  /**
   * 设置相机时间
   * API: /datetime?date={date}&time={time}
   */
  static async setTime(api, date, time) {
    // 验证日期格式 YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      throw new Error('日期格式错误，应为 YYYY-MM-DD');
    }

    // 验证时间格式 HH:MM:SS
    const timeRegex = /^\d{2}:\d{2}:\d{2}$/;
    if (!timeRegex.test(time)) {
      throw new Error('时间格式错误，应为 HH:MM:SS');
    }

    return await api.get(`${constants.API.ENDPOINTS.DATETIME}?date=${date}&time=${time}`);
  }

  /**
   * 设置时区
   * API: /datetime?timezone={timezone}
   */
  static async setTimezone(api, timezone) {
    if (!timezone || typeof timezone !== 'string') {
      throw new Error('时区不能为空');
    }
    return await api.get(`${constants.API.ENDPOINTS.DATETIME}?timezone=${encodeURIComponent(timezone)}`);
  }

  // ===== 用户管理 =====

  /**
   * 获取当前用户信息
   * API: /login/me
   */
  static async getCurrentUser(api) {
    return await api.get(constants.API.ENDPOINTS.LOGIN_ME);
  }

  /**
   * 获取用户列表
   * API: /login/user
   */
  static async getUserList(api) {
    return await api.get(constants.API.ENDPOINTS.LOGIN_USER);
  }

  /**
   * 添加用户
   * API: /login/adduser?user={username}&pswd={password}&grp={permission}
   */
  static async addUser(api, username, password, permission) {
    if (!username || typeof username !== 'string') {
      throw new Error('用户名不能为空');
    }
    if (username.length < 3 || username.length > 20) {
      throw new Error('用户名长度应在3-20个字符之间');
    }
    if (!password || typeof password !== 'string') {
      throw new Error('密码不能为空');
    }
    if (password.length < 6) {
      throw new Error('密码长度不能少于6个字符');
    }
    if (!constants.USER_PERMISSIONS.VALID_PERMISSIONS.includes(permission)) {
      throw new Error(`权限等级必须是 ${constants.USER_PERMISSIONS.VALID_PERMISSIONS.join(', ')}`);
    }

    return await api.get(`${constants.API.ENDPOINTS.LOGIN_ADDUSER}?user=${encodeURIComponent(username)}&pswd=${password}&grp=${permission}`);
  }

  /**
   * 删除用户
   * API: /login/deluser?user={username}
   */
  static async deleteUser(api, username) {
    if (!username || typeof username !== 'string') {
      throw new Error('用户名不能为空');
    }
    return await api.get(`${constants.API.ENDPOINTS.LOGIN_DELUSER}?user=${encodeURIComponent(username)}`);
  }

  /**
   * 修改用户密码
   * API: /login/pswd?user={username}&old={oldPassword}&new={newPassword}
   */
  static async changePassword(api, username, oldPassword, newPassword) {
    if (!username || typeof username !== 'string') {
      throw new Error('用户名不能为空');
    }
    if (!oldPassword || typeof oldPassword !== 'string') {
      throw new Error('旧密码不能为空');
    }
    if (!newPassword || typeof newPassword !== 'string') {
      throw new Error('新密码不能为空');
    }
    if (newPassword.length < 6) {
      throw new Error('新密码长度不能少于6个字符');
    }

    return await api.get(`${constants.API.ENDPOINTS.LOGIN_PSWD}?user=${encodeURIComponent(username)}&old=${oldPassword}&new=${newPassword}`);
  }

  /**
   * 登出
   * API: /login/quit
   */
  static async logout(api) {
    return await api.get(constants.API.ENDPOINTS.LOGIN_QUIT);
  }

  // ===== 控制接口 =====

  /**
   * 获取控制参数
   * API: /ctrl/get?k={key}
   */
  static async getControlParam(api, key) {
    if (!key) {
      throw new Error('控制参数名不能为空');
    }
    return await api.get(`${constants.API.ENDPOINTS.CTRL_GET}?k=${key}`);
  }

  /**
   * 设置控制参数
   * API: /ctrl/set?{key}={value}
   */
  static async setControlParam(api, key, value) {
    if (!key) {
      throw new Error('控制参数名不能为空');
    }
    if (value === undefined || value === null) {
      throw new Error('控制参数值不能为空');
    }
    return await api.get(`${constants.API.ENDPOINTS.CTRL_SET}?${key}=${encodeURIComponent(value)}`);
  }

  /**
   * 批量获取控制参数
   * API: /ctrl/getbatch?catalog={catalog}
   */
  static async getControlParamsBatch(api, catalog) {
    if (!catalog) {
      throw new Error('目录名不能为空');
    }
    return await api.get(`${constants.API.ENDPOINTS.CTRL_GETBATCH}?catalog=${catalog}`);
  }
}

module.exports = CameraService;