/**
 * 统一配置契约
 * 整合MCP服务器、CLI工具和持久化层的所有配置定义
 * 解决配置分散问题，确保单一数据源
 */

import { z } from 'zod';

// ===============================
// 基础配置模式
// ===============================

// 服务器配置
export const ServerConfigSchema = z.object({
  port: z.number().min(1).max(65535).default(3000),
  host: z.string().default('localhost'),
});

// 网络配置
export const NetworkConfigSchema = z.object({
  defaultHost: z.string().regex(/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/).default('192.168.1.100'),
  defaultPort: z.number().min(1).max(65535).default(80),
  defaultTimeout: z.number().min(1000).max(300000).default(30000),
  minRequestInterval: z.number().min(0).max(1000).default(50),
  maxTimeout: z.number().min(1000).max(300000).default(300000),
  minTimeout: z.number().min(1000).max(300000).default(1000),
});

// 功能特性配置
export const FeaturesConfigSchema = z.object({
  enableLogging: z.boolean().default(true),
  enableCache: z.boolean().default(false),
  maxConnections: z.number().min(1).max(1000).default(100),
  verboseOutput: z.boolean().default(false),
  colorOutput: z.boolean().default(true),
});

// 版本配置
export const VersionConfigSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/).default('1.0.0'),
  userAgent: z.string().default('Z-CAM-CLI/1.0.0'),
  apiVersion: z.string().default('1.0.0'),
});

// ===============================
// 验证范围配置
// ===============================

export const ValidationRangesSchema = z.object({
  hostPattern: z.string(),
  portRange: z.object({ min: z.number(), max: z.number() }),
  timeoutRange: z.object({ min: z.number(), max: z.number() }),
  isoRange: z.object({ min: z.number(), max: z.number() }),
  shutterRange: z.object({ min: z.number(), max: z.number() }),
  irisRange: z.object({ min: z.number(), max: z.number() }),
  gainRange: z.object({ min: z.number(), max: z.number() }),
  brightnessRange: z.object({ min: z.number(), max: z.number() }),
  contrastRange: z.object({ min: z.number(), max: z.number() }),
  saturationRange: z.object({ min: z.number(), max: z.number() }),
  sharpnessRange: z.object({ min: z.number(), max: z.number() }),
  hueRange: z.object({ min: z.number(), max: z.number() }),
  ptzSpeedRange: z.object({ min: z.number(), max: z.number() }),
  presetIndexRange: z.object({ min: z.number(), max: z.number() }),
});

// ===============================
// API端点配置
// ===============================

export const ApiEndpointsSchema = z.object({
  INFO: z.string(),
  SESSION: z.string(),
  CAMERA_STATUS: z.string(),
  DATETIME: z.string(),
  COMMIT: z.string(),
  NICK_NAME: z.string(),
  MODE: z.string(),
  LOGIN_ME: z.string(),
  LOGIN_USER: z.string(),
  LOGIN_ADDUSER: z.string(),
  LOGIN_DELUSER: z.string(),
  LOGIN_PSWD: z.string(),
  LOGIN_QUIT: z.string(),
  CTRL_SESSION: z.string(),
  CTRL_MODE: z.string(),
  CTRL_REBOOT: z.string(),
  CTRL_SHUTDOWN: z.string(),
  CTRL_GET: z.string(),
  CTRL_SET: z.string(),
  CTRL_GETBATCH: z.string(),
  CTRL_REC: z.string(),
  CTRL_STREAM_SETTING: z.string(),
  CTRL_AF: z.string(),
  CTRL_PT: z.string(),
  CTRL_CARD: z.string(),
  CTRL_NETWORK: z.string(),
  DCIM: z.string(),
  MJPEG_STREAM: z.string(),
});

// ===============================
// 枚举配置
// ===============================

export const UserPermissionsSchema = z.object({
  ADMIN: z.literal('admin'),
  OPERATOR: z.literal('operator'),
  VIEWER: z.literal('viewer'),
  VALID_PERMISSIONS: z.array(z.enum(['admin', 'operator', 'viewer'])),
});

export const NetworkModesSchema = z.object({
  DHCP_CLIENT: z.literal('Router'),
  DHCP_SERVER: z.literal('Direct'),
  STATIC: z.literal('Static'),
  VALID_MODES: z.array(z.enum(['Router', 'Direct', 'Static'])),
});

export const WhiteBalanceModesSchema = z.object({
  AUTO: z.literal('auto'),
  MANUAL: z.literal('manual'),
  TUNGSTEN: z.literal('tungsten'),
  FLUORESCENT: z.literal('fluorescent'),
  DAYLIGHT: z.literal('daylight'),
  CLOUDY: z.literal('cloudy'),
  VALID_MODES: z.array(z.enum(['auto', 'manual', 'tungsten', 'fluorescent', 'daylight', 'cloudy'])),
});

export const VideoEncodersSchema = z.object({
  H264: z.literal('h264'),
  H265: z.literal('h265'),
  VALID_ENCODERS: z.array(z.enum(['h264', 'h265'])),
});

