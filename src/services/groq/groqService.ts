import type { SolveResponse, DebugResponse } from '@shared/api';
import { DEFAULT_GROQ_API_KEY, DEFAULT_GROQ_MODEL } from '@shared/constants';

export interface GroqInterviewResponse extends SolveResponse {
  problem_statement: string;
  thoughts: string[];
  code: string;
  time_complexity: string;
  space_complexity: string;
  conversationId: string;
  edge_cases?: string[];
  follow_ups?: { question: string; answer: string }[];
}

export interface GroqRequestOptions {
  apiKey?: string;
  model?: string;
  transcript: string;
  programmingLanguage?: string;
  userLanguage?: string;
  readableVarNames?: boolean;
  signal?: AbortSignal;
}

const GROQ_INTERVIEW_SYSTEM_PROMPT = `You are an elite, world-class technical interview assistant and competitive programming coach running on ultra-fast Groq LPU hardware.
Your job is to assist a candidate during a live coding/technical interview in real-time. Respond INSTANTLY and CONCISELY.

Always return a valid JSON object matching this exact structure:
{
  "problem_statement": "Concise 1-sentence summary of the interview question.",
  "thoughts": [
    "High-level intuition in 1 sentence.",
    "Key algorithmic approach / data structure.",
    "Step-by-step reasoning candidate should speak out loud to interviewer."
  ],
  "code": "// Clean, optimal, production-grade code with brief comments",
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

Return ONLY valid JSON. No markdown backticks.`;

export class GroqService {
  private static instance: GroqService | null = null;

  public static getInstance(): GroqService {
    if (!GroqService.instance) {
      GroqService.instance = new GroqService();
    }
    return GroqService.instance;
  }

  public async generateInterviewSolution(
    options: GroqRequestOptions,
  ): Promise<GroqInterviewResponse> {
    const {
      apiKey = DEFAULT_GROQ_API_KEY,
      model = DEFAULT_GROQ_MODEL,
      transcript = '',
      programmingLanguage = 'python',
      userLanguage = 'en-US',
      readableVarNames = true,
      signal,
    } = options;

    if (!apiKey) {
      throw new Error(
        'Groq API key is missing. Set GROQ_API_KEY or VITE_GROQ_API_KEY in your .env file.',
      );
    }

    const endpoint = 'https://api.groq.com/openai/v1/chat/completions';

    const userPrompt = `
Target Programming Language: ${programmingLanguage}
Candidate Language / Locale: ${userLanguage}
Use Readable Variable Names: ${readableVarNames}

Live Spoken Interview Question:
"""
${transcript}
"""

Please formulate an instant, optimal, structured technical interview response.`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: GROQ_INTERVIEW_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.1,
        max_tokens: 2048,
        response_format: { type: 'json_object' },
      }),
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Groq API Error (${response.status}): ${response.statusText}`;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error?.message) {
          errorMessage = `Groq API Error: ${errorJson.error.message}`;
        }
      } catch {
        errorMessage = `Groq API Error: ${errorText}`;
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || '';

    if (!content) {
      throw new Error('Groq returned an empty response.');
    }

    const parsed = this.parseJsonResponse<any>(content, {
      problem_statement: transcript || 'Live Interview Question',
      thoughts: ['Identified optimal algorithmic approach', 'Step-by-step reasoning points'],
      code: `// Groq solution for ${programmingLanguage}\n`,
      time_complexity: 'O(N)',
      space_complexity: 'O(1)',
      edge_cases: ['Null/Empty input', 'Boundary values'],
      follow_ups: [],
    });

    return {
      ...parsed,
      conversationId: parsed.conversationId || `groq-live-${Date.now()}`,
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

export const groqService = GroqService.getInstance();
