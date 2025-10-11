# ZcamMCP

基于stdio的MCP服务器，用于iFlow CLI集成和管理。

## 功能

- 读取文件内容
- 写入文件内容
- 列出目录内容

## 安装

```bash
npm install
npm run build
```

## 使用方法

### MCP工具

1. `read_file` - 读取文件内容
2. `write_file` - 写入文件内容
3. `list_directory` - 列出目录内容

### 配置

#### MCP Raw JSON 配置方式

在 Claude Desktop 或其他 MCP 客户端中，可以使用以下 raw JSON 配置：

```json
{
  "mcpServers": {
    "zcammcp": {
      "command": "node",
      "args": ["/Users/fanzhang/zcammcp/dist/index.js"],
      "env": {}
    }
  }
}
```

#### 添加命令方式

在 Claude Desktop 配置文件中添加以下内容：

1. 打开 Claude Desktop 配置文件（macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`）

2. 在 `mcpServers` 部分添加：
```json
{
  "mcpServers": {
    "zcammcp": {
      "command": "node",
      "args": ["/Users/fanzhang/zcammcp/dist/index.js"]
    }
  }
}
```

3. 重启 Claude Desktop 以加载新的 MCP 服务器

#### iFlow CLI 配置

MCP服务器已配置在 `.iflow/settings.json` 中，可在iFlow CLI中自动加载。

## 开发

```bash
npm run dev  # 开发模式
npm run build  # 构建
npm start  # 运行
```