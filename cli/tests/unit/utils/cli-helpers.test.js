/**
 * CLI辅助工具单元测试
 */

const {
  resolveOutputFormat,
  getGlobalOptions,
  resolveConnectionOptions,
  resolveTimeout,
  isVerboseMode,
  isColorDisabled,
  formatErrorMessage,
  isValidIP,
  isValidPort,
  safeParseJSON,
  formatOptionsHelp,
  delay,
  retry
} = require('../../../src/utils/cli-helpers');

describe('CLI辅助工具测试', () => {
  describe('resolveOutputFormat', () => {
    test('应该优先使用命令级别的json选项', () => {
      const options = { json: true };
      const globalOptions = { output: 'csv' };

      const result = resolveOutputFormat(options, globalOptions);

      expect(result).toBe('json');
    });

    test('应该回退到全局级别的json选项', () => {
      const options = {};
      const globalOptions = { json: true };

      const result = resolveOutputFormat(options, globalOptions);

      expect(result).toBe('json');
    });

    test('应该使用全局输出格式设置', () => {
      const options = {};
      const globalOptions = { output: 'json' };

      const result = resolveOutputFormat(options, globalOptions);

      expect(result).toBe('json');
    });

    test('应该使用全局级别的输出格式设置', () => {
      const options = { output: 'csv' };
      const globalOptions = { output: 'json' };

      const result = resolveOutputFormat(options, globalOptions);

      expect(result).toBe('json');
    });

    test('应该回退到默认格式', () => {
      const options = {};
      const globalOptions = {};

      const result = resolveOutputFormat(options, globalOptions);

      expect(result).toBe('table');
    });

    test('应该忽略无效的输出格式', () => {
      const options = { output: 'invalid-format' };
      const globalOptions = {};

      const result = resolveOutputFormat(options, globalOptions);

      expect(result).toBe('table');
    });

    test('应该处理大小写混合的输出格式', () => {
      const options = { output: 'JSON' };
      const globalOptions = {};

      const result = resolveOutputFormat(options, globalOptions);

      expect(result).toBe('json');
    });
  });

  describe('getGlobalOptions', () => {
    test('应该从根命令获取全局选项', () => {
      const mockRootCmd = {
        opts: () => ({ timeout: 5000, verbose: true })
      };

      const mockCmd = {
        parent: mockRootCmd
      };

      const result = getGlobalOptions(mockCmd);

      expect(result).toEqual({ timeout: 5000, verbose: true });
    });

    test('应该处理深层嵌套的命令结构', () => {
      const mockRootCmd = {
        opts: () => ({ timeout: 3000 })
      };

      const mockCmd = {
        parent: {
          parent: mockRootCmd
        }
      };

      const result = getGlobalOptions(mockCmd);

      expect(result).toEqual({ timeout: 3000 });
    });

    test('应该处理没有父命令的情况', () => {
      const mockCmd = {};

      const result = getGlobalOptions(mockCmd);

      expect(result).toEqual({});
    });

    test('应该处理opts方法返回null的情况', () => {
      const mockCmd = {
        parent: {
          opts: () => null
        }
      };

      const result = getGlobalOptions(mockCmd);

      expect(result).toEqual({});
    });

    test('应该处理异常情况', () => {
      const mockCmd = {
        parent: {
          opts: () => {
            throw new Error('opts error');
          }
        }
      };

      const result = getGlobalOptions(mockCmd);

      expect(result).toEqual({});
    });
  });

  describe('resolveConnectionOptions', () => {
    test('应该合并所有配置源', () => {
      const options = { host: '192.168.1.100', port: 8080 };
      const globalOptions = { timeout: 10000 };

      const result = resolveConnectionOptions(options, globalOptions);

      expect(result.host).toBe('192.168.1.100');
      expect(result.port).toBe(8080);
      expect(result.timeout).toBe(10000);
      expect(result.username).toBe('');
      expect(result.password).toBe('');
    });

    test('应该使用默认值', () => {
      const options = {};
      const globalOptions = {};

      const result = resolveConnectionOptions(options, globalOptions);

      expect(result.host).toBe('192.168.1.100');
      expect(result.port).toBe(80);
      expect(result.timeout).toBe(30000);
    });

    test('应该验证配置值', () => {
      const options = { host: 'invalid-host', port: 99999 };
      const globalOptions = {};

      const result = resolveConnectionOptions(options, globalOptions);

      // 无效值应该被默认值替换
      expect(typeof result.host).toBe('string');
      expect(typeof result.port).toBe('number');
    });
  });

  describe('resolveTimeout', () => {
    test('应该优先使用命令级别的超时设置', () => {
      const options = { timeout: 5000 };
      const globalOptions = { timeout: 10000 };

      const result = resolveTimeout(options, globalOptions);

      expect(result).toBe(5000);
    });

    test('应该使用全局超时设置', () => {
      const options = {};
      const globalOptions = { timeout: 8000 };

      const result = resolveTimeout(options, globalOptions);

      expect(result).toBe(8000);
    });

    test('应该使用默认超时值', () => {
      const options = {};
      const globalOptions = {};

      const result = resolveTimeout(options, globalOptions);

      expect(result).toBe(30000);
    });

    test('应该规范化超时值', () => {
      const options = { timeout: '20000' };
      const globalOptions = {};

      const result = resolveTimeout(options, globalOptions);

      expect(result).toBe(20000);
    });

    test('应该拒绝无效的超时值', () => {
      const options = { timeout: 500 };
      const globalOptions = {};

      const result = resolveTimeout(options, globalOptions);

      expect(result).toBe(30000); // 使用默认值
    });
  });

  describe('isVerboseMode', () => {
    test('应该检测命令级别的详细模式', () => {
      const options = { verbose: true };
      const globalOptions = {};

      expect(isVerboseMode(options, globalOptions)).toBe(true);
    });

    test('应该检测全局级别的详细模式', () => {
      const options = {};
      const globalOptions = { verbose: true };

      expect(isVerboseMode(options, globalOptions)).toBe(true);
    });

    test('应该处理非详细模式', () => {
      const options = {};
      const globalOptions = {};

      expect(isVerboseMode(options, globalOptions)).toBe(false);
    });
  });

  describe('isColorDisabled', () => {
    test('应该检测命令级别的禁用颜色设置', () => {
      const options = { noColor: true };
      const globalOptions = {};

      expect(isColorDisabled(options, globalOptions)).toBe(true);
    });

    test('应该检测全局级别的禁用颜色设置', () => {
      const options = {};
      const globalOptions = { noColor: true };

      expect(isColorDisabled(options, globalOptions)).toBe(true);
    });

    test('应该处理启用颜色的情况', () => {
      const options = {};
      const globalOptions = {};

      expect(isColorDisabled(options, globalOptions)).toBe(false);
    });
  });

  describe('formatErrorMessage', () => {
    test('应该格式化基本错误消息', () => {
      const error = new Error('Test error');

      const result = formatErrorMessage(error);

      expect(result).toBe('Test error');
    });

    test('应该添加错误代码', () => {
      const error = new Error('Test error');
      error.code = 'TEST_ERROR';

      const result = formatErrorMessage(error);

      expect(result).toBe('[TEST_ERROR] Test error');
    });

    test('应该在详细模式下添加堆栈信息', () => {
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at test.js:1:1';

      const result = formatErrorMessage(error, true, true);

      expect(result).toContain('Test error');
      expect(result).toContain('堆栈信息:');
      expect(result).toContain('Error: Test error');
    });

    test('应该处理没有消息的错误', () => {
      const error = new Error();

      const result = formatErrorMessage(error);

      expect(result).toBe('未知错误');
    });
  });

  describe('isValidIP', () => {
    test('应该验证有效的IP地址', () => {
      expect(isValidIP('192.168.1.1')).toBe(true);
      expect(isValidIP('10.0.0.1')).toBe(true);
      expect(isValidIP('127.0.0.1')).toBe(true);
    });

    test('应该拒绝无效的IP地址', () => {
      expect(isValidIP('256.168.1.1')).toBe(false);
      expect(isValidIP('192.168.1')).toBe(false);
      expect(isValidIP('invalid-ip')).toBe(false);
    });
  });

  describe('isValidPort', () => {
    test('应该验证有效的端口号', () => {
      expect(isValidPort(80)).toBe(true);
      expect(isValidPort(8080)).toBe(true);
      expect(isValidPort('443')).toBe(true);
    });

    test('应该拒绝无效的端口号', () => {
      expect(isValidPort(0)).toBe(false);
      expect(isValidPort(65536)).toBe(false);
      expect(isValidPort(-1)).toBe(false);
      expect(isValidPort('invalid')).toBe(false);
    });
  });

  describe('safeParseJSON', () => {
    test('应该解析有效的JSON', () => {
      const jsonString = '{"key": "value", "number": 42}';

      const result = safeParseJSON(jsonString);

      expect(result).toEqual({ key: 'value', number: 42 });
    });

    test('应该处理解析错误', () => {
      const jsonString = 'invalid json';
      const defaultValue = { error: true };

      const result = safeParseJSON(jsonString, defaultValue);

      expect(result).toEqual(defaultValue);
    });

    test('应该使用null作为默认值', () => {
      const jsonString = 'invalid json';

      const result = safeParseJSON(jsonString);

      expect(result).toBe(null);
    });

    test('应该处理空字符串', () => {
      const jsonString = '';

      const result = safeParseJSON(jsonString);

      expect(result).toBe(null);
    });
  });

  describe('formatOptionsHelp', () => {
    test('应该格式化选项帮助信息', () => {
      const options = [
        {
          flags: '--timeout <ms>',
          description: '请求超时时间',
          defaultValue: 5000
        },
        {
          flags: '--verbose',
          description: '详细模式'
        }
      ];

      const result = formatOptionsHelp(options);

      expect(result).toContain('--timeout <ms>');
      expect(result).toContain('请求超时时间');
      expect(result).toContain('(默认: 5000)');
      expect(result).toContain('--verbose');
      expect(result).toContain('详细模式');
    });

    test('应该处理空选项数组', () => {
      const options = [];

      const result = formatOptionsHelp(options);

      expect(result).toBe('');
    });

    test('应该处理非数组输入', () => {
      const options = null;

      const result = formatOptionsHelp(options);

      expect(result).toBe('');
    });

    test('应该处理缺少属性的选项', () => {
      const options = [
        { flags: '--help' },
        { description: 'Some description' },
        { flags: '--version', defaultValue: '1.0.0' }
      ];

      const result = formatOptionsHelp(options);

      expect(result).toContain('--help');
      expect(result).toContain('Some description');
      expect(result).toContain('--version');
      expect(result).toContain('(默认: 1.0.0)');
    });
  });

  describe('delay', () => {
    test('应该延迟指定时间', async () => {
      const start = Date.now();

      await delay(100);

      const end = Date.now();
      const elapsed = end - start;

      expect(elapsed).toBeGreaterThanOrEqual(90);
      expect(elapsed).toBeLessThan(200);
    });

    test('应该支持零延迟', async () => {
      const start = Date.now();

      await delay(0);

      const end = Date.now();
      const elapsed = end - start;

      expect(elapsed).toBeLessThan(50);
    });
  });

  describe('retry', () => {
    test('应该在第一次尝试成功时返回结果', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');

      const result = await retry(mockFn, 3, 100);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    test('应该在失败后重试', async () => {
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('first error'))
        .mockResolvedValue('success');

      const result = await retry(mockFn, 3, 10);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    test('应该在最大重试次数后抛出错误', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('persistent error'));

      await expect(retry(mockFn, 2, 10)).rejects.toThrow('persistent error');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    test('应该支持自定义重试次数和延迟', async () => {
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('error 1'))
        .mockRejectedValueOnce(new Error('error 2'))
        .mockResolvedValue('success');

      const start = Date.now();
      const result = await retry(mockFn, 3, 50);
      const end = Date.now();

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(3);
      expect(end - start).toBeGreaterThan(100); // 至少2次延迟
    });
  });

  describe('集成测试', () => {
    test('应该完整处理CLI选项解析流程', () => {
      const options = {
        output: 'json',
        timeout: 8000,
        verbose: true
      };

      const globalOptions = {
        host: '192.168.1.100',
        noColor: true
      };

      const outputFormat = resolveOutputFormat(options, globalOptions);
      const connectionOptions = resolveConnectionOptions(options, globalOptions);
      const timeout = resolveTimeout(options, globalOptions);
      const verbose = isVerboseMode(options, globalOptions);
      const noColor = isColorDisabled(options, globalOptions);

      expect(outputFormat).toBe('json');
      expect(connectionOptions.host).toBe('192.168.1.100');
      expect(connectionOptions.timeout).toBe(8000);
      expect(timeout).toBe(8000);
      expect(verbose).toBe(true);
      expect(noColor).toBe(true);
    });

    test('应该处理错误情况下的回退机制', () => {
      const options = {
        output: 'invalid-format',
        timeout: 500,
        host: 'invalid-host'
      };

      const globalOptions = {};

      const outputFormat = resolveOutputFormat(options, globalOptions);
      const connectionOptions = resolveConnectionOptions(options, globalOptions);
      const timeout = resolveTimeout(options, globalOptions);

      expect(outputFormat).toBe('table'); // 默认格式
      expect(typeof connectionOptions.host).toBe('string');
      expect(typeof connectionOptions.port).toBe('number');
      expect(timeout).toBe(30000); // 默认超时
    });
  });
});