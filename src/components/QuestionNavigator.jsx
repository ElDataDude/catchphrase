import React from 'react';
import { buildQuestionLabel } from '../lib/quizSchema';
import StatusBadge from './StatusBadge';

const QuestionNavigator = ({ questions, currentQuestionIndex, onPrevious, onNext, onJump }) => {
  if (!questions.length) return null;

  return (
    <div className="surface p-3 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-white font-black text-sm">
          Q
          {' '}
          {currentQuestionIndex + 1}
          {' '}
          /
          {' '}
          {questions.length}
        </div>
        <div className="text-white/60 text-xs uppercase tracking-[0.2em]">
          Quick jump
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={onPrevious} disabled={currentQuestionIndex === 0} className="flex-1 btn-secondary py-2 px-4 text-sm disabled:opacity-40">
          &larr; Prev
        </button>
        <button onClick={onNext} disabled={currentQuestionIndex === questions.length - 1} className="flex-1 btn-secondary py-2 px-4 text-sm disabled:opacity-40">
          Next &rarr;
        </button>
      </div>

      <div className="overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {questions.map((question, index) => {
            const isCurrent = index === currentQuestionIndex;
            return (
              <button
                key={question.id}
                type="button"
                onClick={() => onJump(index)}
                className={`rounded-2xl px-3 py-2 text-left min-w-[160px] transition ${isCurrent ? 'bg-cyan-300 text-slate-950' : 'bg-white/8 text-white hover:bg-white/14'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs opacity-70">Question {index + 1}</div>
                    <div className="font-bold text-sm">{buildQuestionLabel(question, index)}</div>
                  </div>
                  <StatusBadge status={question.assetStatus.state} />
                </div>
                <div className="text-xs opacity-70 mt-1">{question.reveal.revealedSquares.length}/9 revealed</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default QuestionNavigator;