export const RecordModesSchema = z.object({
  REC: z.literal('rec'),
  REC_ING: z.literal('rec_ing'),
  REC_PAUSED: z.literal('rec_paused'),
  CAP: z.literal('cap'),
  PB: z.literal('pb'),
  PB_ING: z.literal('pb_ing'),
  PB_PAUSED: z.literal('pb_paused'),
  CAP_TL_IDLE: z.literal('cap_tl_idle'),
  CAP_TL_ING: z.literal('cap_tl_ing'),
  CAP_BURST: z.literal('cap_burst'),
  CAP_SNAP_IDLE: z.literal('cap_snap_idle'),
  CAP_SNAP_ING: z.literal('cap_snap_ing'),
  REC_TL_IDLE: z.literal('rec_tl_idle'),
  REC_TL_ING: z.literal('rec_tl_ing'),
  UNKNOWN: z.literal('unknown'),
});

export const StreamIndicesSchema = z.object({
  STREAM0: z.literal('stream0'),
  STREAM1: z.literal('stream1'),
  VALID_INDICES: z.array(z.enum(['stream0', 'stream1'])),
});

// ===============================
// 输出配置
// ===============================

export const OutputConfigSchema = z.object({
  FORMATS: z.array(z.enum(['table', 'json', 'csv'])),
  DEFAULT_FORMAT: z.enum(['table', 'json', 'csv']),
});

// ===============================
// 文件配置
// ===============================

export const FileConfigSchema = z.object({
  DEFAULT_PROFILE: z.string().default('default'),
  CONFIG_DIR: z.string().default('.zcam'),
  CONFIG_FILE: z.string().default('config.json'),
  FAVORITES_FILE: z.string().default('favorites.json'),
  CAMERAS_FILE: z.string().default('cameras.json'),
  TEMPLATES_DIR: z.string().default('templates'),
});

// ===============================
// 相机相关配置
// ===============================

// 相机收藏夹条目
export const FavoriteCameraSchema = z.object({
  ip: z.string(),
  alias: z.string(),
});

// 相机信息
export const CameraInfoSchema = z.object({
  ip: z.string(),
  name: z.string(),
  model: z.string(),
  firmware: z.string(),
  mac: z.string(),
  serialNumber: z.string(),
  addedAt: z.date(),
});

// 订阅选项
export const SubscriptionOptionsSchema = z.object({
  basicInfo: z.boolean().default(true),
  statusUpdates: z.boolean().default(true),
  recordingStatus: z.boolean().default(true),
  ptzPosition: z.boolean().default(false),
  batteryStatus: z.boolean().default(false),
  temperatureStatus: z.boolean().default(false),
});

// 相机上下文配置
export const CameraContextConfigSchema = z.object({
  id: z.string(),
  cameraIp: z.string(),
  alias: z.string(),
  isActive: z.boolean(),
  lastUpdated: z.date(),
  cameraInfo: z.object({
    recording: z.boolean().optional(),
    batteryVoltage: z.number().optional(),
    temperature: z.number().optional(),
    panPosition: z.number().optional(),
    tiltPosition: z.number().optional(),
    focusDistance: z.number().optional(),
  }),
  subscriptionOptions: SubscriptionOptionsSchema.optional(),
});

// ===============================
// 完整配置模式
// ===============================

// MCP服务器完整配置
export const ZcamMcpConfigSchema = z.object({
  server: ServerConfigSchema,
  version: VersionConfigSchema,
  features: FeaturesConfigSchema,
  network: NetworkConfigSchema,
});

// CLI工具完整配置
export const ZcamCliConfigSchema = z.object({
  version: VersionConfigSchema,
  network: NetworkConfigSchema,
  features: FeaturesConfigSchema,
  validation: ValidationRangesSchema,
  api: z.object({
    endpoints: ApiEndpointsSchema,
  }),
  constants: z.object({
    userPermissions: UserPermissionsSchema,
    networkModes: NetworkModesSchema,
    whiteBalanceModes: WhiteBalanceModesSchema,
    videoEncoders: VideoEncodersSchema,
    recordModes: RecordModesSchema,
    streamIndices: StreamIndicesSchema,
    output: OutputConfigSchema,
    files: FileConfigSchema,
  }),
});

// 用户配置文件模式（用于持久化）
export const UserConfigSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  cameras: z.object({
    favorites: z.array(z.object({
      ip: z.string(),
      alias: z.string().optional(),
      addedAt: z.date().optional()
    })), // 收藏相机列表，支持别名
    history: z.array(CameraInfoSchema),
  }),
  contexts: z.array(CameraContextConfigSchema),
  settings: z.object({
    defaultFormat: z.enum(['table', 'json', 'csv']).default('table'),
    verboseOutput: z.boolean().default(false),
    colorOutput: z.boolean().default(true),
  }).partial(),
});

// ===============================
// 基础默认值（用于兼容性）
// ===============================

export const defaultHost = '192.168.1.100';
export const defaultPort = 80;
export const defaultTimeout = 30000;

// ===============================
// 配置实例和工具函数
// ===============================

