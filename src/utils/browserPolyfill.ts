import { AppMode, SubscriptionLevel } from '@shared/api';

export function setupBrowserPolyfill() {
  if (typeof window === 'undefined') return;

  const eventListeners: Record<string, Function[]> = {};

  const emit = (event: string, ...args: any[]) => {
    (eventListeners[event] || []).forEach((fn) => {
      try {
        fn(...args);
      } catch (err) {
        console.error(`Error in listener for ${event}:`, err);
      }
    });
  };

  const addListener = (event: string, callback: Function) => {
    if (!eventListeners[event]) {
      eventListeners[event] = [];
    }
    eventListeners[event].push(callback);
    return () => {
      eventListeners[event] = (eventListeners[event] || []).filter((fn) => fn !== callback);
    };
  };

  let screenshots: Array<{ path: string; preview: string }> = [];

  const captureBrowserScreen = async (): Promise<{ path: string; preview: string }> => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'monitor' },
        audio: false,
      });

      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);

      stream.getTracks().forEach((track) => track.stop());

      const dataUri = canvas.toDataURL('image/png');
      const item = {
        path: `browser-shot-${Date.now()}.png`,
        preview: dataUri,
      };
      screenshots.push(item);
      emit('screenshot-taken', item);
      return item;
    } catch (err) {
      console.warn('Screen capture canceled or failed:', err);
      throw err;
    }
  };

  if (!(window as any).electronAPI) {
    console.log('Initializing Browser Polyfill for window.electronAPI');

    (window as any).electronAPI = {
      openSubscriptionPortal: async () => ({ success: true }),
      updateContentDimensions: async () => {},
      clearStore: async () => ({ success: true }),
      getScreenshots: async () => screenshots,
      deleteScreenshot: async (path: string) => {
        screenshots = screenshots.filter((s) => s.path !== path);
        return { success: true };
      },
      clearAllScreenshots: async () => {
        screenshots = [];
        return { success: true };
      },
      onScreenshotTaken: (cb: any) => addListener('screenshot-taken', cb),
      onResetView: (cb: any) => addListener('reset-view', cb),
      onSolutionStart: (cb: any) => addListener('solution-start', cb),
      onDebugStart: (cb: any) => addListener('debug-start', cb),
      onDebugSuccess: (cb: any) => addListener('debug-success', cb),
      onSolutionError: (cb: any) => addListener('solution-error', cb),
      onProcessingNoScreenshots: (cb: any) => addListener('processing-no-screenshots', cb),
      onSolutionSuccess: (cb: any) => addListener('solution-success', cb),
      onUnauthorized: (cb: any) => addListener('unauthorized', cb),
      onDebugError: (cb: any) => addListener('debug-error', cb),
      onToggleAudioListening: (cb: any) => addListener('audio:toggle-listening', cb),
      openExternal: (url: string) => window.open(url, '_blank'),
      toggleMainWindow: async () => ({ success: true }),
      triggerScreenshot: async () => {
        try {
          await captureBrowserScreen();
          return { success: true };
        } catch (err) {
          return { success: false, error: String(err) };
        }
      },
      triggerReset: async () => {
        screenshots = [];
        emit('reset-view');
        return { success: true };
      },
      triggerMoveLeft: async () => ({ success: true }),
      triggerMoveRight: async () => ({ success: true }),
      triggerMoveUp: async () => ({ success: true }),
      triggerMoveDown: async () => ({ success: true }),
      onSubscriptionUpdated: (cb: any) => addListener('subscription-updated', cb),
      onSubscriptionPortalClosed: (cb: any) => addListener('subscription-portal-closed', cb),
      getPlatform: () => 'web',
      handleMouseEnter: async () => {},
      handleMouseLeave: async () => {},
      handleCloseClick: async () => {},
      handleQueueLoadedNoScreenshots: () => {},
      handleQueueLoadedWithScreenshots: () => {},
      setSubscriptionLevel: async () => ({ success: true }),
      authSetToken: async () => ({ success: true }),
      authGetToken: async () => ({ success: true, token: 'browser-mock-token' }),
      authClearToken: async () => ({ success: true }),
      authIsAuthenticated: async () => ({ success: true, isAuthenticated: true }),
      authSetLastUsedEmail: async () => ({ success: true }),
      authGetLastUsedEmail: async () => ({ success: true, email: 'browser-user@local' }),
      setAppMode: async (_mode: AppMode) => ({ success: true }),
      getAppMode: async () => ({ success: true, appMode: AppMode.LIVE_INTERVIEW }),
      getReadableVarNames: async () => ({ success: true, readableVarNames: true }),
      setReadableVarNames: async () => ({ success: true }),
      writeText: async (text: string) => {
        await navigator.clipboard.writeText(text);
        return { success: true };
      },
      copyAndRefreshWindow: async (text: string) => {
        await navigator.clipboard.writeText(text);
        return { success: true };
      },
    };
  }

  if (!(window as any).electron) {
    (window as any).electron = {
      ipcRenderer: {
        on: (channel: string, func: Function) => addListener(channel, func),
        removeListener: (channel: string, func: Function) => {
          eventListeners[channel] = (eventListeners[channel] || []).filter((fn) => fn !== func);
        },
      },
    };
  }
}
