import React from 'react';
import { buildQuestionLabel } from '../lib/quizSchema';
import StatusBadge from './StatusBadge';

const PreflightPanel = ({ questions, currentIndex, onRunNear, onRunAll, isRunning }) => {
  const windowedQuestions = questions.slice(currentIndex, currentIndex + 3);

  return (
    <div className="surface p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-white font-black text-base">Preflight</h3>
          <p className="text-white/60 text-sm">Check the current question and the next two before you go live.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-secondary px-4 py-3 text-sm" onClick={onRunAll} disabled={isRunning}>
            Check All
          </button>
          <button type="button" className="btn-primary px-4 py-3 text-sm" onClick={onRunNear} disabled={isRunning}>
            {isRunning ? 'Checking...' : 'Check Current + Next'}
          </button>
        </div>
      </div>

      <div className="grid gap-3">
        {windowedQuestions.map((question, offset) => (
          <div key={question.id} className="surface-soft rounded-2xl p-3 flex items-start justify-between gap-3">
            <div>
              <div className="text-white/60 text-xs uppercase tracking-[0.2em]">
                {offset === 0 ? 'Current' : `Next +${offset}`}
              </div>
              <div className="text-white font-bold">{buildQuestionLabel(question, currentIndex + offset)}</div>
              <div className="text-white/50 text-sm">
                {question.media.kind === 'video' ? 'Video' : 'Image'}
                {' '}
                •
                {' '}
                {question.media.src || 'No media URL'}
              </div>
              {question.assetStatus.message && (
                <div className="text-white/60 text-sm mt-1">{question.assetStatus.message}</div>
              )}
            </div>
            <StatusBadge status={question.assetStatus.state} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default PreflightPanel;
