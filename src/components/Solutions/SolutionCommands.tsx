import type { Screenshot } from '@shared/api.ts';
import type React from 'react';
import { useLiveAudio } from '../../contexts/LiveAudioContext';
import CommandButton from '../shared/commands/CommandButton';

export interface SolutionCommandsProps {
  isProcessing: boolean;
  screenshots?: Screenshot[];
}

const SolutionCommands: React.FC<SolutionCommandsProps> = ({ isProcessing, screenshots = [] }) => {
  const { isListening } = useLiveAudio();

  return (
    <div className="pt-2 w-fit">
      <div className="text-xs text-gray-100 bg-[#1E2530]/90 backdrop-blur-md rounded-xl py-2 px-4 flex items-center justify-center gap-3 shadow-xl border border-white/10">
        <CommandButton label="Show/Hide" shortcut="B" />

        <CommandButton
          label={isListening ? 'Listening' : 'Live Audio'}
          shortcut="M"
        />

        {!isProcessing && (
          <>
            <CommandButton
              label={screenshots.length === 0 ? 'Screenshot code' : 'Screenshot'}
              shortcut="H"
            />

            <CommandButton label="Debug / Re-solve" shortcut="↵" />
          </>
        )}

        <CommandButton label="Start Over" shortcut="G" />
      </div>
    </div>
  );
};

export default SolutionCommands;
