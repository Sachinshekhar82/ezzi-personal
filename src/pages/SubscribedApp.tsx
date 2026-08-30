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
  const { toggleListening } = useLiveAudio();
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

  // Dynamically update the window size
  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const updateDimensions = () => {
      if (!containerRef.current) {
        return;
      }
      const height = containerRef.current.scrollHeight;
      const width = containerRef.current.scrollWidth;
      window.electronAPI
        ?.updateContentDimensions({ width, height, source: 'SubscribedApp' })
        .catch(console.error);
    };

    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(containerRef.current);

    // Also watch DOM changes
    const mutationObserver = new MutationObserver(updateDimensions);
    mutationObserver.observe(containerRef.current, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    });

    // Initial dimension update
    updateDimensions();

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
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
      window.electronAPI?.onSolutionError?.((error: string) => {
        showToast('Error', error, 'error');
      }),
      window.electronAPI?.onToggleAudioListening?.(() => {
        void toggleListening();
      }),
    ].filter(Boolean) as (() => void)[];

    return () => {
      cleanupFunctions.forEach((fn) => {
        fn();
      });
    };
  }, [clearAll, showToast, toggleListening]);

  // 2% default opacity for ultra-sheer see-through background
  const [opacity, setOpacity] = useState<number>(0.02);

  const cycleOpacity = () => {
    setOpacity((prev) => (prev === 0.02 ? 0.15 : prev === 0.15 ? 0.35 : prev === 0.35 ? 0.7 : 0.02));
  };

  return (
    <AppModeLayoutProvider>
      <div
        ref={containerRef}
        style={{
          backgroundColor: `rgba(10, 15, 25, ${opacity})`,
        }}
        className="w-full max-h-[88vh] flex flex-col rounded-2xl border border-white/10 shadow-2xl overflow-hidden font-sans transition-colors duration-200"
      >
        {/* Draggable Ultra-Thin Header */}
        <div
          style={{ WebkitAppRegion: 'drag' } as any}
          className="flex items-center justify-between px-3 py-1.5 bg-black/20 border-b border-white/10 select-none cursor-move shrink-0"
        >
          <div className="flex items-center gap-2 text-white text-xs font-semibold drop-shadow-[0_1px_3px_rgba(0,0,0,1)]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
            <span>Ezzi Live Assistant</span>
            <span className="text-[10px] text-blue-300 bg-blue-500/20 px-1.5 py-0.5 rounded font-mono border border-blue-400/30">
              Gemini 2.5 Flash
            </span>
          </div>
          <div
            style={{ WebkitAppRegion: 'no-drag' } as any}
            className="flex items-center gap-2 text-[10px] text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,1)]"
          >
            {/* Transparency / Ghost Mode Toggle */}
            <button
              onClick={cycleOpacity}
              className="px-2 py-0.5 rounded-full bg-black/30 hover:bg-black/50 text-white text-[10px] font-medium border border-white/20 transition-all active:scale-95 drop-shadow-[0_1px_2px_rgba(0,0,0,1)]"
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
