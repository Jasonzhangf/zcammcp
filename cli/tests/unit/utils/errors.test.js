const {
  ZCamError,
  APIError,
  ConnectionError,
  ValidationError,
  ConfigError,
  ModuleError,
  CameraStateError,
  PermissionError,
  HardwareError,
  TimeoutError,
  createValidationError,
  createAPIError,
  createConnectionError,
  formatError,
  isAPIError,
  isConnectionError,
  isValidationError
} = require('../../../src/utils/errors');

describe('Error Classes', () => {
  describe('ZCamError', () => {
    test('should create a ZCamError with basic properties', () => {
      const error = new ZCamError('Test message', 'TEST_ERROR');

      expect(error.message).toBe('Test message');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.name).toBe('ZCamError');
      expect(error.details).toEqual({});
      expect(error.timestamp).toBeDefined();
    });

    test('should create a ZCamError with details', () => {
      const details = { field: 'test', value: 123 };
      const error = new ZCamError('Test message', 'TEST_ERROR', details);

      expect(error.details).toEqual(details);
    });

    test('should serialize to JSON', () => {
      const error = new ZCamError('Test message', 'TEST_ERROR');
      const json = error.toJSON();

      expect(json.name).toBe('ZCamError');
      expect(json.message).toBe('Test message');
      expect(json.code).toBe('TEST_ERROR');
      expect(json.timestamp).toBeDefined();
    });
  });

  describe('APIError', () => {
    test('should create an APIError with status and message', () => {
      const error = new APIError(404, 'Not Found', 'http://example.com/api');

      expect(error.name).toBe('APIError');
      expect(error.message).toBe('Not Found');
      expect(error.code).toBe('API_404');
      expect(error.status).toBe(404);
      expect(error.url).toBe('http://example.com/api');
      expect(error.details.status).toBe(404);
      expect(error.details.statusText).toBe('Not Found');
      expect(error.details.url).toBe('http://example.com/api');
    });

    test('should create appropriate user messages for different status codes', () => {
      const error401 = new APIError(401, 'Unauthorized');
      expect(error401.message).toContain('认证失败');

      const error404 = new APIError(404, 'Not Found');
      expect(error404.message).toContain('API端点不存在');

      const error500 = new APIError(500, 'Internal Server Error');
      expect(error500.message).toContain('相机内部错误');
    });

    test('should be identified by isAPIError', () => {
      const error = new APIError(500, 'Server Error');
      expect(isAPIError(error)).toBe(true);
      expect(isValidationError(error)).toBe(false);
    });
  });

  describe('ConnectionError', () => {
    test('should create a ConnectionError', () => {
      const originalError = new Error('ECONNREFUSED');
      const error = new ConnectionError('Cannot connect', 'http://example.com', originalError);

      expect(error.name).toBe('ConnectionError');
      expect(error.message).toContain('Cannot connect');
      expect(error.url).toBe('http://example.com');
      expect(error.originalError).toBe(originalError);
    });

    test('should create appropriate user messages for different error codes', () => {
      const error1 = new ConnectionError('Test', '', { code: 'ECONNREFUSED' });
      expect(error1.message).toContain('Cannot connect to camera');

      const error2 = new ConnectionError('Test', '', { code: 'ENOTFOUND' });
      expect(error2.message).toContain('Camera host not found');
    });

    test('should be identified by isConnectionError', () => {
      const error = new ConnectionError('Test');
      expect(isConnectionError(error)).toBe(true);
      expect(isValidationError(error)).toBe(false);
    });
  });

  describe('ValidationError', () => {
    test('should create a ValidationError', () => {
      const error = new ValidationError('Invalid value', 'field1', 'invalid');

      expect(error.name).toBe('ValidationError');
      expect(error.field).toBe('field1');
      expect(error.value).toBe('invalid');
    });

    test('should be identified by isValidationError', () => {
      const error = new ValidationError('Test');
      expect(isValidationError(error)).toBe(true);
      expect(isAPIError(error)).toBe(false);
    });
  });

  describe('ConfigError', () => {
    test('should create a ConfigError', () => {
      const error = new ConfigError('Config error', '/path/to/config', 10);

      expect(error.name).toBe('ConfigError');
      expect(error.configPath).toBe('/path/to/config');
      expect(error.line).toBe(10);
    });
  });

  describe('ModuleError', () => {
    test('should create a ModuleError', () => {
      const originalError = new Error('Module failed');
      const error = new ModuleError('Module error', 'camera', originalError);

      expect(error.name).toBe('ModuleError');
      expect(error.moduleName).toBe('camera');
      expect(error.originalError).toBe(originalError);
    });
  });
});

