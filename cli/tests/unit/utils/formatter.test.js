/**
 * 输出格式化工具单元测试
 */

const { formatOutput, formatTable, formatJSON, formatCSV } = require('../../../src/utils/formatter');

describe('格式化工具测试', () => {
  describe('formatOutput', () => {
    test('应该支持表格格式输出', () => {
      const data = { key: 'value', number: 42 };
      const result = formatOutput(data, 'table');

      expect(typeof result).toBe('string');
      expect(result).toContain('key');
      expect(result).toContain('value');
    });

    test('应该支持JSON格式输出', () => {
      const data = { key: 'value', number: 42 };
      const result = formatOutput(data, 'json');

      const parsed = JSON.parse(result);
      expect(parsed.key).toBe('value');
      expect(parsed.number).toBe(42);
    });

    test('应该支持CSV格式输出', () => {
      const data = { key: 'value', number: 42 };
      const result = formatOutput(data, 'csv');

      expect(typeof result).toBe('string');
      expect(result).toContain('key');
      expect(result).toContain('value');
    });

    test('应该使用默认格式', () => {
      const data = { key: 'value' };
      const result = formatOutput(data);

      expect(typeof result).toBe('string');
      // 默认应该是表格格式
    });

    test('应该处理数组数据', () => {
      const data = [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' }
      ];
      const result = formatOutput(data, 'table');

      expect(typeof result).toBe('string');
      expect(result).toContain('Item 1');
      expect(result).toContain('Item 2');
    });

    test('应该处理空对象', () => {
      const data = {};
      const result = formatOutput(data, 'json');

      const parsed = JSON.parse(result);
      expect(parsed).toEqual({});
    });

    test('应该处理null/undefined数据', () => {
      const result1 = formatOutput(null, 'json');
      const result2 = formatOutput(undefined, 'json');

      expect(result1).toBe('null');
      expect(result2).toBe('undefined');
    });
  });

  describe('formatTable', () => {
    test('应该格式化对象为表格', () => {
      const data = {
        camera: 'e2ptz',
        ip: '192.168.9.59',
        status: 'online'
      };

      const result = formatTable(data);

      expect(typeof result).toBe('string');
      expect(result).toContain('camera');
      expect(result).toContain('e2ptz');
      expect(result).toContain('192.168.9.59');
      expect(result).toContain('online');
    });

    test('应该格式化数组为表格', () => {
      const data = [
        { id: 1, name: 'Camera 1', status: 'online' },
        { id: 2, name: 'Camera 2', status: 'offline' }
      ];

      const result = formatTable(data);

      expect(typeof result).toBe('string');
      expect(result).toContain('Camera 1');
      expect(result).toContain('Camera 2');
      expect(result).toContain('online');
      expect(result).toContain('offline');
    });

    test('应该处理嵌套对象', () => {
      const data = {
        info: { model: 'e2ptz', sn: '91PT0002216' },
        settings: { resolution: '4K', fps: 30 }
      };

      const result = formatTable(data);

      expect(typeof result).toBe('string');
      expect(result).toContain('info');
      expect(result).toContain('settings');
      expect(result).toContain('{2 keys}');
    });

    test('应该处理空数组', () => {
      const data = [];
      const result = formatTable(data);

      expect(result).toBe('No data');
    });

    test('应该处理空对象', () => {
      const data = {};
      const result = formatTable(data);

      expect(result).toBe('No data');
    });

    test('应该处理复杂数据类型', () => {
      const data = {
        timestamp: new Date('2023-01-01T00:00:00.000Z'),
        active: true,
        count: 42,
        percentage: 75.5
      };

      const result = formatTable(data);

      expect(typeof result).toBe('string');
      expect(result).toContain('2023-01-01');
      expect(result).toContain('true');
      expect(result).toContain('42');
      expect(result).toContain('75.5');
    });
  });

  describe('formatJSON', () => {
    test('应该格式化对象为JSON', () => {
      const data = { key: 'value', number: 42 };
      const result = formatJSON(data);

      expect(typeof result).toBe('string');
      const parsed = JSON.parse(result);
      expect(parsed.key).toBe('value');
      expect(parsed.number).toBe(42);
    });

    test('应该支持缩进选项', () => {
      const data = { level1: { level2: 'value' } };
      const result = formatJSON(data, 2);

      const parsed = JSON.parse(result);
      expect(parsed.level1.level2).toBe('value');
    });

    test('应该处理循环引用', () => {
      const data = { name: 'test' };
      data.self = data;

      const result = formatJSON(data);

      expect(typeof result).toBe('string');
      // 应该能序列化，可能有循环引用标记
    });

    test('应该处理特殊字符', () => {
      const data = { message: 'Hello "World"! \n\t' };
      const result = formatJSON(data);

      expect(typeof result).toBe('string');
      const parsed = JSON.parse(result);
      expect(parsed.message).toBe('Hello "World"! \n\t');
    });

    test('应该处理null/undefined', () => {
      const result1 = formatJSON(null);
      const result2 = formatJSON(undefined);

      expect(result1).toBe('null');
      expect(result2).toBe('undefined');
    });

    test('应该处理函数类型', () => {
      const data = {
        func: function() { return 'test'; },
        arrowFunc: () => 'test'
      };

      const result = formatJSON(data);

      expect(typeof result).toBe('string');
      // 函数应该被忽略或序列化为undefined
    });
  });

  describe('formatCSV', () => {
    test('应该格式化对象为CSV', () => {
      const data = {
        camera: 'e2ptz',
        ip: '192.168.9.59',
        status: 'online'
      };

      const result = formatCSV(data);

      expect(typeof result).toBe('string');
      expect(result).toContain('camera');
      expect(result).toContain('e2ptz');
      expect(result).toContain('192.168.9.59');
      expect(result).toContain('online');
      expect(result.split('\n').length).toBeGreaterThan(1);
    });

    test('应该格式化数组为CSV', () => {
      const data = [
        { id: 1, name: 'Camera 1', status: 'online' },
        { id: 2, name: 'Camera 2', status: 'offline' }
      ];

      const result = formatCSV(data);

      expect(typeof result).toBe('string');
      expect(result).toContain('id,name,status');
      expect(result).toContain('1,Camera 1,online');
      expect(result).toContain('2,Camera 2,offline');
    });

    test('应该正确转义CSV特殊字符', () => {
      const data = {
        description: 'Camera with "quotes" and, comma',
        notes: 'Line\nbreak'
      };

      const result = formatCSV(data);

      expect(typeof result).toBe('string');
      expect(result).toContain('"Camera with ""quotes"" and, comma"');
    });

    test('应该处理空数组', () => {
      const data = [];
      const result = formatCSV(data);

      expect(result).toBe('');
    });

    test('应该处理空对象', () => {
      const data = {};
      const result = formatCSV(data);

      expect(result).toBe('');
    });

    test('应该处理数字和布尔值', () => {
      const data = {
        count: 42,
        active: true,
        percentage: 75.5
      };

      const result = formatCSV(data);

      expect(typeof result).toBe('string');
      expect(result).toContain('42');
      expect(result).toContain('true');
      expect(result).toContain('75.5');
    });
  });

  describe('格式化边界情况测试', () => {
    test('应该处理大数据集', () => {
      const largeArray = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        value: Math.random() * 100
      }));

      const start = Date.now();
      const result = formatOutput(largeArray, 'table');
      const end = Date.now();

      expect(typeof result).toBe('string');
      expect(end - start).toBeLessThan(1000); // 应该在1秒内完成
    });

    test('应该处理深度嵌套对象', () => {
      const deepObject = {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: 'deep value'
              }
            }
          }
        }
      };

      const result = formatOutput(deepObject, 'json');
      const parsed = JSON.parse(result);
      expect(parsed.level1.level2.level3.level4.level5).toBe('deep value');
    });

    test('应该处理日期对象', () => {
      const date = new Date('2023-01-01T12:00:00.000Z');
      const data = { timestamp: date, created: date };

      const result = formatOutput(data, 'json');
      const parsed = JSON.parse(result);
      expect(parsed.timestamp).toBe(date.toISOString());
      expect(parsed.created).toBe(date.toISOString());
    });
  });

  describe('格式化一致性测试', () => {
    test('相同数据在不同格式下应保持信息完整性', () => {
      const data = {
        camera: 'e2ptz',
        ip: '192.168.9.59',
        status: 'online',
        settings: {
          resolution: '4K',
          fps: 30
        }
      };

      const tableResult = formatOutput(data, 'table');
      const jsonResult = formatOutput(data, 'json');
      const csvResult = formatOutput(data, 'csv');

      // 所有格式都应该包含关键信息
      expect(tableResult).toContain('e2ptz');
      expect(jsonResult).toContain('e2ptz');
      expect(csvResult).toContain('e2ptz');

      expect(tableResult).toContain('192.168.9.59');
      expect(jsonResult).toContain('192.168.9.59');
      expect(csvResult).toContain('192.168.9.59');
    });

    test('JSON格式应该可以往返解析', () => {
      const originalData = {
        nested: { value: 'test' },
        array: [1, 2, 3],
        special: 'Hello "World"'
      };

      const formatted = formatOutput(originalData, 'json');
      const parsed = JSON.parse(formatted);

      expect(parsed).toEqual(originalData);
    });
  });

  describe('性能测试', () => {
    test('应该能处理大量数据而不崩溃', () => {
      const largeObject = {};
      for (let i = 0; i < 1000; i++) {
        largeObject[`key${i}`] = `value${i}`;
      }

      expect(() => {
        formatOutput(largeObject, 'json');
        formatOutput(largeObject, 'table');
      }).not.toThrow();
    });

    test('格式化操作应该是同步的', () => {
      const data = { test: 'data' };

      const start = Date.now();
      formatOutput(data, 'json');
      formatOutput(data, 'table');
      const end = Date.now();

      expect(end - start).toBeLessThan(100); // 应该很快完成
    });
  });
});