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

  // Combine thoughts with complexity items for unified presentation like the demo
  const allThoughts = [...(thoughtsData || [])];
  if (timeComplexityData && !allThoughts.some((t) => t.toLowerCase().includes('time complexity'))) {
    allThoughts.push(`Time complexity will be ${timeComplexityData}`);
  }
  if (spaceComplexityData && !allThoughts.some((t) => t.toLowerCase().includes('space complexity'))) {
    allThoughts.push(`Space complexity will be ${spaceComplexityData}`);
  }

  const edgeCasesContent = edgeCases && edgeCases.length > 0 && (
    <div className="space-y-1.5">
      {edgeCases.map((ec, idx) => (
        <div key={idx} className="flex items-start gap-2 text-[12px] text-amber-200/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
          <div>{ec}</div>
        </div>
      ))}
    </div>
  );

  const followUpsContent = followUps && followUps.length > 0 && (
    <div className="space-y-2">
      {followUps.map((fu, idx) => (
        <div key={idx} className="bg-black/40 rounded-lg p-2.5 border border-white/10 space-y-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
          <div className="text-[12px] font-medium text-purple-300">Q: {fu.question}</div>
          <div className="text-[11px] text-gray-200 leading-relaxed">A: {fu.answer}</div>
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
          title="Problem Statement"
          content={<div className="text-gray-100 font-sans text-xs leading-relaxed drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">{problemStatement}</div>}
          isLoading={false}
        />
      )}

      {allThoughts.length > 0 && (
        <SolutionContent
          title="My Thoughts"
          content={<ThoughtsList thoughts={allThoughts} />}
          isLoading={false}
        />
      )}

      {solutionData && (
        <SolutionContent
          title="Solution"
          content={
            <CodeBlock code={solutionData} language={currentLanguage} showCopyButton={true} />
          }
          isLoading={!solutionData}
          type="code"
        />
      )}

      {edgeCasesContent && (
        <SolutionContent
          title="Key Edge Cases"
          content={edgeCasesContent}
          isLoading={false}
        />
      )}

      {followUpsContent && (
        <SolutionContent
          title="Follow-Up Questions"
          content={followUpsContent}
          isLoading={false}
        />
      )}
    </div>
  );
};

export const SolutionSection: React.FC<SolutionSectionProps> = SolutionSectionInner;