describe('Error Creation Functions', () => {
  describe('createValidationError', () => {
    test('should create a ValidationError', () => {
      const error = createValidationError('Test error', 'field', 'value');

      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toBe('Test error');
      expect(error.field).toBe('field');
      expect(error.value).toBe('value');
    });
  });

  describe('createAPIError', () => {
    test('should create an APIError', () => {
      const error = createAPIError(500, 'Server Error', 'http://example.com');

      expect(error).toBeInstanceOf(APIError);
      expect(error.status).toBe(500);
      expect(error.message).toBe('Server Error');
      expect(error.url).toBe('http://example.com');
    });
  });

  describe('createConnectionError', () => {
    test('should create a ConnectionError', () => {
      const originalError = new Error('Network error');
      const error = createConnectionError('Network failed', 'http://example.com', originalError);

      expect(error).toBeInstanceOf(ConnectionError);
      expect(error.originalError).toBe(originalError);
    });
  });
});

describe('Error Utilities', () => {
  describe('formatError', () => {
    test('should format error with stack', () => {
      const error = new ZCamError('Test error', 'TEST_CODE');
      const formatted = formatError(error, true);

      expect(formatted.type).toBe('ZCamError');
      expect(formatted.message).toBe('Test error');
      expect(formatted.code).toBe('TEST_CODE');
      expect(formatted.timestamp).toBeDefined();
      expect(formatted.stack).toBeDefined();
    });

    test('should format error without stack', () => {
      const error = new ZCamError('Test error', 'TEST_CODE');
      const formatted = formatError(error, false);

      expect(formatted.type).toBe('ZCamError');
      expect(formatted.message).toBe('Test error');
      expect(formatted.code).toBe('TEST_CODE');
      expect(formatted.timestamp).toBeDefined();
      expect(formatted.stack).toBeUndefined();
    });

    test('should format error with details', () => {
      const error = new ZCamError('Test error', 'TEST_CODE', { field: 'test' });
      const formatted = formatError(error);

      expect(formatted.details).toEqual({ field: 'test' });
    });

    test('should handle errors without name', () => {
      const error = new Error('Generic error');
      const formatted = formatError(error);

      expect(formatted.type).toBe('Error');
      expect(formatted.message).toBe('Generic error');
    });
  });
});

describe('Error Type Checking', () => {
  test('should correctly identify error types', () => {
    const apiError = new APIError(500, 'Server Error');
    const connectionError = new ConnectionError('Connection failed');
    const validationError = new ValidationError('Validation failed');
    const genericError = new Error('Generic error');

    expect(isAPIError(apiError)).toBe(true);
    expect(isAPIError(connectionError)).toBe(false);
    expect(isAPIError(validationError)).toBe(false);
    expect(isAPIError(genericError)).toBe(false);

    expect(isConnectionError(connectionError)).toBe(true);
    expect(isConnectionError(apiError)).toBe(false);

    expect(isValidationError(validationError)).toBe(true);
    expect(isValidationError(apiError)).toBe(false);
  });
});

describe('Error Edge Cases', () => {
  test('should handle undefined details', () => {
    const error = new ZCamError('Test', 'TEST');
    expect(error.details).toEqual({});
  });

  test('should handle empty message', () => {
    const error = new ZCamError('', 'TEST');
    expect(error.message).toBe('');
  });

  test('should handle missing stack trace', () => {
    const error = new ZCamError('Test', 'TEST');
    const json = error.toJSON();
    expect(json.stack).toBeDefined(); // Error.stack may be undefined, but toJSON should include it if available
  });

  test('should handle custom error code', () => {
    const error = new ZCamError('Test', 'CUSTOM_123');
    expect(error.code).toBe('CUSTOM_123');
  });
});