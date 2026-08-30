import type { SolveResponse, DebugResponse } from '@shared/api';
import { DEFAULT_GEMINI_API_KEY, DEFAULT_GEMINI_MODEL } from '@shared/constants';

export interface GeminiInterviewResponse extends SolveResponse {
  problem_statement: string;
  thoughts: string[];
  code: string;
  time_complexity: string;
  space_complexity: string;
  conversationId: string;
  edge_cases?: string[];
  follow_ups?: { question: string; answer: string }[];
}

export interface GeminiDebugInterviewResponse extends DebugResponse {
  thoughts: string[];
  code: string;
  time_complexity: string;
  space_complexity: string;
  conversationId: string;
  what_changed?: string[];
  edge_cases?: string[];
}

export interface GeminiRequestOptions {
  apiKey?: string;
  model?: string;
  transcript?: string;
  images?: string[]; // base64 data URIs or base64 strings
  programmingLanguage?: string;
  userLanguage?: string;
  readableVarNames?: boolean;
  signal?: AbortSignal;
}

const DEFAULT_MODEL = DEFAULT_GEMINI_MODEL;

const LIVE_INTERVIEW_SYSTEM_INSTRUCTION = `You are an elite, world-class technical interview assistant and competitive programming coach.
Your job is to assist a candidate during a live coding and technical interview in real-time. Respond FAST and CONCISELY.

Always return a valid JSON object matching this exact structure:
{
  "problem_statement": "Concise 1-sentence summary of the problem.",
  "thoughts": [
    "High-level intuition in 1 sentence.",
    "Key algorithmic approach / data structure.",
    "Step-by-step reasoning candidate should speak out loud to interviewer."
  ],
  "code": "Clean, optimal, production-grade code with brief comments.",
  "time_complexity": "O(...) - brief reason",
  "space_complexity": "O(...) - brief reason",
  "edge_cases": [
    "Edge case 1 (e.g. empty input, bounds)",
    "Edge case 2 (e.g. duplicates, negative values)"
  ],
  "follow_ups": [
    {
      "question": "Expected follow-up question",
      "answer": "Concise 1-2 sentence optimal answer"
    }
  ]
}

Return ONLY the JSON object without markdown code blocks.`;

const LIVE_DEBUG_SYSTEM_INSTRUCTION = `You are an elite technical interview coach helping a candidate debug their live code.

Always return a valid JSON object matching this exact structure:
{
  "thoughts": [
    "Identify the bug or bottleneck.",
    "Explain the fix clearly so candidate can speak it."
  ],
  "code": "Fully corrected and optimal code solution.",
  "time_complexity": "O(...)",
  "space_complexity": "O(...)",
  "what_changed": [
    "Specific line/logic modification"
  ],
  "edge_cases": [
    "Edge cases addressed by fix"
  ]
}

Return ONLY the JSON object without markdown code blocks.`;

export class GeminiService {
  private static instance: GeminiService | null = null;

  public static getInstance(): GeminiService {
    if (!GeminiService.instance) {
      GeminiService.instance = new GeminiService();
    }
    return GeminiService.instance;
  }

  private cleanBase64(dataUriOrBase64: string): { mimeType: string; data: string } {
    if (dataUriOrBase64.startsWith('data:')) {
      const parts = dataUriOrBase64.split(';base64,');
      const mimeType = parts[0].replace('data:', '');
      const data = parts[1] || '';
      return { mimeType, data };
    }
    return { mimeType: 'image/png', data: dataUriOrBase64 };
  }

