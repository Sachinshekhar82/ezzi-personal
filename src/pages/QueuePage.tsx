import type React from 'react';
import { CommandSection, ScreenshotSection } from '../components/sections';
import { LiveAudioPanel } from '../components/Audio/LiveAudioPanel';
import { useQueue } from '../hooks';
import { useLiveAudio } from '../contexts/LiveAudioContext';
import { LeetcodeSolverLayout, LiveInterviewLayout, useAppModeLayout } from '../layouts';

interface QueuePageProps {
  setView: (view: 'queue' | 'solutions' | 'debug') => void;
}

const QueuePage: React.FC<QueuePageProps> = ({ setView }) => {
  const { isLiveInterview } = useAppModeLayout();
  const { screenshots, handleDeleteScreenshot, handleTooltipVisibilityChange, contentRef } =
    useQueue();
  const { askGeminiFromAudio } = useLiveAudio();

  const handleAskGemini = () => {
    setView('solutions');
    void askGeminiFromAudio();
  };

  const screenshotSection =
    screenshots.length > 0 ? (
      <ScreenshotSection
        screenshots={screenshots}
        onDeleteScreenshot={handleDeleteScreenshot}
        isLoading={false}
      />
    ) : null;

  const commandSection = (
    <CommandSection
      mode="queue"
      onTooltipVisibilityChange={handleTooltipVisibilityChange}
      screenshotCount={screenshots.length}
    />
  );

  if (isLiveInterview) {
    return (
      <div ref={contentRef} className="bg-transparent w-full max-w-2xl">
        <div className="px-4 py-3 space-y-3">
          <LiveAudioPanel onAskGemini={handleAskGemini} />
          <div className="w-fit">
            <LiveInterviewLayout
              screenshotSection={screenshotSection}
              commandSection={commandSection}
            />
          </div>
        </div>
      </div>
    );
  } else {
    return (
      <div ref={contentRef} className="bg-transparent w-full max-w-2xl px-4 py-3 space-y-3">
        <LiveAudioPanel onAskGemini={handleAskGemini} />
        <LeetcodeSolverLayout
          screenshotSection={screenshotSection}
          commandSection={commandSection}
        />
      </div>
    );
  }
};

export default QueuePage;
