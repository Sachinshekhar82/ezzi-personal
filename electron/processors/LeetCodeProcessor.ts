import axios from 'axios';
import type {
  LeetCodeDebugResponse,
  LeetCodeSolveResponse,
} from '../../shared/api';
import { DEFAULT_GEMINI_API_KEY, DEFAULT_GEMINI_MODEL } from '../../shared/constants';
import type { AppModeProcessor, ProcessingParams, ProcessingResult } from './AppModeProcessor';

export class LeetCodeProcessor implements AppModeProcessor {
  private async processWithGemini(params: ProcessingParams, _isDebug = false): Promise<ProcessingResult<any>> {
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || DEFAULT_GEMINI_API_KEY;
    const model = process.env.GEMINI_MODEL || process.env.VITE_GEMINI_MODEL || DEFAULT_GEMINI_MODEL;

    if (!apiKey) {
      return {
        success: false,
        error: 'Gemini API key is required. Please set GEMINI_API_KEY in your .env file or Settings.',
      };
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model,
    )}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const { images = [], signal, readableVarNames = true } = params;

    const parts: Array<{ text?: string; inline_data?: { mime_type: string; data: string } }> = [
      {
        text: `You are an elite competitive programmer solving a LeetCode problem.
Analyze the screenshots of the problem statement and code editor.
Provide ONLY the clean, optimal code solution in the language shown in the editor.
Use readable variable names: ${readableVarNames}.
Return valid JSON format:
{
  "code": "// Solution code here",
  "conversationId": "leetcode-session-1"
}`,
      },
    ];

    for (const img of images) {
      let mimeType = 'image/png';
      let data = img;
      if (img.startsWith('data:')) {
        const p = img.split(';base64,');
        mimeType = p[0].replace('data:', '');
        data = p[1] || '';
      }
      if (data) {
        parts.push({
          inline_data: {
            mime_type: mimeType,
            data,
          },
        });
      }
    }

    try {
      const response = await axios.post(
        endpoint,
        {
          contents: [{ role: 'user', parts }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json',
          },
        },
        { signal, timeout: 60000 },
      );

      const candidateText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!candidateText) {
        throw new Error('Empty response from Gemini');
      }

      let parsed: any;
      try {
        let cleaned = candidateText.trim();
        if (cleaned.startsWith('```json')) cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        else if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
        parsed = JSON.parse(cleaned);
      } catch {
        parsed = {
          code: candidateText,
        };
      }

      return {
        success: true,
        data: {
          code: parsed.code || candidateText,
          conversationId: parsed.conversationId || 'leetcode-1',
        },
      };
    } catch (err: any) {
      if (axios.isCancel(err)) {
        return { success: false, error: 'Processing was canceled by the user.' };
      }
      const data = err.response?.data;
      if (data?.error?.message?.includes('leaked')) {
        return {
          success: false,
          error: 'Gemini API Error: Your API key was blocked because it was leaked. Please get a fresh free API key at https://aistudio.google.com/app/apikey and paste it into .env or Settings.',
        };
      }
      if (data?.error?.message) {
        return { success: false, error: `Gemini API Error: ${data.error.message}` };
      }
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Gemini processing error',
      };
    }
  }

  async processSolve(params: ProcessingParams): Promise<ProcessingResult<LeetCodeSolveResponse>> {
    return this.processWithGemini(params, false);
  }

  async processDebug(params: ProcessingParams): Promise<ProcessingResult<LeetCodeDebugResponse>> {
    return this.processWithGemini(params, true);
  }
}
