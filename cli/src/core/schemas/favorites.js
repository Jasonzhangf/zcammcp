/**
 * 收藏配置 Schema
 * 使用 AJV 进行数据验证
 */

const favoritesSchema = {
  $schema: "http://json-schema.org/draft-07/schema#",
  type: "object",
  properties: {
    cameras: {
      type: "object",
      additionalProperties: {
        type: "object",
        properties: {
          name: {
            type: "string",
            minLength: 1,
            maxLength: 50,
            description: "相机昵称"
          },
          ip: {
            type: "string",
            pattern: "^(?:[0-9]{1,3}\\.){3}[0-9]{1,3}$",
            description: "相机IP地址"
          },
          host: {
            type: "string",
            pattern: "^(?:[0-9]{1,3}\\.){3}[0-9]{1,3}$",
            description: "相机主机地址"
          },
          port: {
            type: "integer",
            minimum: 1,
            maximum: 65535,
            default: 80,
            description: "HTTP端口"
          },
          username: {
            type: "string",
            description: "用户名"
          },
          password: {
            type: "string",
            description: "密码"
          },
          description: {
            type: "string",
            maxLength: 200,
            description: "描述"
          },
          tags: {
            type: "array",
            items: {
              type: "string",
              maxLength: 30
            },
            uniqueItems: true,
            maxItems: 10,
            description: "标签"
          },
          created_at: {
            type: "string",
            format: "date-time",
            description: "创建时间"
          },
          updated_at: {
            type: "string",
            format: "date-time",
            description: "更新时间"
          },
          is_default: {
            type: "boolean",
            default: false,
            description: "是否为默认相机"
          },
          last_connected: {
            type: ["string", "null"],
            format: "date-time",
            description: "最后连接时间"
          },
          connection_status: {
            type: "string",
            enum: ["connected", "disconnected", "unknown"],
            default: "unknown",
            description: "连接状态"
          }
        },
        required: ["name", "host", "created_at"],
        additionalProperties: false
      }
    },
    presets: {
      type: "object",
      additionalProperties: {
        type: "object",
        properties: {
          name: {
            type: "string",
            minLength: 1,
            maxLength: 50,
            description: "预设名称"
          },
          camera_id: {
            type: "string",
            description: "关联的相机ID"
          },
          preset_index: {
            type: "integer",
            minimum: 1,
            maximum: 255,
            description: "预设索引"
          },
          description: {
            type: "string",
            maxLength: 200,
            description: "描述"
          },
          position: {
            type: "object",
            properties: {
              pan: {
                type: "number",
                description: "平移位置"
              },
              tilt: {
                type: "number",
                description: "俯仰位置"
              },
              zoom: {
                type: "number",
                description: "变焦位置"
              },
              focus: {
                type: "number",
                description: "对焦位置"
              }
            },
            description: "预设位置信息"
          },
          settings: {
            type: "object",
            properties: {
              exposure: {
                type: "object",
                description: "曝光设置"
              },
              white_balance: {
                type: "object",
                description: "白平衡设置"
              },
              image: {
                type: "object",
                description: "图像设置"
              }
            },
            additionalProperties: true,
            description: "预设设置"
          },
          created_at: {
            type: "string",
            format: "date-time",
            description: "创建时间"
          },
          updated_at: {
            type: "string",
            format: "date-time",
            description: "更新时间"
          },
          tags: {
            type: "array",
            items: {
              type: "string",
              maxLength: 30
            },
            uniqueItems: true,
            maxItems: 10,
            description: "标签"
          }
        },
        required: ["name", "camera_id", "preset_index", "created_at"],
        additionalProperties: false
      }
    }
  },
  metadata: {
    type: "object",
    properties: {
      version: {
        type: "string",
        pattern: "^\\d+\\.\\d+\\.\\d+$",
        description: "配置文件版本"
      },
      created_at: {
        type: "string",
        format: "date-time",
        description: "配置文件创建时间"
      },
      updated_at: {
        type: "string",
        format: "date-time",
        description: "配置文件更新时间"
      },
      export_count: {
        type: "integer",
        minimum: 0,
        description: "导出次数"
      },
      import_count: {
        type: "integer",
        minimum: 0,
        description: "导入次数"
      }
    },
    required: ["version", "created_at", "updated_at"],
    additionalProperties: false
  },
  required: ["cameras", "presets"],
  additionalProperties: false
};

module.exports = favoritesSchema;