import type React from 'react';
import type { ProgrammingLanguage } from '../../../shared/api';

interface SolutionContentProps {
  title: string;
  content: React.ReactNode;
  isLoading: boolean;
  currentLanguage?: ProgrammingLanguage;
  type?: 'code' | 'text';
}

const SolutionContent: React.FC<SolutionContentProps> = ({
  title,
  content,
  isLoading,
  type = 'text',
}) => {
  return (
    <div className="bg-black/30 rounded-xl p-3.5 border border-white/10 shadow-lg">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
        <h2 className="text-[13px] font-semibold text-white tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">{title}</h2>
      </div>

      {isLoading ? (
        <div className="mt-4 flex">
          <p className="text-xs bg-linear-to-r from-gray-300 via-gray-100 to-gray-300 bg-clip-text text-transparent animate-pulse">
            Loading...
          </p>
        </div>
      ) : (
        <div className={`text-[13px] leading-[1.5] ${type === 'text' ? 'text-gray-100' : ''}`}>
          {content}
        </div>
      )}
    </div>
  );
};

export default SolutionContent;
