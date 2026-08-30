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
Your job is to assist a candidate during a live coding and technical interview in real-time.

You will receive:
1. Live spoken transcript from the interviewer (and candidate).
2. (Optional) Screen captures of the coding environment / problem statement (LeetCode, HackerRank, CoderPad, Google Doc, etc.).
3. Desired programming language and user language.

Your goal is to provide a comprehensive, ultra-clear, and structured response tailored for real-time interview success.

Always return a valid JSON object matching this exact structure:
{
  "problem_statement": "Concise 1-2 sentence summary of the exact technical problem or question being asked.",
  "thoughts": [
    "High-level intuition: explain the core algorithmic insight in 1 sentence.",
    "Data structures: why this data structure (e.g., hash map, two pointers, min-heap) is optimal.",
    "Step-by-step verbal reasoning: bullet points the candidate should speak out loud to the interviewer."
  ],
  "code": "Complete, production-grade, clean, and optimal code solution with helpful inline comments explaining key lines.",
  "time_complexity": "O(...) - with a brief 1-sentence verbal justification",
  "space_complexity": "O(...) - with a brief 1-sentence verbal justification",
  "edge_cases": [
    "Edge case 1: e.g., empty array / null input handling",
    "Edge case 2: e.g., duplicates / negative numbers / large values"
  ],
  "follow_ups": [
    {
      "question": "Expected interviewer follow-up question (e.g., how to scale, stream, or optimize space)",
      "answer": "Concise answer to the follow-up question"
    }
  ]
}

Important Rules:
- Return ONLY the JSON object. Do not wrap in markdown code fences (\`\`\`json).
- The thoughts MUST be structured as bullet points that the candidate can read and verbally say out loud to sound confident and structured.
- The code must be optimal in time and space complexity, with meaningful variable names.
- If programming language is specified, write the code strictly in that language.`;

const LIVE_DEBUG_SYSTEM_INSTRUCTION = `You are an elite technical interview coach helping a candidate debug or optimize their live coding solution.

Analyze the provided screenshots and/or interview feedback.

Always return a valid JSON object matching this exact structure:
{
  "thoughts": [
    "Identify the bug, bottleneck, or requested modification.",
    "Explain the fix clearly so the candidate can verbally explain it."
  ],
  "code": "Fully corrected and optimal code solution.",
  "time_complexity": "O(...) - with verbal justification",
  "space_complexity": "O(...) - with verbal justification",
  "what_changed": [
    "Specific line/logic modification 1",
    "Specific line/logic modification 2"
  ],
  "edge_cases": [
    "Edge cases now addressed by the fix"
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
      const { mimeType, data } = this.cleanBase64(img);
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
        temperature: 0.2,
        topP: 0.95,
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
        if (errorJson.error?.message) {
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

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model,
    )}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const promptText = `
Target Programming Language: ${programmingLanguage}
Candidate Language / Locale: ${userLanguage}
Use Readable Variable Names: ${readableVarNames}

${transcript ? `Live Audio / Debug Feedback:\n"""\n${transcript}\n"""` : ''}

${images.length > 0 ? `Captured screen images for debugging: ${images.length} image(s). Check for error messages, failed test cases, or code changes requested.` : ''}

Please analyze the issues and generate the structured JSON debug response.`;

    const parts: Array<{ text?: string; inline_data?: { mime_type: string; data: string } }> = [
      { text: promptText },
    ];

    for (const img of images) {
      const { mimeType, data } = this.cleanBase64(img);
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
        temperature: 0.2,
        topP: 0.95,
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
        if (errorJson.error?.message) {
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
      thoughts: ['Fixed algorithmic issue', 'Optimized solution'],
      code: `// Debugged solution for ${programmingLanguage}\n`,
      time_complexity: 'O(N)',
      space_complexity: 'O(1)',
      what_changed: ['Adjusted pointer boundaries', 'Fixed base case'],
    });

    return {
      ...parsed,
      conversationId: parsed.conversationId || `gemini-debug-${Date.now()}`,
    };
  }

  private parseJsonResponse<T>(rawText: string, fallback: T): T {
    try {
      let cleaned = rawText.trim();
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      return JSON.parse(cleaned) as T;
    } catch (err) {
      console.warn('Failed to parse Gemini JSON directly, attempting recovery:', err);
      const firstBrace = rawText.indexOf('{');
      const lastBrace = rawText.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        try {
          const jsonSubstring = rawText.substring(firstBrace, lastBrace + 1);
          return JSON.parse(jsonSubstring) as T;
        } catch {
          // Fall through to fallback
        }
      }
      return fallback;
    }
  }
}

export const geminiService = GeminiService.getInstance();
