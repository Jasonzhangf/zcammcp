const { ZCamAPI, createAPI } = require('../../../src/core/api');
const fetch = require('node-fetch');

// Mock fetch
jest.mock('node-fetch');

describe('ZCamAPI', () => {
  let api;

  beforeEach(() => {
    fetch.mockClear();
    api = new ZCamAPI({
      host: '192.168.1.100',
      port: 80,
      timeout: 5000
    });
  });

  describe('Constructor', () => {
    test('should initialize with default values', () => {
      const defaultApi = new ZCamAPI();
      expect(defaultApi.host).toBe('192.168.1.100');
      expect(defaultApi.port).toBe(80);
      expect(defaultApi.timeout).toBe(20000);
      expect(defaultApi.baseURL).toBe('http://192.168.1.100:80');
    });

    test('should initialize with custom values', () => {
      const customApi = new ZCamAPI({
        host: '192.168.1.200',
        port: 8080,
        timeout: 10000
      });
      expect(customApi.host).toBe('192.168.1.200');
      expect(customApi.port).toBe(8080);
      expect(customApi.timeout).toBe(10000);
      expect(customApi.baseURL).toBe('http://192.168.1.200:8080');
    });
  });

  describe('Request Method', () => {
    test('should make successful GET request', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true })
      };
      fetch.mockResolvedValue(mockResponse);

      const result = await api.get('/test');

      expect(fetch).toHaveBeenCalledWith(
        'http://192.168.1.100:80/test',
        expect.objectContaining({
          signal: expect.any(AbortSignal),
          headers: {
            'User-Agent': 'Z-CAM-CLI/1.0.0'
          }
        })
      );
      expect(result).toEqual({ success: true });
    });

    test('should make successful POST request', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true })
      };
      fetch.mockResolvedValue(mockResponse);

      const data = { test: 'data' };
      const result = await api.post('/test', data);

      expect(fetch).toHaveBeenCalledWith(
        'http://192.168.1.100:80/test',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(data),
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Z-CAM-CLI/1.0.0'
          }
        })
      );
      expect(result).toEqual({ success: true });
    });

    test('should handle non-JSON response', async () => {
      const mockResponse = {
        ok: true,
        headers: {
          get: jest.fn().mockReturnValue('text/plain')
        },
        text: jest.fn().mockResolvedValue('Plain text response')
      };
      fetch.mockResolvedValue(mockResponse);

      const result = await api.get('/test');

      expect(result).toEqual({ success: true, data: 'Plain text response' });
    });

    test('should add session cookie if available', async () => {
      api.sessionCookie = 'session-id=12345';
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true })
      };
      fetch.mockResolvedValue(mockResponse);

      await api.get('/test');

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Cookie': 'session-id=12345'
          })
        })
      );
    });

    test('should save session cookie from response', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true }),
        headers: {
          get: jest.fn().mockReturnValue('session-id=67890')
        }
      };
      fetch.mockResolvedValue(mockResponse);

      await api.get('/test');

      expect(api.sessionCookie).toBe('session-id=67890');
    });
  });

  describe('Error Handling', () => {
    test('should throw APIError for HTTP error responses', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found'
      };
      fetch.mockResolvedValue(mockResponse);

      await expect(api.get('/test')).rejects.toThrow(APIError);
    });

    test('should throw ConnectionError for connection refused', async () => {
      const error = new Error('ECONNREFUSED');
      error.code = 'ECONNREFUSED';
      fetch.mockRejectedValue(error);

      await expect(api.get('/test')).rejects.toThrow(ConnectionError);
    });

    test('should throw ConnectionError for timeout', async () => {
      const error = new Error('AbortError');
      error.name = 'AbortError';
      fetch.mockRejectedValue(error);

      await expect(api.get('/test')).rejects.toThrow(ConnectionError);
    });

    test('should throw ConnectionError for host not found', async () => {
      const error = new Error('ENOTFOUND');
      error.code = 'ENOTFOUND';
      fetch.mockRejectedValue(error);

      await expect(api.get('/test')).rejects.toThrow(ConnectionError);
    });
  });

  describe('Request Rate Limiting', () => {
    test('should rate limit requests', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true })
      };
      fetch.mockResolvedValue(mockResponse);

      const startTime = Date.now();
      await api.get('/test1');
      await api.get('/test2');

      const endTime = Date.now();
      const elapsed = endTime - startTime;

      // Should take at least 50ms due to rate limiting
      expect(elapsed).toBeGreaterThanOrEqual(40);
    });
  });

  describe('Utility Methods', () => {
    test('should get base URL', () => {
      expect(api.getBaseURL()).toBe('http://192.168.1.100:80');
    });

    test('should get connection info', () => {
      const info = api.getConnectionInfo();
      expect(info.host).toBe('192.168.1.100');
      expect(info.port).toBe(80);
      expect(info.timeout).toBe(5000);
      expect(info.baseURL).toBe('http://192.168.1.100:80');
      expect(info.hasSession).toBe(false);
    });

    test('should test connection', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ status: 'connected' })
      };
      fetch.mockResolvedValue(mockResponse);

      const isConnected = await api.testConnection();

      expect(isConnected).toBe(true);
      expect(fetch).toHaveBeenCalledWith('http://192.168.1.100:80/info');
    });

    test('should handle connection test failure', async () => {
      fetch.mockRejectedValue(new Error('Connection failed'));

      const isConnected = await api.testConnection();

      expect(isConnected).toBe(false);
    });

    test('should set timeout', () => {
      api.setTimeout(10000);
      expect(api.timeout).toBe(10000);
    });

    test('should set request interval', () => {
      api.setRequestInterval(100);
      expect(api.minRequestInterval).toBe(100);
    });
  });

  describe('HTTP Method Aliases', () => {
    test('should support DELETE method', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true })
      };
      fetch.mockResolvedValue(mockResponse);

      const result = await api.delete('/test');

      expect(fetch).toHaveBeenCalledWith(
        'http://192.168.1.100:80/test',
        expect.objectContaining({
          method: 'DELETE'
        })
      );
      expect(result).toEqual({ success: true });
    });

    test('should support PUT method', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true })
      };
      fetch.mockResolvedValue(mockResponse);

      const data = { test: 'data' };
      const result = await api.put('/test', data);

      expect(fetch).toHaveBeenCalledWith(
        'http://192.168.1.100:80/test',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(data)
        })
      );
      expect(result).toEqual({ success: true });
    });
  });

  describe('URL Construction', () => {
    test('should handle URLs with query parameters', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true })
      };
      fetch.mockResolvedValue(mockResponse);

      await api.get('/test', { param1: 'value1', param2: 'value2' });

      expect(fetch).toHaveBeenCalledWith(
        'http://192.168.1.100:80/test?param1=value1&param2=value2',
        expect.any(Object)
      );
    });

    test('should handle URLs with special characters', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true })
      };
      fetch.mockResolvedValue(mockResponse);

      await api.get('/test with spaces');

      expect(fetch).toHaveBeenCalledWith(
        'http://192.168.1.100:80/test%20with%20spaces',
        expect.any(Object)
      );
    });
  });
});

