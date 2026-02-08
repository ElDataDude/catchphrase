import { useCallback } from 'react';
import { useQuiz } from '../contexts/QuizContext';
import { getRandomUnrevealedSquare, getNextSequenceSquare } from '../utils/quizHelpers';

export const useSquareReveal = () => {
  const { state, dispatch } = useQuiz();

  const currentQuestion = state.questions[state.currentQuestionIndex];

  const revealSquare = useCallback((squareNumber) => {
    if (currentQuestion.revealedSquares.includes(squareNumber)) return null;
    dispatch({ type: 'REVEAL_SQUARE', payload: squareNumber });
    return squareNumber;
  }, [currentQuestion, dispatch]);

  const revealRandomSquare = useCallback(() => {
    const randomSquare = getRandomUnrevealedSquare(currentQuestion);
    if (randomSquare) {
      return revealSquare(randomSquare);
    }
    return null;
  }, [currentQuestion, revealSquare]);

  const revealNextInSequence = useCallback(() => {
    const nextSquare = getNextSequenceSquare(currentQuestion);
    if (nextSquare) {
      return revealSquare(nextSquare);
    }
    return null;
  }, [currentQuestion, revealSquare]);

  const setRevealSequence = useCallback((sequence) => {
    dispatch({ type: 'SET_REVEAL_SEQUENCE', payload: sequence });
  }, [dispatch]);

  const resetCurrentQuestion = useCallback(() => {
    dispatch({ type: 'RESET_CURRENT_QUESTION' });
  }, [dispatch]);

  return {
    revealSquare,
    revealRandomSquare,
    revealNextInSequence,
    setRevealSequence,
    resetCurrentQuestion
  };
};
