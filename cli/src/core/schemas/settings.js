/**
 * 设置管理 Schema
 * 使用 AJV 进行数据验证
 */

const settingsSchema = {
  $schema: "http://json-schema.org/draft-07/schema#",
  type: "object",
  properties: {
    global: {
      type: "object",
      properties: {
        language: {
          type: "string",
          enum: ["zh-CN", "en-US", "ja-JP"],
          default: "zh-CN",
          description: "界面语言"
        },
        theme: {
          type: "string",
          enum: ["light", "dark", "auto"],
          default: "auto",
          description: "界面主题"
        },
        output_format: {
          type: "string",
          enum: ["table", "json", "csv"],
          default: "table",
          description: "默认输出格式"
        },
        auto_save: {
          type: "boolean",
          default: true,
          description: "自动保存设置"
        },
        auto_save_interval: {
          type: "integer",
          minimum: 30,
          maximum: 3600,
          default: 300,
          description: "自动保存间隔（秒）"
        },
        backup_count: {
          type: "integer",
          minimum: 1,
          maximum: 10,
          default: 5,
          description: "备份文件数量"
        },
        log_level: {
          type: "string",
          enum: ["error", "warn", "info", "debug"],
          default: "info",
          description: "日志级别"
        },
        confirm_dangerous_operations: {
          type: "boolean",
          default: true,
          description: "危险操作确认"
        },
        show_tips: {
          type: "boolean",
          default: true,
          description: "显示提示信息"
        },
        timeout: {
          type: "object",
          properties: {
            connection: {
              type: "integer",
              minimum: 1000,
              maximum: 60000,
              default: 20000,
              description: "连接超时（毫秒）"
            },
            operation: {
              type: "integer",
              minimum: 5000,
              maximum: 120000,
              default: 30000,
              description: "操作超时（毫秒）"
            },
            request: {
              type: "integer",
              minimum: 50,
              maximum: 1000,
              default: 50,
              description: "请求间隔（毫秒）"
            }
          },
          required: ["connection", "operation", "request"],
          additionalProperties: false,
          description: "超时设置"
        }
      },
      required: ["language", "theme", "output_format"],
      additionalProperties: false,
      description: "全局设置"
    },
    cameras: {
      type: "object",
      additionalProperties: {
        type: "object",
        properties: {
          auto_connect: {
            type: "boolean",
            default: false,
            description: "自动连接"
          },
          connection_check_interval: {
            type: "integer",
            minimum: 5,
            maximum: 300,
            default: 30,
            description: "连接检查间隔（秒）"
          },
          reconnect_attempts: {
            type: "integer",
            minimum: 1,
            maximum: 10,
            default: 3,
            description: "重连尝试次数"
          },
          default_stream_settings: {
            type: "object",
            properties: {
              bitrate: {
                type: "integer",
                minimum: 1000,
                maximum: 50000,
                default: 5000,
                description: "默认码率"
              },
              resolution: {
                type: "string",
                enum: ["1920x1080", "1280x720", "3840x2160"],
                default: "1920x1080",
                description: "默认分辨率"
              },
              fps: {
                type: "integer",
                enum: [24, 25, 30, 50, 60],
                default: 30,
                description: "默认帧率"
              },
              encoder: {
                type: "string",
                enum: ["h264", "h265"],
                default: "h264",
                description: "默认编码器"
              }
            },
            required: ["bitrate"],
            additionalProperties: false,
            description: "默认流设置"
          },
          default_record_settings: {
            type: "object",
            properties: {
              resolution: {
                type: "string",
                enum: ["3840x2160", "1920x1080", "1280x720"],
                default: "1920x1080",
                description: "默认录制分辨率"
              },
              fps: {
                type: "integer",
                enum: [24, 25, 30, 50, 60],
                default: 30,
                description: "默认录制帧率"
              },
              codec: {
                type: "string",
                enum: ["h264", "h265"],
                default: "h264",
                description: "默认编码器"
              },
              quality: {
                type: "string",
                enum: ["high", "medium", "low"],
                default: "high",
                description: "默认录制质量"
              }
            },
            required: ["resolution", "fps", "codec"],
            additionalProperties: false,
            description: "默认录制设置"
          },
          default_image_settings: {
            type: "object",
            properties: {
              profile: {
                type: "string",
                enum: ["rec709", "slog3", "zlog2"],
                default: "rec709",
                description: "默认图像配置文件"
              },
              sharpness: {
                type: "integer",
                minimum: 0,
                maximum: 100,
                default: 50,
                description: "默认锐度"
              },
              contrast: {
                type: "integer",
                minimum: 0,
                maximum: 100,
                default: 50,
                description: "默认对比度"
              },
              saturation: {
                type: "integer",
                minimum: 0,
                maximum: 100,
                default: 50,
                description: "默认饱和度"
              }
            },
            required: ["profile"],
            additionalProperties: false,
            description: "默认图像设置"
          }
        },
        required: [],
        additionalProperties: false,
        description: "相机特定设置"
      }
    },
    presets: {
      type: "object",
      properties: {
        auto_save: {
          type: "boolean",
          default: true,
          description: "自动保存预设"
        },
        default_settings: {
          type: "object",
          properties: {
            speed_mode: {
              type: "string",
              enum: ["speed", "time", "index"],
              default: "speed",
              description: "默认速度模式"
            },
            speed_value: {
              type: "integer",
              minimum: 1,
              maximum: 9,
              default: 5,
              description: "默认速度值"
            },
            freeze: {
              type: "boolean",
              default: false,
              description: "默认冻结画面"
            }
          },
          required: [],
          additionalProperties: false,
          description: "默认预设设置"
        },
        naming_pattern: {
          type: "string",
          enum: ["auto", "manual"],
          default: "auto",
          description: "预设命名模式"
        },
        auto_naming_template: {
          type: "string",
          maxLength: 100,
          default: "预设 {index}",
          description: "自动命名模板"
        },
        max_presets_per_camera: {
          type: "integer",
          minimum: 1,
          maximum: 255,
          default: 20,
          description: "每个相机最大预设数量"
        }
      },
      required: [],
      additionalProperties: false,
      description: "预设全局设置"
    },
    network: {
      type: "object",
      properties: {
        proxy: {
          type: "object",
          properties: {
            enabled: {
              type: "boolean",
              default: false,
              description: "启用代理"
            },
            host: {
              type: "string",
              description: "代理主机"
            },
            port: {
              type: "integer",
              minimum: 1,
              maximum: 65535,
              description: "代理端口"
            },
            username: {
              type: "string",
              description: "代理用户名"
            },
            password: {
              type: "string",
              description: "代理密码"
            }
          },
          required: ["enabled"],
          additionalProperties: false,
          description: "代理设置"
        },
        dns_servers: {
          type: "array",
          items: {
            type: "string",
            pattern: "^(?:[0-9]{1,3}\\.){3}[0-9]{1,3}$",
            description: "DNS服务器地址"
          },
          maxItems: 2,
          description: "DNS服务器列表"
        },
        retry_policy: {
          type: "object",
          properties: {
            max_attempts: {
              type: "integer",
              minimum: 1,
              maximum: 10,
              default: 3,
              description: "最大重试次数"
            },
            retry_delay: {
              type: "integer",
              minimum: 1000,
              maximum: 30000,
              default: 5000,
              description: "重试延迟（毫秒）"
            },
            backoff_multiplier: {
              type: "number",
              minimum: 1,
              maximum: 5,
              default: 2,
              description: "退避倍数"
            }
          },
          required: ["max_attempts", "retry_delay"],
          additionalProperties: false,
          description: "重试策略"
        }
      },
      required: [],
      additionalProperties: false,
      description: "网络设置"
    },
    security: {
      type: "object",
      properties: {
        session_timeout: {
          type: "integer",
          minimum: 300,
          maximum: 86400,
          default: 3600,
          description: "会话超时（秒）"
        },
        password_storage: {
          type: "string",
          enum: ["memory", "keyring", "file"],
          default: "memory",
          description: "密码存储方式"
        },
        encrypt_credentials: {
          type: "boolean",
          default: true,
          description: "加密凭据"
        },
        trusted_hosts: {
          type: "array",
          items: {
            type: "string",
            pattern: "^(?:[0-9]{1,3}\\.){3}[0-9]{1,3}$"
          },
          description: "受信任的主机列表"
        },
        auto_logout: {
          type: "boolean",
          default: false,
          description: "自动登出"
        },
        auto_logout_interval: {
          type: "integer",
          minimum: 300,
          maximum: 86400,
          default: 7200,
          description: "自动登出间隔（秒）"
        }
      },
      required: [],
      additionalProperties: false,
      description: "安全设置"
    }
  },
  required: ["global"],
  additionalProperties: false
};

module.exports = settingsSchema;