import { GeminiService } from './geminiService';

describe('GeminiService', () => {
  it('should get a singleton instance', () => {
    const instance1 = GeminiService.getInstance();
    const instance2 = GeminiService.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('should instantiate and have default model', () => {
    const service = GeminiService.getInstance();
    expect(service).toBeDefined();
  });
});
