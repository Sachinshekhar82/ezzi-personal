import { AppMode, ProgrammingLanguage, UserLanguage } from '@shared/api.ts';
import { LOCAL_STORAGE_KEYS } from '@shared/storage';
import { DEFAULT_GEMINI_API_KEY, DEFAULT_GEMINI_MODEL } from '@shared/constants';
import type { IStorageProvider, UserSettings } from './StorageProvider';

const getEnvKey = (): string => {
  if (typeof process !== 'undefined' && process.env) {
    return process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || DEFAULT_GEMINI_API_KEY;
  }
  return DEFAULT_GEMINI_API_KEY;
};

const getEnvModel = (): string => {
  if (typeof process !== 'undefined' && process.env) {
    return process.env.VITE_GEMINI_MODEL || process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
  }
  return DEFAULT_GEMINI_MODEL;
};

export class LocalStorageProvider implements IStorageProvider {
  private readonly STORAGE_KEY = LOCAL_STORAGE_KEYS.EZZI_SETTINGS;

  getSettings(): Promise<UserSettings> {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    const envApiKey = getEnvKey();
    const envModel = getEnvModel();

    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Partial<UserSettings>;

        return Promise.resolve({
          solutionLanguage: parsed.solutionLanguage || ProgrammingLanguage.Python,
          userLanguage: parsed.userLanguage || UserLanguage.EN_US,
          appMode: parsed.appMode || AppMode.LIVE_INTERVIEW,
          geminiApiKey: parsed.geminiApiKey || envApiKey,
          geminiModel: parsed.geminiModel || envModel,
          audioSource: parsed.audioSource || 'mic',
          autoAnswerOnSilence: parsed.autoAnswerOnSilence ?? true, // Auto answer enabled by default
        });
      } catch (error) {
        console.warn('Failed to parse stored settings:', error);
      }
    }

    return Promise.resolve({
      solutionLanguage: ProgrammingLanguage.Python,
      userLanguage: UserLanguage.EN_US,
      appMode: AppMode.LIVE_INTERVIEW,
      geminiApiKey: envApiKey,
      geminiModel: envModel,
      audioSource: 'mic',
      autoAnswerOnSilence: true, // Auto answer enabled by default
    });
  }

  async updateSettings(settings: Partial<UserSettings>): Promise<void> {
    const currentSettings = await this.getSettings();
    const newSettings = { ...currentSettings, ...settings };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(newSettings));
  }

  async getSolutionLanguage(): Promise<ProgrammingLanguage> {
    const settings = await this.getSettings();
    return settings.solutionLanguage;
  }

  async setSolutionLanguage(language: ProgrammingLanguage): Promise<void> {
    await this.updateSettings({ solutionLanguage: language });
  }

  async getUserLanguage(): Promise<UserLanguage> {
    const settings = await this.getSettings();
    return settings.userLanguage;
  }

  async setUserLanguage(language: UserLanguage): Promise<void> {
    await this.updateSettings({ userLanguage: language });
  }

  async getAppMode(): Promise<AppMode> {
    const settings = await this.getSettings();
    return settings.appMode;
  }

  async setAppMode(appMode: AppMode): Promise<void> {
    await this.updateSettings({ appMode });
  }

  async getGeminiApiKey(): Promise<string> {
    const settings = await this.getSettings();
    return settings.geminiApiKey || DEFAULT_GEMINI_API_KEY;
  }

  async setGeminiApiKey(key: string): Promise<void> {
    await this.updateSettings({ geminiApiKey: key });
  }

  async getGeminiModel(): Promise<string> {
    const settings = await this.getSettings();
    return settings.geminiModel || DEFAULT_GEMINI_MODEL;
  }

  async setGeminiModel(model: string): Promise<void> {
    await this.updateSettings({ geminiModel: model });
  }
}
