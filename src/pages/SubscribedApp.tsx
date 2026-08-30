import { type AuthenticatedUser, SubscriptionLevel } from '@shared/api.ts';
import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ScreenshotProvider } from '../contexts/ScreenshotContext';
import { SettingsProvider } from '../contexts/SettingsContext';
import { SolutionProvider, useSolutionContext } from '../contexts/SolutionContext';
import { SubscriptionProvider } from '../contexts/SubscriptionContext';
import { LiveAudioProvider, useLiveAudio } from '../contexts/LiveAudioContext';
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

  return (
    <AppModeLayoutProvider>
      <div ref={containerRef} className="min-h-0 bg-[#0F141C]/95 backdrop-blur-xl rounded-2xl border border-white/15 shadow-2xl overflow-hidden font-sans">
        {/* Draggable Header */}
        <div
          style={{ WebkitAppRegion: 'drag' } as any}
          className="flex items-center justify-between px-3.5 py-2 bg-[#171E28]/90 border-b border-white/10 select-none cursor-move"
        >
          <div className="flex items-center gap-2 text-white/90 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Ezzi Live Interview Assistant</span>
            <span className="text-[10px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded font-mono">
              Gemini 2.5 Flash
            </span>
          </div>
          <div
            style={{ WebkitAppRegion: 'no-drag' } as any}
            className="flex items-center gap-2 text-[10px] text-white/40"
          >
            <span>Ctrl+B to toggle</span>
          </div>
        </div>

        <div className="p-1">
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
