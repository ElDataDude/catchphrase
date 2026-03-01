import React from 'react';
import { GRID_SQUARES } from '../lib/quizSchema';

const GridOverlay = ({ question, interactive = false, showNumbers = false, onReveal, animation = 'flip' }) => {
  if (!question) return null;

  const revealedSquares = question.reveal.revealedSquares;
  const revealSequence = question.reveal.sequence || [];

  return (
    <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-1 p-1 perspective-1000">
      {GRID_SQUARES.map((squareNumber) => {
        const isRevealed = revealedSquares.includes(squareNumber);
        const sequenceIndex = revealSequence.indexOf(squareNumber);
        const sequenceNum = showNumbers && sequenceIndex >= 0 ? sequenceIndex + 1 : null;
        const SquareEl = interactive ? 'button' : 'div';

        return (
          <SquareEl
            key={squareNumber}
            type={interactive ? 'button' : undefined}
            aria-label={interactive ? `Reveal square ${squareNumber}` : undefined}
            className={[
              'relative flex items-center justify-center overflow-hidden rounded-lg',
              isRevealed ? (animation === 'fade' ? 'animate-fade-out' : 'animate-reveal') : 'bg-black/95',
              interactive && !isRevealed ? 'cursor-pointer hover:bg-zinc-950/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300' : '',
              !isRevealed ? 'ring-1 ring-white/15 shadow-inner' : ''
            ].join(' ')}
            onClick={interactive ? () => onReveal(squareNumber) : undefined}
            style={{ aspectRatio: '1', backfaceVisibility: 'hidden' }}
          >
            {!isRevealed && (
              <div className="flex flex-col items-center justify-center w-full h-full">
                {sequenceNum && (
                  <div className="text-cyan-200 text-[clamp(18px,4vw,58px)] font-mono font-black opacity-90 drop-shadow-lg">
                    {sequenceNum}
                  </div>
                )}
                <div className="absolute inset-0 bg-[linear-gradient(135deg,#0a0a0a_25%,#050505_25%,#050505_50%,#0a0a0a_50%,#0a0a0a_75%,#050505_75%,#050505_100%)] bg-[length:14px_14px] opacity-95 pointer-events-none" />
              </div>
            )}
          </SquareEl>
        );
      })}
    </div>
  );
};

export default GridOverlay;
