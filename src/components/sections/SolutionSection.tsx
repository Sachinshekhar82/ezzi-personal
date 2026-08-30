import type React from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { useAppModeLayout } from '../../layouts';
import CodeBlock from '../Solutions/CodeBlock';
import SolutionContent from '../Solutions/SolutionContent';
import ThoughtsList from '../Solutions/ThoughtsList';

interface SolutionSectionProps {
  solutionData?: string | null;
  thoughtsData?: string[] | null;
  timeComplexityData?: string | null;
  spaceComplexityData?: string | null;
  problemStatement?: string | null;
  edgeCases?: string[] | null;
  followUps?: { question: string; answer: string }[] | null;
  title?: string;
  isGenerating?: boolean;
  className?: string;
}

const SolutionSectionInner: React.FC<SolutionSectionProps> = ({
  solutionData,
  thoughtsData,
  timeComplexityData,
  spaceComplexityData,
  problemStatement,
  edgeCases,
  followUps,
  title = 'Solution',
  isGenerating = false,
  className = '',
}) => {
  const { isLeetcodeSolver } = useAppModeLayout();
  const { solutionLanguage } = useSettings();
  const currentLanguage = solutionLanguage;

  if (isGenerating) {
    return (
      <div className={className}>
        <SolutionContent title="Generating solution with Gemini..." content="..." isLoading={true} />
      </div>
    );
  }

  if (!solutionData && !thoughtsData && !problemStatement) {
    return null;
  }

  const complexityContent = (timeComplexityData || spaceComplexityData) && (
    <div className="space-y-2 font-normal">
      {timeComplexityData && (
        <div className="flex items-start gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 shrink-0" />
          <div>
            <span className="font-semibold text-emerald-300">Time Complexity:</span>{' '}
            <span className="text-white/90 font-mono">{timeComplexityData}</span>
          </div>
        </div>
      )}
      {spaceComplexityData && (
        <div className="flex items-start gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 shrink-0" />
          <div>
            <span className="font-semibold text-indigo-300">Space Complexity:</span>{' '}
            <span className="text-white/90 font-mono">{spaceComplexityData}</span>
          </div>
        </div>
      )}
    </div>
  );

  const edgeCasesContent = edgeCases && edgeCases.length > 0 && (
    <div className="space-y-1.5">
      {edgeCases.map((ec, idx) => (
        <div key={idx} className="flex items-start gap-2 text-[12px] text-amber-200/90">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
          <div>{ec}</div>
        </div>
      ))}
    </div>
  );

  const followUpsContent = followUps && followUps.length > 0 && (
    <div className="space-y-2.5">
      {followUps.map((fu, idx) => (
        <div key={idx} className="bg-black/30 rounded-lg p-2.5 border border-white/5 space-y-1">
          <div className="text-[12px] font-medium text-purple-300">Q: {fu.question}</div>
          <div className="text-[11px] text-white/80 leading-relaxed">A: {fu.answer}</div>
        </div>
      ))}
    </div>
  );

  if (isLeetcodeSolver) {
    return (
      <div className={className}>
        {solutionData && (
          <SolutionContent
            title={title}
            content={
              <CodeBlock code={solutionData} language={currentLanguage} showCopyButton={true} />
            }
            isLoading={!solutionData}
            type="code"
          />
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-3.5 ${className}`}>
      {problemStatement && (
        <SolutionContent
          title="Problem / Interview Question"
          content={<div className="text-white/90 font-sans text-xs leading-relaxed">{problemStatement}</div>}
          isLoading={false}
        />
      )}

      {thoughtsData && (
        <SolutionContent
          title={title === 'Solution' ? 'Verbal Talking Points (Say Out Loud)' : 'What I Changed'}
          content={<ThoughtsList thoughts={thoughtsData} />}
          isLoading={!thoughtsData}
        />
      )}

      {solutionData && (
        <SolutionContent
          title={title}
          content={
            <CodeBlock code={solutionData} language={currentLanguage} showCopyButton={true} />
          }
          isLoading={!solutionData}
          type="code"
        />
      )}

      {complexityContent && (
        <SolutionContent
          title="Complexity Analysis"
          content={complexityContent}
          isLoading={!timeComplexityData && !spaceComplexityData}
        />
      )}

      {edgeCasesContent && (
        <SolutionContent
          title="Key Edge Cases to Mention"
          content={edgeCasesContent}
          isLoading={false}
        />
      )}

      {followUpsContent && (
        <SolutionContent
          title="Anticipated Follow-Up Questions"
          content={followUpsContent}
          isLoading={false}
        />
      )}
    </div>
  );
};

export const SolutionSection: React.FC<SolutionSectionProps> = SolutionSectionInner;
