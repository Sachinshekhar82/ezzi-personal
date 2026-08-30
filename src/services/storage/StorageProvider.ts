import type { AppMode, ProgrammingLanguage, UserLanguage } from '@shared/api.ts';

export interface UserSettings {
  solutionLanguage: ProgrammingLanguage;
  userLanguage: UserLanguage;
  appMode: AppMode;
  geminiApiKey?: string;
  geminiModel?: string;
  audioSource?: 'mic' | 'system' | 'both';
  autoAnswerOnSilence?: boolean;
}

export interface IStorageProvider {
  getSettings(): Promise<UserSettings>;
  updateSettings(settings: Partial<UserSettings>): Promise<void>;
  getSolutionLanguage(): Promise<ProgrammingLanguage>;
  setSolutionLanguage(language: ProgrammingLanguage): Promise<void>;
  getUserLanguage(): Promise<UserLanguage>;
  setUserLanguage(language: UserLanguage): Promise<void>;
  getAppMode(): Promise<AppMode>;
  setAppMode(appMode: AppMode): Promise<void>;
  getGeminiApiKey(): Promise<string>;
  setGeminiApiKey(key: string): Promise<void>;
  getGeminiModel(): Promise<string>;
  setGeminiModel(model: string): Promise<void>;
}
