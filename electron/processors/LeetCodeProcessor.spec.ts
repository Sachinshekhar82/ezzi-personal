import axios from 'axios';
import type { ProcessingParams } from './AppModeProcessor';
import { LeetCodeProcessor } from './LeetCodeProcessor';

jest.mock('axios');

function createParams(overrides: Partial<ProcessingParams> = {}): ProcessingParams {
  return {
    images: ['data:image/png;base64,xxx'],
    isMock: false,
    readableVarNames: false,
    signal: new AbortController().signal,
    headers: { 'Content-Type': 'application/json' },
    ...overrides,
  };
}

const mockedAxios = axios as unknown as jest.Mocked<any>;
const mockedIsCancel = jest.fn();

describe('LeetCodeProcessor', () => {
  let processor: LeetCodeProcessor;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, GEMINI_API_KEY: 'test-gemini-key' };
    processor = new LeetCodeProcessor();
    mockedIsCancel.mockReturnValue(false);
    (axios as unknown as { isCancel: jest.Mock }).isCancel = mockedIsCancel;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('processSolve', () => {
    test('WHEN Gemini request succeeds THEN it returns success with parsed data', async () => {
      const geminiResponse = {
        data: {
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      problem_statement: 'Two Sum',
                      thoughts: ['Use hash map for O(N) lookup'],
                      code: 'def twoSum(nums, target): return []',
                      time_complexity: 'O(N)',
                      space_complexity: 'O(N)',
                    }),
                  },
                ],
              },
            },
          ],
        },
      };
      mockedAxios.post.mockResolvedValueOnce(geminiResponse);

      // Act
      const result = await processor.processSolve(createParams());

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.code).toContain('def twoSum');
    });

    test('WHEN API key is missing THEN it returns descriptive error', async () => {
      delete process.env.GEMINI_API_KEY;
      delete process.env.VITE_GEMINI_API_KEY;

      // Act
      const result = await processor.processSolve(createParams());

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Gemini API key is required');
    });

    test('WHEN request is cancelled THEN it returns cancelled error', async () => {
      mockedIsCancel.mockReturnValueOnce(true);
      mockedAxios.post.mockRejectedValueOnce(new Error('cancelled'));

      // Act
      const result = await processor.processSolve(createParams());

      // Assert
      expect(result.error).toBe('Processing was canceled by the user.');
    });
  });

  describe('processDebug', () => {
    test('WHEN debug request succeeds THEN it returns corrected data', async () => {
      const geminiResponse = {
        data: {
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      thoughts: ['Fixed off-by-one error'],
                      code: 'def fixed(): pass',
                      time_complexity: 'O(N)',
                      space_complexity: 'O(1)',
                      what_changed: ['Adjusted loop range'],
                    }),
                  },
                ],
              },
            },
          ],
        },
      };
      mockedAxios.post.mockResolvedValueOnce(geminiResponse);

      // Act
      const result = await processor.processDebug(createParams({ conversationId: 'c1' }));

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.code).toBe('def fixed(): pass');
    });

    test('WHEN request is cancelled THEN it returns cancelled error', async () => {
      mockedIsCancel.mockReturnValueOnce(true);
      mockedAxios.post.mockRejectedValueOnce(new Error('cancelled'));

      // Act
      const result = await processor.processDebug(createParams({ conversationId: 'c1' }));

      // Assert
      expect(result.error).toBe('Processing was canceled by the user.');
    });
  });
});
