#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError, } from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'fs/promises';
class ZcamMcpServer {
    server;
    constructor() {
        this.server = new Server({
            name: 'zcammcp',
            version: '0.0.1',
        }, {
            capabilities: {
                tools: {},
            },
        });
        this.setupToolHandlers();
    }
    setupToolHandlers() {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            return {
                tools: [
                    {
                        name: 'read_file',
                        description: '读取文件内容',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                path: {
                                    type: 'string',
                                    description: '文件路径',
                                },
                            },
                            required: ['path'],
                        },
                    },
                    {
                        name: 'write_file',
                        description: '写入文件内容',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                path: {
                                    type: 'string',
                                    description: '文件路径',
                                },
                                content: {
                                    type: 'string',
                                    description: '文件内容',
                                },
                            },
                            required: ['path', 'content'],
                        },
                    },
                    {
                        name: 'list_directory',
                        description: '列出目录内容',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                path: {
                                    type: 'string',
                                    description: '目录路径',
                                },
                            },
                            required: ['path'],
                        },
                    },
                ],
            };
        });
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;
            try {
                switch (name) {
                    case 'read_file':
                        return await this.readFile(args?.path);
                    case 'write_file':
                        return await this.writeFile(args?.path, args?.content);
                    case 'list_directory':
                        return await this.listDirectory(args?.path);
                    default:
                        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
                }
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                throw new McpError(ErrorCode.InternalError, `Tool execution failed: ${errorMessage}`);
            }
        });
    }
    async readFile(path) {
        try {
            const content = await fs.readFile(path, 'utf-8');
            return {
                content: [
                    {
                        type: 'text',
                        text: content,
                    },
                ],
            };
        }
        catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `❌ 读取文件失败: ${error instanceof Error ? error.message : String(error)}`,
                    },
                ],
            };
        }
    }
    async writeFile(path, content) {
        try {
            await fs.writeFile(path, content, 'utf-8');
            return {
                content: [
                    {
                        type: 'text',
                        text: `✅ 文件已成功写入: ${path}`,
                    },
                ],
            };
        }
        catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `❌ 写入文件失败: ${error instanceof Error ? error.message : String(error)}`,
                    },
                ],
            };
        }
    }
    async listDirectory(path) {
        try {
            const entries = await fs.readdir(path, { withFileTypes: true });
            const list = entries.map(entry => `${entry.isDirectory() ? '[DIR]' : '[FILE]'} ${entry.name}`).join('\n');
            return {
                content: [
                    {
                        type: 'text',
                        text: list,
                    },
                ],
            };
        }
        catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `❌ 列出目录失败: ${error instanceof Error ? error.message : String(error)}`,
                    },
                ],
            };
        }
    }
    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error('Zcam MCP Server running on stdio');
    }
}
const server = new ZcamMcpServer();
server.run().catch(console.error);
//# sourceMappingURL=index.js.map