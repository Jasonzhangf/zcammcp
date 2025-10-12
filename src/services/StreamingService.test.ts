import { StreamingService } from './StreamingService';

describe('StreamingService', () => {
  let streamingService: StreamingService;

  beforeEach(() => {
    streamingService = new StreamingService();
  });

  describe('setEnabled', () => {
    it('should create StreamingService instance', () => {
      expect(streamingService).toBeInstanceOf(StreamingService);
    });
  });
});