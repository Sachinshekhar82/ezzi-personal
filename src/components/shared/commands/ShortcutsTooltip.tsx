import type { AppMode } from '@shared/api.ts';
import { IPC_EVENTS } from '@shared/constants.ts';
import type React from 'react';
import { useState } from 'react';
import { Key, Mic, Sparkles, Eye, EyeOff } from 'lucide-react';
import { sendToElectron } from '../../../utils/electron';
import { useSettings } from '../../../contexts/SettingsContext';
import { AppModeSelector } from '../AppModeSelector';
import { LanguageSelector } from '../LanguageSelector';
import { LocaleSelector } from '../LocaleSelector.tsx';

export interface ShortcutItem {
  label: string;
  shortcut: string[];
  description: string;
  condition?: boolean;
}

interface ShortcutsTooltipProps {
  tooltipRef: React.RefObject<HTMLDivElement | null>;
  shortcuts: ShortcutItem[];
  currentAppMode: AppMode;
  onSignOut: () => void;
  className?: string;
  setAppMode: (appMode: AppMode) => void;
  isFree?: boolean;
  userEmail?: string;
}

const ShortcutsTooltip: React.FC<ShortcutsTooltipProps> = ({
  tooltipRef,
  shortcuts,
  currentAppMode,
  onSignOut,
  className = '',
  setAppMode,
  isFree,
  userEmail,
}) => {
  const {
    geminiApiKey,
    geminiModel,
    audioSource,
    autoAnswerOnSilence,
    updateGeminiApiKey,
    updateGeminiModel,
    updateAudioSource,
    updateAutoAnswerOnSilence,
  } = useSettings();

  const [apiKeyInput, setApiKeyInput] = useState(geminiApiKey);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isKeySaved, setIsKeySaved] = useState(false);

  const handleSaveApiKey = () => {
    void updateGeminiApiKey(apiKeyInput.trim());
    setIsKeySaved(true);
    setTimeout(() => setIsKeySaved(false), 2000);
  };

  return (
    <div
      ref={tooltipRef}
      className={`absolute text-[13px] top-full left-0 mt-2 w-88 max-w-sm transform -translate-x-[calc(50%-12px)] ${className}`}
      style={{ zIndex: 100 }}
    >
      <div className="absolute -top-2 right-0 w-full h-2" />
      <div className="p-3.5 bg-[#171E28]/95 backdrop-blur-md rounded-xl border border-white/10 text-gray-100 shadow-2xl space-y-3 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <h3 className="font-semibold text-white/90 text-xs flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            Interview Assistant Settings
          </h3>
          <span className="text-[10px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20 font-medium">
            Gemini Live
          </span>
        </div>

        {/* Gemini API Key */}
        <div className="space-y-1.5 bg-black/30 p-2.5 rounded-lg border border-white/5">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-medium text-white/80 flex items-center gap-1">
              <Key className="w-3 h-3 text-yellow-400" />
              Gemini API Key
            </label>
            {isKeySaved && (
              <span className="text-[10px] text-emerald-400 animate-pulse font-medium">Saved ✓</span>
            )}
          </div>
          <div className="flex gap-1.5">
            <div className="relative flex-1">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-[11px] text-white focus:outline-none focus:border-blue-500 font-mono pr-7"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-1.5 top-1.5 text-white/40 hover:text-white/80"
              >
                {showApiKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              </button>
            </div>
            <button
              type="button"
              onClick={handleSaveApiKey}
              className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] px-2.5 py-1 rounded font-medium transition-colors"
            >
              Save
            </button>
          </div>
        </div>

        {/* Model & Audio Source */}
        <div className="grid grid-cols-2 gap-2">
          {/* Gemini Model */}
          <div className="space-y-1 bg-black/20 p-2 rounded-lg border border-white/5">
            <label className="text-[10px] text-white/60 block font-medium">Gemini Model</label>
            <select
              value={geminiModel}
              onChange={(e) => void updateGeminiModel(e.target.value)}
              className="w-full bg-[#1E2530] text-[11px] text-white/90 border border-white/10 rounded px-1.5 py-1 focus:outline-none focus:border-blue-500 font-mono"
            >
              <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
              <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
              <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
            </select>
          </div>

          {/* Audio Source */}
          <div className="space-y-1 bg-black/20 p-2 rounded-lg border border-white/5">
            <label className="text-[10px] text-white/60 flex items-center gap-1 font-medium">
              <Mic className="w-3 h-3 text-emerald-400" />
              Audio Input
            </label>
            <select
              value={audioSource}
              onChange={(e) => void updateAudioSource(e.target.value as any)}
              className="w-full bg-[#1E2530] text-[11px] text-white/90 border border-white/10 rounded px-1.5 py-1 focus:outline-none focus:border-blue-500"
            >
              <option value="mic">Microphone</option>
              <option value="system">System Audio</option>
              <option value="both">System + Mic</option>
            </select>
          </div>
        </div>

        {/* Auto Answer Toggle */}
        <div className="flex items-center justify-between bg-black/20 px-2.5 py-1.5 rounded-lg border border-white/5">
          <span className="text-[11px] text-white/70">Auto-Answer on Speech Silence</span>
          <input
            type="checkbox"
            checked={autoAnswerOnSilence}
            onChange={(e) => void updateAutoAnswerOnSilence(e.target.checked)}
            className="rounded accent-blue-500 cursor-pointer"
          />
        </div>

        {/* Keyboard Shortcuts */}
        <div className="space-y-2 pt-1 border-t border-white/10">
          <h4 className="font-medium text-white/70 text-[11px]">Keyboard Shortcuts</h4>
          <div className="space-y-1.5">
            {shortcuts.map(
              (shortcut, index) =>
                shortcut.condition !== false && (
                  <div
                    key={index}
                    className="cursor-default rounded px-1.5 py-1 bg-white/5 transition-colors flex items-center justify-between"
                  >
                    <div>
                      <div className="font-medium text-[11px] text-white/90">{shortcut.label}</div>
                      <p className="text-[9px] text-white/50">{shortcut.description}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {shortcut.shortcut.map((key, keyIndex) => (
                        <span
                          key={keyIndex}
                          className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium text-white/90 border border-white/10"
                        >
                          {key}
                        </span>
                      ))}
                    </div>
                  </div>
                ),
            )}
          </div>
        </div>

        {/* Language Options */}
        <div className="pt-2 border-t border-white/10 space-y-1">
          <AppModeSelector currentAppMode={currentAppMode} setAppMode={setAppMode} />
          <LanguageSelector />
          <LocaleSelector />

          <div className="flex items-center justify-between pt-2 border-t border-white/10">
            <button
              onClick={onSignOut}
              className="flex items-center gap-1.5 text-[11px] font-medium text-red-400 hover:text-red-300 transition-colors"
            >
              Reset Session
            </button>
            <button
              onClick={() => sendToElectron(IPC_EVENTS.TOOLTIP.CLOSE_CLICK)}
              className="flex items-center gap-1.5 text-[11px] font-medium text-white/60 hover:text-white/90 transition-colors"
            >
              Close App
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShortcutsTooltip;
