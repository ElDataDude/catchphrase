import React from 'react';
import { useQuiz } from '../contexts/QuizContext';
import { useSquareReveal } from '../hooks/useSquareReveal';

const GridOverlay = ({ interactive = false, showNumbers = false }) => {
  const { state } = useQuiz();
  const { revealSquare } = useSquareReveal();

  const currentQuestion = state.questions[state.currentQuestionIndex];

  if (!currentQuestion) return null;

  const { revealedSquares, revealSequence } = currentQuestion;

  const handleSquareClick = (squareNumber) => {
    if (interactive && !revealedSquares.includes(squareNumber)) {
      revealSquare(squareNumber);
    }
  };

  const getSquareNumber = (squareNumber) => {
    if (!showNumbers || !revealSequence) return null;
    const sequenceIndex = revealSequence.indexOf(squareNumber);
    return sequenceIndex >= 0 ? sequenceIndex + 1 : null;
  };

  const squares = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const SquareEl = interactive ? 'button' : 'div';

  return (
    <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-1 p-1 perspective-1000">
      {squares.map((squareNumber) => {
        const isRevealed = revealedSquares.includes(squareNumber);
        const sequenceNum = getSquareNumber(squareNumber);

        return (
          <SquareEl
            key={squareNumber}
            type={interactive ? 'button' : undefined}
            className={`
              relative flex items-center justify-center
              preserve-3d transition-transform duration-700
              ${isRevealed ? 'animate-reveal' : 'bg-black'}
              ${interactive && !isRevealed ? 'cursor-pointer hover:bg-zinc-950' : ''}
              ${!isRevealed ? 'ring-1 ring-white/15 shadow-inner' : ''}
            `}
            onClick={interactive ? () => handleSquareClick(squareNumber) : undefined}
            style={{
              aspectRatio: '1',
              backfaceVisibility: 'hidden'
            }}
          >
            {/* Front of card (Hidden State) */}
            {!isRevealed && (
              <div className="flex flex-col items-center justify-center w-full h-full">
                {sequenceNum && (
                  <div className="text-cyan-200 text-[clamp(20px,6vw,72px)] font-mono font-black opacity-90 drop-shadow-lg">
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