  private async downscaleBase64Image(dataUri: string, maxWidth = 1200): Promise<{ mimeType: string; data: string }> {
    const { mimeType, data } = this.cleanBase64(dataUri);
    if (typeof window === 'undefined' || typeof Image === 'undefined') {
      return { mimeType, data };
    }
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        if (img.width <= maxWidth) {
          resolve({ mimeType, data });
          return;
        }
        try {
          const canvas = document.createElement('canvas');
          const scale = maxWidth / img.width;
          canvas.width = maxWidth;
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve({ mimeType, data });
            return;
          }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const resizedUri = canvas.toDataURL('image/jpeg', 0.82);
          const parts = resizedUri.split(';base64,');
          resolve({ mimeType: 'image/jpeg', data: parts[1] || '' });
        } catch {
          resolve({ mimeType, data });
        }
      };
      img.onerror = () => resolve({ mimeType, data });
      img.src = dataUri.startsWith('data:') ? dataUri : `data:${mimeType};base64,${data}`;
    });
  }

  public async generateInterviewSolution(
    options: GeminiRequestOptions,
  ): Promise<GeminiInterviewResponse> {
    const {
      apiKey = DEFAULT_GEMINI_API_KEY,
      model = DEFAULT_MODEL,
      transcript = '',
      images = [],
      programmingLanguage = 'python',
      userLanguage = 'en-US',
      readableVarNames = true,
      signal,
    } = options;

    if (!apiKey) {
      throw new Error(
        'Gemini API key is required. Please set GEMINI_API_KEY in your .env file or Settings.',
      );
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model,
    )}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const promptText = `
Target Programming Language: ${programmingLanguage}
Candidate Language / Locale: ${userLanguage}
Use Readable Variable Names: ${readableVarNames}

${transcript ? `Live Audio Transcript from Interview:\n"""\n${transcript}\n"""` : ''}

${images.length > 0 ? `Captured screen images provided: ${images.length} image(s). Please analyze the problem statement, code editor, and test cases shown in the screenshots.` : ''}

Please analyze the interview question/audio and screenshots, and generate the structured JSON interview solution.`;

    const parts: Array<{ text?: string; inline_data?: { mime_type: string; data: string } }> = [
      { text: promptText },
    ];

    for (const img of images) {
      const { mimeType, data } = await this.downscaleBase64Image(img);
      if (data) {
        parts.push({
          inline_data: {
            mime_type: mimeType,
            data,
          },
        });
      }
    }

    const requestBody = {
      system_instruction: {
        parts: [{ text: LIVE_INTERVIEW_SYSTEM_INSTRUCTION }],
      },
      contents: [
        {
          role: 'user',
          parts,
        },
      ],
      generationConfig: {
        temperature: 0.1,
        topP: 0.9,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json',
      },
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Gemini API Error (${response.status}): ${response.statusText}`;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error?.message?.includes('leaked')) {
          errorMessage =
            'Gemini API Key was blocked because it was leaked. Please generate a fresh free key at https://aistudio.google.com/app/apikey and update your .env file.';
        } else if (errorJson.error?.message) {
          errorMessage = `Gemini API Error: ${errorJson.error.message}`;
        }
      } catch {
        errorMessage = `Gemini API Error: ${errorText}`;
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    const candidateText =
      result.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!candidateText) {
      throw new Error('Gemini returned an empty response. Please try again.');
    }

    const parsed = this.parseJsonResponse<any>(candidateText, {
      problem_statement: 'Live Technical Interview Problem',
      thoughts: ['Analyzed problem requirements', 'Formulated optimal solution approach'],
      code: `// Solution generated for ${programmingLanguage}\n`,
      time_complexity: 'O(N)',
      space_complexity: 'O(1)',
      edge_cases: ['Empty input', 'Boundary values'],
      follow_ups: [],
    });

    return {
      ...parsed,
      conversationId: parsed.conversationId || `gemini-live-${Date.now()}`,
    };
  }

  public async generateDebugSolution(
    options: GeminiRequestOptions,
  ): Promise<GeminiDebugInterviewResponse> {
    const {
      apiKey = DEFAULT_GEMINI_API_KEY,
      model = DEFAULT_MODEL,
      transcript = '',
      images = [],
      programmingLanguage = 'python',
      userLanguage = 'en-US',
      readableVarNames = true,
      signal,
    } = options;

    if (!apiKey) {
      throw new Error(
        'Gemini API key is required. Please set GEMINI_API_KEY in your .env file or Settings.',
      );
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model,
    )}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const promptText = `
Target Programming Language: ${programmingLanguage}
Candidate Language / Locale: ${userLanguage}
Use Readable Variable Names: ${readableVarNames}

${transcript ? `Live Audio / Feedback Transcript:\n"""\n${transcript}\n"""` : ''}

${images.length > 0 ? `Captured screen images provided: ${images.length} image(s). Please inspect the current code and test failure/edge case.` : ''}

Please fix any bug, explain what was changed, and return structured JSON.`;

    const parts: Array<{ text?: string; inline_data?: { mime_type: string; data: string } }> = [
      { text: promptText },
    ];

    for (const img of images) {
      const { mimeType, data } = await this.downscaleBase64Image(img);
      if (data) {
        parts.push({
          inline_data: {
            mime_type: mimeType,
            data,
          },
        });
      }
    }

    const requestBody = {
      system_instruction: {
        parts: [{ text: LIVE_DEBUG_SYSTEM_INSTRUCTION }],
      },
      contents: [
        {
          role: 'user',
          parts,
        },
      ],
      generationConfig: {
        temperature: 0.1,
        topP: 0.9,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json',
      },
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Gemini API Error (${response.status}): ${response.statusText}`;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error?.message?.includes('leaked')) {
          errorMessage =
            'Gemini API Key was blocked because it was leaked. Please generate a fresh free key at https://aistudio.google.com/app/apikey and update your .env file.';
        } else if (errorJson.error?.message) {
          errorMessage = `Gemini API Error: ${errorJson.error.message}`;
        }
      } catch {
        errorMessage = `Gemini API Error: ${errorText}`;
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    const candidateText =
      result.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!candidateText) {
      throw new Error('Gemini returned an empty response. Please try again.');
    }

    const parsed = this.parseJsonResponse<any>(candidateText, {
      thoughts: ['Fixed bug in logic', 'Optimized solution'],
      code: `// Debugged code for ${programmingLanguage}\n`,
      time_complexity: 'O(N)',
      space_complexity: 'O(1)',
      what_changed: ['Corrected index calculation'],
      edge_cases: [],
    });

    return {
      ...parsed,
      conversationId: parsed.conversationId || `gemini-debug-${Date.now()}`,
    };
  }

  private parseJsonResponse<T>(text: string, fallback: T): T {
    let cleanText = text.trim();
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    try {
      return JSON.parse(cleanText) as T;
    } catch {
      return fallback;
    }
  }
}

export const geminiService = GeminiService.getInstance();
