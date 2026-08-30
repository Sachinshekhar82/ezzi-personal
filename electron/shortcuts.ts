import { app, globalShortcut } from 'electron';
import type { IShortcutsHelperDeps } from './main';

export class ShortcutsHelper {
  private deps: IShortcutsHelperDeps;

  constructor(deps: IShortcutsHelperDeps) {
    this.deps = deps;
  }

  /**
   * Register all global shortcuts
   */
  public registerGlobalShortcuts(): void {
    this.registerAllShortcuts();

    app.on('will-quit', () => {
      globalShortcut.unregisterAll();
    });
  }

  /**
   * Register only the CommandOrControl+B shortcut for toggling window visibility
   */
  public registerVisibilityShortcutOnly(): void {
    console.debug('Registering only visibility toggle shortcut (CommandOrControl+B)');

    globalShortcut.unregisterAll();

    setTimeout(() => {
      globalShortcut.register('CommandOrControl+B', () => {
        this.deps.toggleMainWindow();
      });
    }, 500);
  }

  /**
   * Register all global shortcuts
   */
  public registerAllShortcuts(): void {
    console.debug('Registering all shortcuts');

    globalShortcut.unregisterAll();

    // Screenshot Capture (Cmd/Ctrl + H)
    globalShortcut.register('CommandOrControl+H', () => {
      void (async () => {
        const mainWindow = this.deps.getMainWindow();
        if (mainWindow) {
          console.debug('Taking screenshot...');
          try {
            const screenshotPath = await this.deps.takeScreenshot();
            const preview = await this.deps.getImagePreview(screenshotPath);
            mainWindow.webContents.send('screenshot-taken', {
              path: screenshotPath,
              preview,
            });
          } catch (error) {
            console.error('Error capturing screenshot:', error);
          }
        }
      })();
    });

    // Toggle Live Audio Listening (Cmd/Ctrl + M)
    globalShortcut.register('CommandOrControl+M', () => {
      console.debug('Command + M pressed. Toggling live audio listening...');
      const mainWindow = this.deps.getMainWindow();
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('audio:toggle-listening');
      }
    });

    // Solve / Ask AI (Cmd/Ctrl + Enter)
    globalShortcut.register('CommandOrControl+Enter', () => {
      const mainWindow = this.deps.getMainWindow();
      const queue = this.deps.getScreenshotQueue ? this.deps.getScreenshotQueue() : [];
      if (queue.length > 0) {
        void this.deps.processingHelper?.processScreenshotsSolve();
      } else if (mainWindow && !mainWindow.isDestroyed()) {
        console.debug('Command + Enter pressed -> Triggering instant audio question answer.');
        mainWindow.webContents.send('audio:trigger-solve');
      }
    });

    // Reset Context / Start Over (Cmd/Ctrl + G)
    globalShortcut.register('CommandOrControl+G', () => {
      console.debug('Command + G pressed. Canceling requests and resetting queues...');

      // Cancel ongoing API requests
      this.deps.processingHelper?.cancelOngoingRequests();

      // Clear both screenshot queues
      this.deps.clearQueues();

      // Update the view state to 'queue'
      this.deps.setView('queue');

      // Notify renderer process to switch view to 'queue'
      const mainWindow = this.deps.getMainWindow();
      if (mainWindow && !mainWindow.isDestroyed()) {
        console.debug('Sending reset view message to renderer process.');
        mainWindow.webContents.send('reset-view');
      }
    });

    // Move Window Directions
    globalShortcut.register('CommandOrControl+Left', () => {
      console.debug('Command/Ctrl + Left pressed. Moving window left.');
      this.deps.moveWindowLeft();
    });

    globalShortcut.register('CommandOrControl+Right', () => {
      console.debug('Command/Ctrl + Right pressed. Moving window right.');
      this.deps.moveWindowRight();
    });

    globalShortcut.register('CommandOrControl+Down', () => {
      console.debug('Command/Ctrl + down pressed. Moving window down.');
      this.deps.moveWindowDown();
    });

    globalShortcut.register('CommandOrControl+Up', () => {
      console.debug('Command/Ctrl + Up pressed. Moving window Up.');
      this.deps.moveWindowUp();
    });

    // Toggle Window Visibility (Cmd/Ctrl + B)
    globalShortcut.register('CommandOrControl+B', () => {
      this.deps.toggleMainWindow();
    });
  }
}
