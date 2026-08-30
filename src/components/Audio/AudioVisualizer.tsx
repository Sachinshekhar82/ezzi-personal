import type React from 'react';

interface AudioVisualizerProps {
  level: number; // 0.0 to 1.0
  isListening: boolean;
  barCount?: number;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  level,
  isListening,
  barCount = 5,
}) => {
  if (!isListening) {
    return (
      <div className="flex items-center gap-0.5 h-3">
        {Array.from({ length: barCount }).map((_, i) => (
          <div key={i} className="w-1 h-1 bg-white/20 rounded-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-0.5 h-3.5 px-1">
      {Array.from({ length: barCount }).map((_, i) => {
        // Vary heights based on level and index
        const multiplier = 0.4 + 0.6 * Math.sin(((i + 1) / barCount) * Math.PI);
        const dynamicHeight = Math.max(3, Math.min(14, level * 20 * multiplier + Math.random() * 2));
        return (
          <div
            key={i}
            className="w-1 bg-emerald-400 rounded-full transition-all duration-75 ease-out shadow-[0_0_6px_rgba(52,211,153,0.6)]"
            style={{
              height: `${dynamicHeight}px`,
            }}
          />
        );
      })}
    </div>
  );
};
export default AudioVisualizer;
