import React from 'react';
import { GRID_SQUARES } from '../lib/quizSchema';

const ManualRevealPad = ({ question, onReveal }) => {
  if (!question) return null;

  const revealSequence = question.reveal.sequence || [];
  const getSequenceOrder = (squareNumber) => {
    const idx = revealSequence.indexOf(squareNumber);
    return idx >= 0 ? idx + 1 : null;
  };

  return (
    <div className="surface p-3 space-y-2">
      <div className="flex justify-between items-center">
        <h3 className="text-white font-bold text-sm">Manual</h3>
        <span className="text-white/60 text-xs">Tap to reveal</span>
      </div>

      <div className="grid grid-cols-3 gap-2 bg-black/40 p-2 rounded-xl ring-1 ring-white/10">
        {GRID_SQUARES.map((squareNumber) => {
          const isRevealed = question.reveal.revealedSquares.includes(squareNumber);
          const order = getSequenceOrder(squareNumber);

          return (
            <button
              key={squareNumber}
              type="button"
              onClick={() => onReveal(squareNumber)}
              disabled={isRevealed}
              aria-label={`Reveal square ${squareNumber}`}
              className={[
                'relative aspect-square rounded font-extrabold transition-all select-none',
                'text-xl',
                isRevealed
                  ? 'bg-black/30 text-white/15 cursor-not-allowed ring-1 ring-white/5'
                  : 'bg-white/10 text-white hover:bg-white/15 active:scale-[0.98] ring-1 ring-white/15'
              ].join(' ')}
            >
              <span className="text-2xl leading-none">{squareNumber}</span>
              {order && !isRevealed && (
                <span className="absolute top-1 left-1 text-[10px] font-black text-black bg-cyan-200 px-1.5 py-0.5 rounded">
                  {order}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ManualRevealPad;
