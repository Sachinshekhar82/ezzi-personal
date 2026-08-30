import { type AuthenticatedUser } from '@shared/api.ts';
import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { LiveAudioProvider, useLiveAudio } from '../contexts/LiveAudioContext';
import { ScreenshotProvider } from '../contexts/ScreenshotContext';
import { SettingsProvider } from '../contexts/SettingsContext';
import { SolutionProvider, useSolutionContext } from '../contexts/SolutionContext';
import { SubscriptionProvider } from '../contexts/SubscriptionContext';
import { useToast } from '../contexts/toast';
import { AppModeLayoutProvider } from '../layouts';
import { QueuePage, SolutionsPage } from '.';

interface SubscribedAppProps {
  user: AuthenticatedUser;
}

const SubscribedAppContent: React.FC = () => {
  const { clearAll } = useSolutionContext();
  const { toggleListening, askGeminiFromAudio } = useLiveAudio();
  const [view, setView] = useState<'queue' | 'solutions' | 'debug'>('queue');
  const containerRef = useRef<HTMLDivElement>(null);
  const { state: solutionState } = useSolutionContext();
  const { showToast } = useToast();

  // Auto-switch to solutions view whenever an answer is generated
  useEffect(() => {
    if (solutionState.solution) {
      setView('solutions');
    }
  }, [solutionState.solution]);

  // Dynamically update the window size smoothly without vibration
  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    let timeoutId: any = null;
    let lastWidth = 0;
    let lastHeight = 0;

    const updateDimensions = () => {
      if (!containerRef.current) {
        return;
      }
      const height = containerRef.current.scrollHeight;
      const width = containerRef.current.scrollWidth;

      if (Math.abs(height - lastHeight) < 8 && Math.abs(width - lastWidth) < 8) {
        return;
      }
      lastWidth = width;
      lastHeight = height;

      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        window.electronAPI
          ?.updateContentDimensions({ width, height, source: 'SubscribedApp' })
          .catch(console.error);
      }, 120);
    };

    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(containerRef.current);
    updateDimensions();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      resizeObserver.disconnect();
    };
  }, [view]);

  // Listen for events that might switch views or show errors
  useEffect(() => {
    const cleanupFunctions = [
      window.electronAPI?.onSolutionStart?.(() => {
        setView('solutions');
      }),
      window.electronAPI?.onUnauthorized?.(() => {
        clearAll();
        setView('queue');
      }),
      window.electronAPI?.onResetView?.(() => {
        clearAll();
        setView('queue');
      }),
      window.electronAPI?.onToggleAudioListening?.(() => {
        void toggleListening();
      }),
      window.electronAPI?.onTriggerAudioSolve?.(() => {
        setView('solutions');
        void askGeminiFromAudio();
      }),
    ].filter(Boolean) as (() => void)[];

    return () => {
      cleanupFunctions.forEach((fn) => {
        fn();
      });
    };
  }, [clearAll, showToast, toggleListening]);

  // Opacity state (default 2% ghost mode, or toggle to 40%, 75%, 95%)
  const [opacity, setOpacity] = useState<number>(0.02);

  // Text contrast color mode: 'white' | 'black' | 'yellow'
  const [textColorMode, setTextColorMode] = useState<'white' | 'black' | 'yellow'>('white');

  const cycleOpacity = () => {
    setOpacity((prev) => (prev === 0.02 ? 0.35 : prev === 0.35 ? 0.75 : prev === 0.75 ? 0.95 : 0.02));
  };

  const cycleTextColor = () => {
    setTextColorMode((prev) => (prev === 'white' ? 'black' : prev === 'black' ? 'yellow' : 'white'));
  };

  const textClass =
    textColorMode === 'black'
      ? 'text-gray-950 font-semibold drop-shadow-[0_1px_1px_rgba(255,255,255,0.9)]'
      : textColorMode === 'yellow'
      ? 'text-amber-300 font-medium drop-shadow-[0_1px_2px_rgba(0,0,0,1)]'
      : 'text-white font-medium drop-shadow-[0_1px_2px_rgba(0,0,0,1)]';

  return (
    <AppModeLayoutProvider>
      <div
        ref={containerRef}
        style={{
          backgroundColor: `rgba(10, 15, 25, ${opacity})`,
        }}
        className={`w-full max-h-[88vh] flex flex-col rounded-2xl border border-white/15 shadow-2xl overflow-hidden font-sans transition-colors duration-200 ${textClass}`}
      >
        {/* Draggable Header */}
        <div
          style={{ WebkitAppRegion: 'drag' } as any}
          className="flex items-center justify-between px-3 py-1.5 bg-black/30 border-b border-white/10 select-none cursor-move shrink-0"
        >
          <div className="flex items-center gap-2 text-xs font-semibold drop-shadow-[0_1px_3px_rgba(0,0,0,1)]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
            <span>Ezzi Live Assistant</span>
            <span className="text-[10px] text-blue-300 bg-blue-500/20 px-1.5 py-0.5 rounded font-mono border border-blue-400/30">
              Gemini 2.5 Flash
            </span>
          </div>
          <div
            style={{ WebkitAppRegion: 'no-drag' } as any}
            className="flex items-center gap-1.5 text-[10px]"
          >
            {/* Text Color / Contrast Toggle */}
            <button
              onClick={cycleTextColor}
              className="px-2 py-0.5 rounded-full bg-black/40 hover:bg-black/60 text-white text-[10px] font-medium border border-white/20 transition-all active:scale-95 drop-shadow-[0_1px_2px_rgba(0,0,0,1)]"
              title="Click to toggle text color (White / Black / Yellow for background visibility)"
            >
              🎨 Text: {textColorMode === 'white' ? 'White' : textColorMode === 'black' ? 'Black' : 'Yellow'}
            </button>

            {/* Transparency / Ghost Mode Toggle */}
            <button
              onClick={cycleOpacity}
              className="px-2 py-0.5 rounded-full bg-black/40 hover:bg-black/60 text-white text-[10px] font-medium border border-white/20 transition-all active:scale-95 drop-shadow-[0_1px_2px_rgba(0,0,0,1)]"
              title="Click to cycle transparency"
            >
              👻 Opacity: {Math.round(opacity * 100)}%
            </button>
            <span className="opacity-70 text-white font-mono text-[9px] bg-black/40 px-1.5 py-0.5 rounded">Ctrl+B</span>
          </div>
        </div>

        {/* Scrollable Body: Full Vertical & Horizontal Scroll */}
        <div className="flex-1 overflow-y-auto overflow-x-auto p-2 scrollbar-thin scrollbar-thumb-white/30 scrollbar-track-transparent select-text">
          {view === 'queue' ? (
            <QueuePage setView={setView} />
          ) : view === 'solutions' ? (
            <SolutionsPage setView={setView} />
          ) : null}
        </div>
      </div>
    </AppModeLayoutProvider>
  );
};

const SubscribedApp: React.FC<SubscribedAppProps> = ({ user }) => {
  const subscriptionValue = useMemo(
    () => ({
      user,
      isFree: false, // Grant full access with Gemini API
    }),
    [user],
  );

  return (
    <SubscriptionProvider value={subscriptionValue}>
      <SettingsProvider>
        <SolutionProvider>
          <ScreenshotProvider>
            <LiveAudioProvider>
              <SubscribedAppContent />
            </LiveAudioProvider>
          </ScreenshotProvider>
        </SolutionProvider>
      </SettingsProvider>
    </SubscriptionProvider>
  );
};

export default SubscribedApp;
