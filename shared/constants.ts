const getEnvVar = (name: string): string => {
  if (typeof process !== 'undefined' && process.env && process.env[name]) {
    return process.env[name] as string;
  }
  return '';
};

export const DEFAULT_GEMINI_API_KEY =
  getEnvVar('GEMINI_API_KEY') || getEnvVar('VITE_GEMINI_API_KEY') || '';
export const DEFAULT_GEMINI_MODEL =
  getEnvVar('GEMINI_MODEL') || getEnvVar('VITE_GEMINI_MODEL') || 'gemini-2.5-flash';

export const DEFAULT_GROQ_API_KEY =
  getEnvVar('GROQ_API_KEY') || getEnvVar('VITE_GROQ_API_KEY') || '';
export const DEFAULT_GROQ_MODEL =
  getEnvVar('GROQ_MODEL') || getEnvVar('VITE_GROQ_MODEL') || 'llama-3.3-70b-versatile';

/**
 * Check if running in self-hosted mode
 * In React: Uses import.meta.env.VITE_SELF_HOSTED_MODE
 * In Electron: Uses process.env.VITE_SELF_HOSTED_MODE
 */
export const isSelfHosted = (): boolean => {
  return true; // Auto-enable full access for direct AI live interview mode
};

/**
 * API base URL for both React and Electron apps
 */
export const getApiBaseUrl = (): string => {
  if (typeof process !== 'undefined' && process.env && process.env.VITE_API_BASE_URL) {
    return process.env.VITE_API_BASE_URL;
  }
  return 'http://localhost:3000';
};

export const API_BASE_URL = getApiBaseUrl();

export const IPC_EVENTS = {
  TOOLTIP: {
    MOUSE_ENTER: 'tooltip:mouse-enter',
    MOUSE_LEAVE: 'tooltip:mouse-leave',
    CLOSE_CLICK: 'tooltip:close-click',
  },
  QUEUE: {
    LOADED_NO_SCREENSHOTS: 'queue:loaded-no-screenshots',
    LOADED_WITH_SCREENSHOTS: 'queue:loaded-with-screenshots',
  },
  APP_MODE: {
    CHANGE: 'app-mode:change',
  },
} as const;

export type IpcEvents = typeof IPC_EVENTS;
export type IpcEventKeys = keyof IpcEvents;

export type AllIpcEvents = {
  [K in keyof IpcEvents]: IpcEvents[K] extends { [key: string]: string }
    ? IpcEvents[K][keyof IpcEvents[K]]
    : IpcEvents[K];
}[keyof IpcEvents];
