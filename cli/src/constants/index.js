/**
 * 系统常量配置
 * 集中管理所有硬编码值，避免分散在代码中
 */

const PACKAGE = require('../../../package.json');

module.exports = {
  // 网络配置常量
  NETWORK: {
    DEFAULT_HOST: '192.168.1.100',
    DEFAULT_PORT: 80,
    DEFAULT_TIMEOUT: 30000,
    MIN_REQUEST_INTERVAL: 50,
    MAX_TIMEOUT: 300000,
    MIN_TIMEOUT: 1000
  },

  // API相关常量
  API: {
    VERSION: PACKAGE.version || '1.0.0',
    USER_AGENT: `Z-CAM-CLI/${PACKAGE.version || '1.0.0'}`,
    ENDPOINTS: {
      INFO: '/info',
      SESSION: '/ctrl/session',
      CAMERA_STATUS: '/camera_status',
      DATETIME: '/datetime',
      COMMIT: '/commit_info',
      NICK_NAME: '/ctrl/nick_name',
      MODE: '/ctrl/mode',
      LOGIN_ME: '/login/me',
      LOGIN_USER: '/login/user',
      LOGIN_ADDUSER: '/login/adduser',
      LOGIN_DELUSER: '/login/deluser',
      LOGIN_PSWD: '/login/pswd',
      LOGIN_QUIT: '/login/quit',
      CTRL_SESSION: '/ctrl/session',
      CTRL_REBOOT: '/ctrl/reboot',
      CTRL_SHUTDOWN: '/ctrl/shUTDOWN',
      CTRL_GET: '/ctrl/get',
      CTRL_SET: '/ctrl/set',
      CTRL_GETBATCH: '/ctrl/getbatch',
      CTRL_REC: '/ctrl/rec',
      CTRL_STREAM_SETTING: '/ctrl/stream_setting',
      CTRL_AF: '/ctrl/af',
      CTRL_PT: '/ctrl/pt',
      CTRL_CARD: '/ctrl/card',
      CTRL_NETWORK: '/ctrl/network',
      DCIM: '/DCIM',
      MJPEG_STREAM: '/mjpeg_stream'
    }
  },

  // 配置文件常量
  CONFIG: {
    DEFAULT_PROFILE: 'default',
    CONFIG_DIR: '.zcam',
    CONFIG_FILE: 'config.json',
    FAVORITES_FILE: 'favorites.json',
    CAMERAS_FILE: 'cameras.json',
    TEMPLATES_DIR: 'templates'
  },

  // 输出格式常量
  OUTPUT: {
    FORMATS: ['table', 'json', 'csv'],
    DEFAULT_FORMAT: 'table'
  },

  // 验证常量
  VALIDATION: {
    HOST_PATTERN: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
    PORT_RANGE: { min: 1, max: 65535 },
    MIN_TIMEOUT: 1000,
    MAX_TIMEOUT: 300000,
    ISO_RANGE: { min: 100, max: 25600 },
    SHUTTER_RANGE: { min: 1, max: 8000 },
    IRIS_RANGE: { min: 1.4, max: 22 },
    GAIN_RANGE: { min: 0, max: 30 },
    BRIGHTNESS_RANGE: { min: 0, max: 100 },
    CONTRAST_RANGE: { min: 0, max: 100 },
    SATURATION_RANGE: { min: 0, max: 100 },
    SHARPNESS_RANGE: { min: 0, max: 100 },
    HUE_RANGE: { min: 0, max: 100 },
    PTZ_SPEED_RANGE: { min: 0, max: 63 },
    PRESET_INDEX_RANGE: { min: 1, max: 255 }
  },

  // 用户权限常量
  USER_PERMISSIONS: {
    ADMIN: 'admin',
    OPERATOR: 'operator',
    VIEWER: 'viewer',
    VALID_PERMISSIONS: ['admin', 'operator', 'viewer']
  },

  // 网络模式常量
  NETWORK_MODES: {
    DHCP_CLIENT: 'Router',
    DHCP_SERVER: 'Direct',
    STATIC: 'Static',
    VALID_MODES: ['Router', 'Direct', 'Static']
  },

  // 白平衡模式常量
  WHITE_BALANCE_MODES: {
    AUTO: 'auto',
    MANUAL: 'manual',
    TUNGSTEN: 'tungsten',
    FLUORESCENT: 'fluorescent',
    DAYLIGHT: 'daylight',
    CLOUDY: 'cloudy',
    VALID_MODES: ['auto', 'manual', 'tungsten', 'fluorescent', 'daylight', 'cloudy']
  },

  // 录制模式常量
  RECORD_MODES: {
    REC: 'rec',
    REC_ING: 'rec_ing',
    REC_PAUSED: 'rec_paused',
    CAP: 'cap',
    PB: 'pb',
    PB_ING: 'pb_ing',
    PB_PAUSED: 'pb_paused',
    CAP_TL_IDLE: 'cap_tl_idle',
    CAP_TL_ING: 'cap_tl_ing',
    CAP_BURST: 'cap_burst',
    CAP_SNAP_IDLE: 'cap_snap_idle',
    CAP_SNAP_ING: 'cap_snap_ing',
    REC_TL_IDLE: 'rec_tl_idle',
    REC_TL_ING: 'rec_tl_ing',
    UNKNOWN: 'unknown'
  },

  // 流媒体编码格式
  VIDEO_ENCODERS: {
    H264: 'h264',
    H265: 'h265',
    VALID_ENCODERS: ['h264', 'h265']
  },

  // 流媒体索引
  STREAM_INDICES: {
    STREAM0: 'stream0',
    STREAM1: 'stream1',
    VALID_INDICES: ['stream0', 'stream1']
  },

  // 错误代码常量
  ERROR_CODES: {
    SUCCESS: 0,
    ERROR: 1,
    SESSION_CONFLICT: 409,
    INTERNAL_ERROR: 500
  }
};