describe('createAPI', () => {
  test('should create API instance with default profile', () => {
    const globalOptions = {
      profile: 'default'
    };

    // Mock config
    jest.mock('../../../src/config/config', () => ({
      getProfile: jest.fn().mockReturnValue({
        host: '192.168.1.100',
        port: '80',
        timeout: '20000'
      })
    }));

    const { getProfile } = require('../../../src/config/config');
    getProfile.mockReturnValue({
      host: '192.168.1.100',
      port: '80',
      timeout: '20000'
    });

    const api = createAPI(globalOptions);

    expect(api).toBeInstanceOf(ZCamAPI);
    expect(api.host).toBe('192.168.1.100');
    expect(api.port).toBe('80');
    expect(api.timeout).toBe('20000');
  });

  test('should create API instance with custom options', () => {
    const globalOptions = {
      host: '192.168.1.200',
      port: '8080',
      timeout: '10000',
      profile: 'custom'
    };

    const api = createAPI(globalOptions);

    expect(api.host).toBe('192.168.1.200');
    expect(api.port).toBe('8080');
    expect(api.timeout).toBe('10000');
  });

  test('should use global options over config', () => {
    const globalOptions = {
      host: '192.168.1.300',
      port: '9090',
      timeout: '15000',
      profile: 'test'
    };

    const api = createAPI(globalOptions);

    expect(api.host).toBe('192.168.1.300');
    expect(api.port).toBe('9090');
    expect(api.timeout).toBe('15000');
  });
});