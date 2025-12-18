const { UvcService } = require('../../src/services/uvc-service');

describe('UvcService', () => {
  test('builds query string for getProperty', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => '{"value":123}',
    });
    const service = new UvcService({ baseUrl: 'http://localhost:18000', fetchImpl, timeoutMs: 100 });
    const result = await service.getProperty('brightness');

    expect(result).toEqual({ value: 123 });
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://localhost:18000/usbvideoctrl?key=brightness',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  test('throws on timeout', async () => {
    const fetchImpl = (_url, options = {}) =>
      new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          resolve({
            ok: true,
            status: 200,
            text: async () => '{}',
          });
        }, 1000);

        if (options.signal) {
          options.signal.addEventListener(
            'abort',
            () => {
              clearTimeout(timer);
              reject(new Error('UVC request timed out'));
            },
            { once: true },
          );
        }
      });

    const service = new UvcService({ baseUrl: 'http://localhost:18000', fetchImpl, timeoutMs: 10 });
    await expect(service.getProperty('zoom')).rejects.toThrow(/timed out/i);
  });

  test('setProperty passes auto flag', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '{"ok":true}',
    });
    const service = new UvcService({ baseUrl: 'http://localhost:18000', fetchImpl, timeoutMs: 100 });
    await service.setProperty('exposure', 120, { auto: true });
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining('key=exposure&value=120&auto=true'),
      expect.anything(),
    );
  });
});
