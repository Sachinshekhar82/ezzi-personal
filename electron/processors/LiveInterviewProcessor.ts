import axios, { type AxiosResponse } from 'axios';
import {
  API_ENDPOINTS,
  type DebugRequest,
  type DebugResponse,
  type SolveRequest,
  type SolveResponse,
} from '../../shared/api';
import { API_BASE_URL, DEFAULT_GEMINI_API_KEY, DEFAULT_GEMINI_MODEL } from '../../shared/constants';
import type { AppModeProcessor, ProcessingParams, ProcessingResult } from './AppModeProcessor';

export class LiveInterviewProcessor implements AppModeProcessor {
  private async processWithGemini(params: ProcessingParams, _isDebug = false): Promise<ProcessingResult<any>> {
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || DEFAULT_GEMINI_API_KEY;
    const model = process.env.GEMINI_MODEL || process.env.VITE_GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model,
    )}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const { images = [], signal, readableVarNames = true } = params;

    const parts: Array<{ text?: string; inline_data?: { mime_type: string; data: string } }> = [
      {
        text: `You are an elite live technical interview assistant. Analyze the screenshots and generate a structured JSON response.
Readable variable names: ${readableVarNames}
Format required:
{
  "problem_statement": "Brief 1-2 sentence problem summary",
  "thoughts": ["Key intuition", "Step-by-step verbal reasoning points to speak out loud"],
  "code": "// Clean optimal solution with comments",
  "time_complexity": "O(...)",
  "space_complexity": "O(...)",
  "edge_cases": ["Edge case 1", "Edge case 2"],
  "follow_ups": [{"question": "Expected follow up", "answer": "Optimal answer"}]
}
Return valid JSON only.`,
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
            temperature: 0.2,
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
          problem_statement: 'Live Interview Problem',
          thoughts: ['Analyzed problem statement', 'Generated optimal algorithmic solution'],
          code: candidateText,
          time_complexity: 'O(N)',
          space_complexity: 'O(1)',
        };
      }

      return { success: true, data: { ...parsed, conversationId: parsed.conversationId || 'gemini-live-1' } };
    } catch (err) {
      if (axios.isCancel(err)) {
        return { success: false, error: 'Processing was canceled by the user.' };
      }
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Gemini processing error',
      };
    }
  }

  async processSolve(params: ProcessingParams): Promise<ProcessingResult<SolveResponse>> {
    const geminiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (geminiKey && !params.headers?.Authorization) {
      return this.processWithGemini(params, false);
    }

    try {
      const { images, isMock, readableVarNames, signal, headers } = params;

      const extractResponse = await axios.post<SolveRequest, AxiosResponse<SolveResponse>>(
        `${API_BASE_URL}${API_ENDPOINTS.SOLUTIONS.SOLVE}`,
        {
          images,
          isMock,
          readableVarNames,
        },
        {
          signal,
          timeout: 300000,
          headers,
        },
      );

      return { success: true, data: extractResponse.data };
    } catch (error: unknown) {
      if (axios.isCancel(error)) {
        return {
          success: false,
          error: 'Processing was canceled by the user.',
        };
      }

      const axiosError = error as {
        response?: { status?: number; data?: unknown };
        message?: string;
      };

      if (axiosError.response?.status === 401) {
        return {
          success: false,
          error: 'Your session or subscription has expired. Please sign in again.',
        };
      }

      if (axiosError.response?.status === 402) {
        return {
          success: false,
          error: 'Upgrade to Pro to generate solutions. Visit getezzi.com to upgrade your plan.',
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      };
    }
  }

  async processDebug(params: ProcessingParams): Promise<ProcessingResult<DebugResponse>> {
    const geminiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (geminiKey && !params.headers?.Authorization) {
      return this.processWithGemini(params, true);
    }

    try {
      const { images, isMock, readableVarNames, signal, headers } = params;

      const response = await axios.post<DebugRequest, AxiosResponse<DebugResponse>>(
        `${API_BASE_URL}${API_ENDPOINTS.SOLUTIONS.DEBUG}`,
        { images, isMock, readableVarNames },
        {
          signal,
          timeout: 300000,
          headers,
        },
      );

      return { success: true, data: response.data };
    } catch (error: unknown) {
      if (axios.isCancel(error)) {
        return {
          success: false,
          error: 'Processing was canceled by the user.',
        };
      }

      const axiosError = error as {
        response?: { status?: number; data?: unknown };
        message?: string;
      };

      if (axiosError.response?.status === 401) {
        return {
          success: false,
          error: 'Your session or subscription has expired. Please sign in again.',
        };
      }

      if (axiosError.response?.status === 402) {
        return {
          success: false,
          error: 'Upgrade to Pro to generate solutions. Visit getezzi.com to upgrade your plan.',
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      };
    }
  }
}
