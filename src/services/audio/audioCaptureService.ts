// Real-time audio capture and speech recognition service for live Zoom/Teams/Meet interviews

export type AudioSourceType = 'mic' | 'system' | 'both';

export interface AudioCaptureCallbacks {
  onTranscript?: (finalText: string, interimText: string) => void;
  onAudioLevel?: (level: number) => void;
  onError?: (error: string) => void;
  onStatusChange?: (isListening: boolean) => void;
  onSilenceDetected?: (fullText: string, silenceDurationMs: number) => void;
}

export class AudioCaptureService {
  private static instance: AudioCaptureService | null = null;

  private recognition: any = null;
  private isListening = false;
  private shouldKeepListening = false;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private animFrameId: number | null = null;

  private fullTranscript = '';
  private interimTranscript = '';
  private lastSpeechTimestamp = 0;
  private lastTriggeredText = '';
  private silenceCheckInterval: any = null;

  private callbacks: AudioCaptureCallbacks = {};
  private language = 'en-US';

  public static getInstance(): AudioCaptureService {
    if (!AudioCaptureService.instance) {
      AudioCaptureService.instance = new AudioCaptureService();
    }
    return AudioCaptureService.instance;
  }

  public setCallbacks(callbacks: AudioCaptureCallbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  public setLanguage(lang: string) {
    this.language = lang;
    if (this.recognition) {
      this.recognition.lang = lang;
    }
  }

  public getIsListening(): boolean {
    return this.isListening;
  }

  public getFullTranscript(): string {
    return this.fullTranscript;
  }

  public clearTranscript() {
    this.fullTranscript = '';
    this.interimTranscript = '';
    this.lastTriggeredText = '';
    this.lastSpeechTimestamp = 0;
    if (this.callbacks.onTranscript) {
      this.callbacks.onTranscript('', '');
    }
  }

  public async startListening(source: AudioSourceType = 'mic'): Promise<boolean> {
    if (this.isListening) {
      return true;
    }

    this.shouldKeepListening = true;

    try {
      // 1. Initialize Audio Media Stream & Analyzer for waveform
      await this.initAudioStream(source);

      // 2. Initialize Speech Recognition
      this.initSpeechRecognition();

      if (this.recognition) {
        try {
          this.recognition.start();
        } catch {
          // May already be running
        }
      }

      this.isListening = true;
      this.callbacks.onStatusChange?.(true);

      // Start silence & automated question detection loop
      this.startSilenceChecker();

      return true;
    } catch (err) {
      console.error('Failed to start audio listening:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to access audio device';
      this.callbacks.onError?.(errorMsg);
      this.stopListening();
      return false;
    }
  }

  public stopListening() {
    this.shouldKeepListening = false;
    this.isListening = false;

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // Ignore stop errors
      }
    }

    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.silenceCheckInterval) {
      clearInterval(this.silenceCheckInterval);
      this.silenceCheckInterval = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch {
        // Ignore
      }
      this.audioContext = null;
    }

    this.callbacks.onStatusChange?.(false);
    this.callbacks.onAudioLevel?.(0);
  }

  public toggleListening(source: AudioSourceType = 'mic'): Promise<boolean> {
    if (this.isListening) {
      this.stopListening();
      return Promise.resolve(false);
    } else {
      return this.startListening(source);
    }
  }

  private async initAudioStream(source: AudioSourceType): Promise<void> {
    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      };

      this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.audioContext = new AudioCtx();
        const sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 128;
        this.analyser.smoothingTimeConstant = 0.8;
        sourceNode.connect(this.analyser);

        this.startAudioLevelLoop();
      }
    } catch (err) {
      console.warn('Audio visualization stream init warning:', err);
      // Non-fatal, speech recognition can still attempt to run
    }
  }

  private startAudioLevelLoop() {
    if (!this.analyser) return;

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);

    const checkLevel = () => {
      if (!this.isListening || !this.analyser) {
        this.callbacks.onAudioLevel?.(0);
        return;
      }

      this.analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const avg = sum / dataArray.length;
      const normalized = Math.min(1, avg / 128); // 0 to 1

      this.callbacks.onAudioLevel?.(normalized);

      if (normalized > 0.04) {
        this.lastSpeechTimestamp = Date.now();
      }

      this.animFrameId = requestAnimationFrame(checkLevel);
    };

    this.animFrameId = requestAnimationFrame(checkLevel);
  }

  private initSpeechRecognition() {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('SpeechRecognition API is not natively supported in this environment.');
      return;
    }

    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch {
        // Ignore
      }
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = this.language;

    this.recognition.onresult = (event: any) => {
      this.lastSpeechTimestamp = Date.now();
      let interim = '';
      let newFinal = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcriptPart = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          newFinal += `${transcriptPart} `;
        } else {
          interim += transcriptPart;
        }
      }

      if (newFinal) {
        this.fullTranscript += newFinal;
      }
      this.interimTranscript = interim;

      this.callbacks.onTranscript?.(this.fullTranscript.trim(), this.interimTranscript.trim());
    };

    this.recognition.onerror = (event: any) => {
      console.warn('Speech recognition event:', event.error);
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        this.callbacks.onError?.('Microphone permission required for speech transcription.');
        this.stopListening();
      }
    };

    this.recognition.onend = () => {
      if (this.shouldKeepListening) {
        setTimeout(() => {
          if (this.shouldKeepListening) {
            try {
              this.recognition?.start();
            } catch {
              // Ignore restart error
            }
          }
        }, 200);
      } else {
        this.isListening = false;
        this.callbacks.onStatusChange?.(false);
      }
    };
  }

  private startSilenceChecker() {
    this.lastSpeechTimestamp = Date.now();
    if (this.silenceCheckInterval) {
      clearInterval(this.silenceCheckInterval);
    }

    // Check every 600ms for natural pauses in speech to trigger automatic answers
    this.silenceCheckInterval = setInterval(() => {
      if (!this.isListening) return;

      const fullText = (this.fullTranscript + (this.interimTranscript ? ` ${this.interimTranscript}` : '')).trim();
      if (!fullText || fullText.length < 12) return;

      const now = Date.now();
      const silenceDuration = now - this.lastSpeechTimestamp;

      // When the interviewer pauses for 1800ms (1.8s) after speaking a question
      if (silenceDuration >= 1800 && fullText !== this.lastTriggeredText) {
        this.lastTriggeredText = fullText;
        this.callbacks.onSilenceDetected?.(fullText, silenceDuration);
      }
    }, 600);
  }
}

export const audioCaptureService = AudioCaptureService.getInstance();
