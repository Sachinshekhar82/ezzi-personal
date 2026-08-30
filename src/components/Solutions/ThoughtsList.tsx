import type React from 'react';

interface ThoughtsListProps {
  thoughts: string[];
}

const ThoughtsList: React.FC<ThoughtsListProps> = ({ thoughts }) => {
  return (
    <div className="space-y-2.5 font-sans">
      {thoughts.map((thought, index) => (
        <div key={index} className="flex items-start gap-2.5">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 shrink-0 shadow-[0_0_6px_rgba(96,165,250,0.8)]" />
          <div className="text-[13px] leading-relaxed text-gray-100 font-normal tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
            {thought}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ThoughtsList;
