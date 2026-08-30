import type React from 'react';
import { useState } from 'react';
import { Mic, MicOff, Sparkles, Trash2, ChevronDown, ChevronUp, Volume2 } from 'lucide-react';
import { useLiveAudio } from '../../contexts/LiveAudioContext';
import { useSettings } from '../../contexts/SettingsContext';
import { COMMAND_KEY } from '../../utils/platform';
import { AudioVisualizer } from './AudioVisualizer';

interface LiveAudioPanelProps {
  onAskGemini?: () => void;
  className?: string;
}

export const LiveAudioPanel: React.FC<LiveAudioPanelProps> = ({
  onAskGemini,
  className = '',
}) => {
  const {
    isListening,
    transcript,
    interimTranscript,
    audioLevel,
    isAnswering,
    toggleListening,
    clearTranscript,
    askGeminiFromAudio,
  } = useLiveAudio();
  const { audioSource, geminiModel } = useSettings();
  const [isExpanded, setIsExpanded] = useState(true);

  const fullText = (transcript + (interimTranscript ? ` ${interimTranscript}` : '')).trim();

  const handleAsk = () => {
    if (onAskGemini) {
      onAskGemini();
    } else {
      void askGeminiFromAudio();
    }
  };

  return (
    <div className={`w-full rounded-xl bg-[#131922]/90 backdrop-blur-md border border-white/10 shadow-2xl p-2.5 text-xs text-white/90 transition-all duration-200 ${className}`}>
      {/* Header bar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* Toggle Audio Listening Button */}
          <button
            onClick={() => void toggleListening()}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all duration-150 ${
              isListening
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                : 'bg-white/10 text-white/70 border border-white/10 hover:bg-white/15'
            }`}
            title="Toggle Live Audio Listening (Ctrl+M / Cmd+M)"
          >
            {isListening ? (
              <>
                <Mic className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>Live Audio: ON</span>
              </>
            ) : (
              <>
                <MicOff className="w-3.5 h-3.5 text-white/50" />
                <span>Live Audio: OFF</span>
              </>
            )}
            <span className="text-[10px] opacity-60 ml-0.5">({COMMAND_KEY}+M)</span>
          </button>

          {/* Visualizer */}
          <AudioVisualizer level={audioLevel} isListening={isListening} barCount={6} />

          {/* Source badge */}
          <div className="hidden sm:flex items-center gap-1 text-[10px] text-white/40 bg-white/5 px-2 py-0.5 rounded">
            <Volume2 className="w-3 h-3" />
            <span>{audioSource === 'system' ? 'System Audio' : audioSource === 'both' ? 'System + Mic' : 'Microphone'}</span>
          </div>

          {/* Auto-Answer Badge */}
          <div className="flex items-center gap-1.5 text-[10px] text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Zoom Auto-Answer</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          {/* Ask Gemini Button */}
          <button
            onClick={handleAsk}
            disabled={isAnswering || (!fullText && false)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-semibold transition-all duration-150 shadow-md ${
              isAnswering
                ? 'bg-purple-600/50 text-white/50 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-blue-500/25 active:scale-95'
            }`}
            title="Generate real-time answer with Gemini (Enter)"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isAnswering ? 'animate-spin' : 'text-blue-200'}`} />
            <span>{isAnswering ? 'Thinking...' : 'Ask Gemini'}</span>
            <span className="text-[10px] opacity-70 bg-white/20 px-1 rounded">↵</span>
          </button>

          {/* Clear button */}
          {fullText && (
            <button
              onClick={clearTranscript}
              className="p-1 text-white/40 hover:text-white/80 hover:bg-white/10 rounded transition-colors"
              title="Clear transcript"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Expand/Collapse transcript */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-white/40 hover:text-white/80 hover:bg-white/10 rounded transition-colors"
          >
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Live Transcript Body */}
      {isExpanded && (
        <div className="mt-2 pt-2 border-t border-white/10">
          <div className="flex items-center justify-between text-[10px] text-white/40 mb-1">
            <span>Interviewer Live Speech Transcript:</span>
            <span className="text-indigo-300/80 font-mono text-[9px]">{geminiModel}</span>
          </div>

          <div className="max-h-24 overflow-y-auto rounded-lg bg-black/40 p-2 text-[11px] leading-relaxed select-text font-sans">
            {fullText ? (
              <p className="text-white/90">
                {transcript}
                {interimTranscript && (
                  <span className="text-blue-300 italic"> {interimTranscript}</span>
                )}
              </p>
            ) : (
              <p className="text-white/30 italic">
                {isListening
                  ? 'Listening for interviewer audio... speak or play system audio to see real-time transcript.'
                  : 'Click "Live Audio: ON" or press Ctrl+M to start real-time listening.'}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
export default LiveAudioPanel;
