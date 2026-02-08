import React from 'react';
import { useSquareReveal } from '../hooks/useSquareReveal';
import { useQuiz } from '../contexts/QuizContext';
import { getUnrevealedSquares, areAllSquaresRevealed, getNextSequenceSquare } from '../utils/quizHelpers';

const ControlPanel = ({ onResetQuestion }) => {
  const { state } = useQuiz();
  const { revealRandomSquare, revealNextInSequence } = useSquareReveal();

  const currentQuestion = state.questions[state.currentQuestionIndex];

  if (!currentQuestion) return null;

  const hasSequence = currentQuestion.revealSequence && currentQuestion.revealSequence.length > 0;
  const nextInSequence = hasSequence ? getNextSequenceSquare(currentQuestion) : null;
  const unrevealedCount = getUnrevealedSquares(currentQuestion).length;
  const allRevealed = areAllSquaresRevealed(currentQuestion);

  return (
    <div className="surface p-3 space-y-2">
      <div className="flex justify-between items-center mb-1">
        <h3 className="text-white font-bold text-sm">Reveal</h3>
        <span className="text-white/60 text-xs">{unrevealedCount} left</span>
      </div>

      <button
        onClick={revealRandomSquare}
        disabled={allRevealed}
        className="w-full btn-primary disabled:opacity-40 disabled:cursor-not-allowed py-2 px-4 text-sm"
      >
        Random
      </button>

      {hasSequence && (
        <button
          onClick={revealNextInSequence}
          disabled={allRevealed || !nextInSequence}
          className="w-full btn-secondary disabled:opacity-40 disabled:cursor-not-allowed py-2 px-4 text-sm"
        >
          Next in Sequence
        </button>
      )}

      <button
        onClick={onResetQuestion}
        className="w-full btn-danger py-2 px-4 text-xs"
      >
        Reset Question
      </button>
    </div>
  );
};

export default ControlPanel;
