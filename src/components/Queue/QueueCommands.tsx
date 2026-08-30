import type React from 'react';
import { useAppMode } from '../../contexts/appMode';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { useLiveAudio } from '../../contexts/LiveAudioContext';
import { authService } from '../../services/auth.ts';
import { COMMAND_KEY } from '../../utils/platform';
import CommandButton from '../shared/commands/CommandButton';
import CommandSeparator from '../shared/commands/CommandSeparator';
import SettingsTooltip from '../shared/commands/SettingsTooltip';
import { AppModeIndicator } from './AppModeIndicator';

interface QueueCommandsProps {
  onTooltipVisibilityChange: (visible: boolean, height: number) => void;
  screenshotCount?: number;
}

const QueueCommands: React.FC<QueueCommandsProps> = ({
  onTooltipVisibilityChange,
  screenshotCount = 0,
}) => {
  const { currentAppMode, setAppMode } = useAppMode();
  const { isFree, user } = useSubscription();
  const { isListening } = useLiveAudio();

  const handleSignOut = () => {
    authService.signOut().catch(console.error);
  };

  return (
    <div className="pt-2 w-fit">
      <div className="text-xs text-gray-100 bg-[#1E2530]/90 backdrop-blur-md rounded-xl py-2 px-4 shadow-xl border border-white/10">
        {/* Top section - Full width AppModeIndicator */}
        <div className="w-full mb-2">
          <AppModeIndicator />
        </div>

        {/* Bottom section - All buttons in horizontal layout */}
        <div className="flex items-center justify-center gap-3">
          {/* Live Audio Shortcut indicator */}
          <CommandButton
            label={isListening ? 'Audio Listening' : 'Live Audio'}
            shortcut="M"
          />

          {/* Screenshot */}
          <CommandButton
            label={
              screenshotCount === 0
                ? 'Screenshot'
                : screenshotCount === 1
                  ? 'Next screenshot'
                  : 'Reset screenshot'
            }
            shortcut="H"
          />

          {/* Solve / Ask Gemini Command */}
          {screenshotCount > 0 && <CommandButton label="Solve" shortcut="↵" />}

          {/* Start Over */}
          {screenshotCount > 0 && <CommandButton label="Start Over" shortcut="G" />}

          {/* Settings with Tooltip */}
          {screenshotCount === 0 && (
            <>
              <CommandSeparator />
              <SettingsTooltip
                isFree={isFree}
                userEmail={user.user.email}
                shortcuts={[
                  {
                    label: 'Toggle Window',
                    shortcut: [COMMAND_KEY, 'B'],
                    description: 'Show or hide this overlay window.',
                  },
                  {
                    label: 'Live Audio Listening',
                    shortcut: [COMMAND_KEY, 'M'],
                    description: 'Toggle real-time speech capture for interviewer questions.',
                  },
                  {
                    label: 'Take Screenshot',
                    shortcut: [COMMAND_KEY, 'H'],
                    description: 'Capture screenshot of code editor or problem.',
                  },
                  {
                    label: 'Ask Gemini / Solve',
                    shortcut: [COMMAND_KEY, '↵'],
                    description: 'Generate live structured solution with talking points and code.',
                  },
                  {
                    label: 'Start Over',
                    shortcut: [COMMAND_KEY, 'G'],
                    description: 'Start fresh with a new question and clear context.',
                  },
                ]}
                currentAppMode={currentAppMode}
                setAppMode={setAppMode}
                onSignOut={handleSignOut}
                onTooltipVisibilityChange={onTooltipVisibilityChange}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default QueueCommands;
