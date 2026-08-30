import { ProgrammingLanguage, UserLanguage } from '@shared/api.ts';
import type React from 'react';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { getStorageProvider } from '../services/storage';

interface SettingsContextType {
  solutionLanguage: ProgrammingLanguage;
  userLanguage: UserLanguage;
  geminiApiKey: string;
  geminiModel: string;
  audioSource: 'mic' | 'system' | 'both';
  autoAnswerOnSilence: boolean;
  loading: boolean;
  error: string | null;
  updateSolutionLanguage: (language: ProgrammingLanguage) => Promise<void>;
  updateUserLanguage: (language: UserLanguage) => Promise<void>;
  updateGeminiApiKey: (key: string) => Promise<void>;
  updateGeminiModel: (model: string) => Promise<void>;
  updateAudioSource: (source: 'mic' | 'system' | 'both') => Promise<void>;
  updateAutoAnswerOnSilence: (enabled: boolean) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const [solutionLanguage, setSolutionLanguage] = useState<ProgrammingLanguage>(
    ProgrammingLanguage.Python,
  );
  const [userLanguage, setUserLanguage] = useState<UserLanguage>(UserLanguage.EN_US);
  const [geminiApiKey, setGeminiApiKey] = useState<string>('');
  const [geminiModel, setGeminiModel] = useState<string>('gemini-2.0-flash');
  const [audioSource, setAudioSource] = useState<'mic' | 'system' | 'both'>('mic');
  const [autoAnswerOnSilence, setAutoAnswerOnSilence] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const storageProvider = getStorageProvider();

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const settings = await storageProvider.getSettings();
      setSolutionLanguage(settings.solutionLanguage);
      setUserLanguage(settings.userLanguage);
      if (settings.geminiApiKey !== undefined) setGeminiApiKey(settings.geminiApiKey);
      if (settings.geminiModel !== undefined) setGeminiModel(settings.geminiModel);
      if (settings.audioSource !== undefined) setAudioSource(settings.audioSource);
      if (settings.autoAnswerOnSilence !== undefined) setAutoAnswerOnSilence(settings.autoAnswerOnSilence);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
      console.error('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  }, [storageProvider]);

  const updateSolutionLanguage = useCallback(
    async (language: ProgrammingLanguage) => {
      try {
        setError(null);
        await storageProvider.setSolutionLanguage(language);
        setSolutionLanguage(language);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update solution language');
        console.error('Error updating solution language:', err);
        throw err;
      }
    },
    [storageProvider],
  );

  const updateUserLanguage = useCallback(
    async (language: UserLanguage) => {
      try {
        setError(null);
        await storageProvider.setUserLanguage(language);
        setUserLanguage(language);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update user language');
        console.error('Error updating user language:', err);
        throw err;
      }
    },
    [storageProvider],
  );

  const updateGeminiApiKey = useCallback(
    async (key: string) => {
      try {
        setError(null);
        await storageProvider.setGeminiApiKey(key);
        setGeminiApiKey(key);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update Gemini API key');
        console.error('Error updating Gemini API key:', err);
        throw err;
      }
    },
    [storageProvider],
  );

  const updateGeminiModel = useCallback(
    async (model: string) => {
      try {
        setError(null);
        await storageProvider.setGeminiModel(model);
        setGeminiModel(model);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update Gemini model');
        console.error('Error updating Gemini model:', err);
        throw err;
      }
    },
    [storageProvider],
  );

  const updateAudioSource = useCallback(
    async (source: 'mic' | 'system' | 'both') => {
      try {
        setError(null);
        await storageProvider.updateSettings({ audioSource: source });
        setAudioSource(source);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update audio source');
        console.error('Error updating audio source:', err);
        throw err;
      }
    },
    [storageProvider],
  );

  const updateAutoAnswerOnSilence = useCallback(
    async (enabled: boolean) => {
      try {
        setError(null);
        await storageProvider.updateSettings({ autoAnswerOnSilence: enabled });
        setAutoAnswerOnSilence(enabled);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update auto-answer setting');
        console.error('Error updating auto-answer setting:', err);
        throw err;
      }
    },
    [storageProvider],
  );

  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  const value: SettingsContextType = {
    solutionLanguage,
    userLanguage,
    geminiApiKey,
    geminiModel,
    audioSource,
    autoAnswerOnSilence,
    loading,
    error,
    updateSolutionLanguage,
    updateUserLanguage,
    updateGeminiApiKey,
    updateGeminiModel,
    updateAudioSource,
    updateAutoAnswerOnSilence,
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }

  return context;
};
