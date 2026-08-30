import type React from 'react';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { audioCaptureService } from '../services/audio/audioCaptureService';
import { geminiService } from '../services/gemini/geminiService';
import { useSettings } from './SettingsContext';
import { useSolutionContext } from './SolutionContext';
import { useScreenshotContext } from './ScreenshotContext';
import { useToast } from './toast';

interface LiveAudioContextType {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  audioLevel: number;
  isAnswering: boolean;
  error: string | null;
  startListening: () => Promise<boolean>;
  stopListening: () => void;
  toggleListening: () => Promise<boolean>;
  clearTranscript: () => void;
  askGeminiFromAudio: (customPrompt?: string) => Promise<void>;
}

const LiveAudioContext = createContext<LiveAudioContextType | undefined>(undefined);

interface LiveAudioProviderProps {
  children: ReactNode;
  onAnswerStarted?: () => void;
  onAnswerSuccess?: () => void;
}

export const LiveAudioProvider: React.FC<LiveAudioProviderProps> = ({
  children,
  onAnswerStarted,
  onAnswerSuccess,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [isAnswering, setIsAnswering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAnsweringRef = useRef(false);
  isAnsweringRef.current = isAnswering;

  const {
    solutionLanguage,
    userLanguage,
    geminiApiKey,
    geminiModel,
    audioSource,
    autoAnswerOnSilence = true,
  } = useSettings();

  const { setSolution } = useSolutionContext();
  const { state: screenshotState } = useScreenshotContext();
  const screenshots = screenshotState.screenshots;
  const { showToast } = useToast();

  const askGeminiFromAudio = useCallback(
    async (customPrompt?: string) => {
      const activeText = (customPrompt || `${transcript} ${interimTranscript}`).trim();
      const hasScreenshots = screenshots.length > 0;

      if (!activeText && !hasScreenshots) {
        return;
      }

      try {
        setIsAnswering(true);
        isAnsweringRef.current = true;
        onAnswerStarted?.();

        const imagePreviews = screenshots.map((s) => s.preview);

        const response = await geminiService.generateInterviewSolution({
          apiKey: geminiApiKey,
          model: geminiModel || 'gemini-2.5-flash',
          transcript: activeText,
          images: imagePreviews,
          programmingLanguage: solutionLanguage,
          userLanguage,
        });

        setSolution(response);
        onAnswerSuccess?.();
        showToast('Gemini Answer Ready', 'Instant verbal talking points & code generated.', 'success');
      } catch (err) {
        console.error('Error generating Gemini interview answer:', err);
        const msg = err instanceof Error ? err.message : 'Failed to generate answer from Gemini';
        setError(msg);
        showToast('Gemini Error', msg, 'error');
      } finally {
        setIsAnswering(false);
        isAnsweringRef.current = false;
      }
    },
    [
      transcript,
      interimTranscript,
      screenshots,
      geminiApiKey,
      geminiModel,
      solutionLanguage,
      userLanguage,
      setSolution,
      onAnswerStarted,
      onAnswerSuccess,
      showToast,
    ],
  );

  useEffect(() => {
    audioCaptureService.setCallbacks({
      onTranscript: (finalText, interimText) => {
        setTranscript(finalText);
        setInterimTranscript(interimText);
      },
      onAudioLevel: (level) => {
        setAudioLevel(level);
      },
      onStatusChange: (listening) => {
        setIsListening(listening);
      },
      onError: (errMsg) => {
        setError(errMsg);
      },
      onSilenceDetected: (fullQuestionText) => {
        if (autoAnswerOnSilence !== false && !isAnsweringRef.current && fullQuestionText.length > 12) {
          console.log('Auto-answering live interview question:', fullQuestionText);
          void askGeminiFromAudio(fullQuestionText);
        }
      },
    });

    audioCaptureService.setLanguage(userLanguage || 'en-US');

    // Auto-start listening on mount for seamless live interview mode
    void audioCaptureService.startListening(audioSource);
  }, [userLanguage, autoAnswerOnSilence, audioSource, askGeminiFromAudio]);

  const startListening = useCallback(async () => {
    setError(null);
    const success = await audioCaptureService.startListening(audioSource);
    return success;
  }, [audioSource]);

  const stopListening = useCallback(() => {
    audioCaptureService.stopListening();
  }, []);

  const toggleListening = useCallback(async () => {
    setError(null);
    const listening = await audioCaptureService.toggleListening(audioSource);
    return listening;
  }, [audioSource]);

  const clearTranscript = useCallback(() => {
    audioCaptureService.clearTranscript();
    setTranscript('');
    setInterimTranscript('');
  }, []);

  return (
    <LiveAudioContext.Provider
      value={{
        isListening,
        transcript,
        interimTranscript,
        audioLevel,
        isAnswering,
        error,
        startListening,
        stopListening,
        toggleListening,
        clearTranscript,
        askGeminiFromAudio,
      }}
    >
      {children}
    </LiveAudioContext.Provider>
  );
};

export const useLiveAudio = (): LiveAudioContextType => {
  const context = useContext(LiveAudioContext);
  if (!context) {
    throw new Error('useLiveAudio must be used within a LiveAudioProvider');
  }
  return context;
};