// 默认MCP配置
export const defaultMcpConfig: z.infer<typeof ZcamMcpConfigSchema> = {
  server: {
    port: 3000,
    host: 'localhost',
  },
  version: {
    version: '1.0.0',
    userAgent: 'Z-CAM-MCP/1.0.0',
    apiVersion: '1.0.0',
  },
  features: {
    enableLogging: true,
    enableCache: false,
    maxConnections: 100,
    verboseOutput: false,
    colorOutput: true,
  },
  network: {
    defaultHost: '192.168.1.100',
    defaultPort: 80,
    defaultTimeout: 30000,
    minRequestInterval: 50,
    maxTimeout: 300000,
    minTimeout: 1000,
  },
};

// 默认CLI配置
export const defaultCliConfig: z.infer<typeof ZcamCliConfigSchema> = {
  version: {
    version: '1.0.0',
    userAgent: 'Z-CAM-CLI/1.0.0',
    apiVersion: '1.0.0',
  },
  network: {
    defaultHost: '192.168.1.100',
    defaultPort: 80,
    defaultTimeout: 30000,
    minRequestInterval: 50,
    maxTimeout: 300000,
    minTimeout: 1000,
  },
  features: {
    enableLogging: true,
    enableCache: false,
    maxConnections: 100,
    verboseOutput: false,
    colorOutput: true,
  },
  validation: {
    hostPattern: '^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$',
    portRange: { min: 1, max: 65535 },
    timeoutRange: { min: 1000, max: 300000 },
    isoRange: { min: 100, max: 25600 },
    shutterRange: { min: 1, max: 8000 },
    irisRange: { min: 1.4, max: 22 },
    gainRange: { min: 0, max: 30 },
    brightnessRange: { min: 0, max: 100 },
    contrastRange: { min: 0, max: 100 },
    saturationRange: { min: 0, max: 100 },
    sharpnessRange: { min: 0, max: 100 },
    hueRange: { min: 0, max: 100 },
    ptzSpeedRange: { min: 0, max: 63 },
    presetIndexRange: { min: 1, max: 255 },
  },
  api: {
    endpoints: {
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
      CTRL_MODE: '/ctrl/mode',
      CTRL_REBOOT: '/ctrl/reboot',
      CTRL_SHUTDOWN: '/ctrl/shutdown',
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
      MJPEG_STREAM: '/mjpeg_stream',
    },
  },
  constants: {
    userPermissions: {
      ADMIN: 'admin',
      OPERATOR: 'operator',
      VIEWER: 'viewer',
      VALID_PERMISSIONS: ['admin', 'operator', 'viewer'],
    },
    networkModes: {
      DHCP_CLIENT: 'Router',
      DHCP_SERVER: 'Direct',
      STATIC: 'Static',
      VALID_MODES: ['Router', 'Direct', 'Static'],
    },
    whiteBalanceModes: {
      AUTO: 'auto',
      MANUAL: 'manual',
      TUNGSTEN: 'tungsten',
      FLUORESCENT: 'fluorescent',
      DAYLIGHT: 'daylight',
      CLOUDY: 'cloudy',
      VALID_MODES: ['auto', 'manual', 'tungsten', 'fluorescent', 'daylight', 'cloudy'],
    },
    videoEncoders: {
      H264: 'h264',
      H265: 'h265',
      VALID_ENCODERS: ['h264', 'h265'],
    },
    recordModes: {
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
      UNKNOWN: 'unknown',
    },
    streamIndices: {
      STREAM0: 'stream0',
      STREAM1: 'stream1',
      VALID_INDICES: ['stream0', 'stream1'],
    },
    output: {
      FORMATS: ['table', 'json', 'csv'],
      DEFAULT_FORMAT: 'table',
    },
    files: {
      DEFAULT_PROFILE: 'default',
      CONFIG_DIR: '.zcam',
      CONFIG_FILE: 'config.json',
      FAVORITES_FILE: 'favorites.json',
      CAMERAS_FILE: 'cameras.json',
      TEMPLATES_DIR: 'templates',
    },
  },
};

// 配置验证函数
export function validateMcpConfig(config: unknown): z.infer<typeof ZcamMcpConfigSchema> {
  return ZcamMcpConfigSchema.parse(config);
}

export function validateCliConfig(config: unknown): z.infer<typeof ZcamCliConfigSchema> {
  return ZcamCliConfigSchema.parse(config);
}

export function validateUserConfig(config: unknown): z.infer<typeof UserConfigSchema> {
  return UserConfigSchema.parse(config);
}

export function mergeWithDefaults<T extends z.ZodTypeAny>(
  config: unknown,
  schema: T,
  defaults: z.infer<T>
): z.infer<T> {
  try {
    return schema.parse(config);
  } catch (error) {
    // 如果验证失败，返回默认配置
    return defaults;
  }
}

// 类型导出
export type UserConfigType = z.infer<typeof UserConfigSchema>;
export type ZcamMcpConfigType = z.infer<typeof ZcamMcpConfigSchema>;
export type ZcamCliConfigType = z.infer<typeof ZcamCliConfigSchema>;
export type CameraContextConfig = z.infer<typeof CameraContextConfigSchema>;
