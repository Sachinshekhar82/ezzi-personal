import {
  AppMode,
  type ProgrammingLanguage,
  type UserLanguage,
  type UserSettingsUpdateRequest,
} from '@shared/api.ts';
import { settingsService } from '../settings';
import type { IStorageProvider, UserSettings } from './StorageProvider';

export class ApiStorageProvider implements IStorageProvider {
  private localGeminiApiKey = '';
  private localGeminiModel = 'gemini-2.0-flash';

  async getSettings(): Promise<UserSettings> {
    try {
      const settings = await settingsService.getSettings();

      return {
        solutionLanguage: settings.solutionLanguage,
        userLanguage: settings.userLanguage,
        appMode: AppMode.LIVE_INTERVIEW,
        geminiApiKey: this.localGeminiApiKey,
        geminiModel: this.localGeminiModel,
        audioSource: 'mic',
      };
    } catch {
      return {
        solutionLanguage: 'python' as ProgrammingLanguage,
        userLanguage: 'en-US' as UserLanguage,
        appMode: AppMode.LIVE_INTERVIEW,
        geminiApiKey: this.localGeminiApiKey,
        geminiModel: this.localGeminiModel,
        audioSource: 'mic',
      };
    }
  }

  async updateSettings(settings: Partial<UserSettings>): Promise<void> {
    if (settings.geminiApiKey !== undefined) this.localGeminiApiKey = settings.geminiApiKey;
    if (settings.geminiModel !== undefined) this.localGeminiModel = settings.geminiModel;

    const currentSettings = await this.getSettings();
    const updatedSettings: UserSettingsUpdateRequest = {
      solutionLanguage: settings.solutionLanguage ?? currentSettings.solutionLanguage,
      userLanguage: settings.userLanguage ?? currentSettings.userLanguage,
    };
    try {
      await settingsService.updateSettings(updatedSettings);
    } catch (e) {
      console.warn('ApiStorageProvider update warning:', e);
    }
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

  getAppMode(): Promise<AppMode> {
    return Promise.resolve(AppMode.LIVE_INTERVIEW);
  }

  setAppMode(appMode: AppMode): Promise<void> {
    console.log('App mode change not persisted in API storage provider:', appMode);
    return Promise.resolve();
  }

  getGeminiApiKey(): Promise<string> {
    return Promise.resolve(this.localGeminiApiKey);
  }

  setGeminiApiKey(key: string): Promise<void> {
    this.localGeminiApiKey = key;
    return Promise.resolve();
  }

  getGeminiModel(): Promise<string> {
    return Promise.resolve(this.localGeminiModel);
  }

  setGeminiModel(model: string): Promise<void> {
    this.localGeminiModel = model;
    return Promise.resolve();
  }
}
