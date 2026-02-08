import { useEffect, useCallback } from 'react';
import { useQuiz } from '../contexts/QuizContext';
import { useSquareReveal } from './useSquareReveal';

export const useTimer = () => {
  const { state, dispatch } = useQuiz();
  const { revealNextInSequence } = useSquareReveal();

  const currentQuestion = state.questions[state.currentQuestionIndex];
  const timerMode = currentQuestion?.timerMode;

  const startTimer = useCallback(() => {
    dispatch({
      type: 'UPDATE_TIMER_MODE',
      payload: { isRunning: true }
    });
  }, [dispatch]);

  const pauseTimer = useCallback(() => {
    dispatch({
      type: 'UPDATE_TIMER_MODE',
      payload: { isRunning: false }
    });
  }, [dispatch]);

  const stopTimer = useCallback(() => {
    dispatch({
      type: 'UPDATE_TIMER_MODE',
      payload: { isRunning: false, currentSquare: 0 }
    });
  }, [dispatch]);

  const setTimerInterval = useCallback((interval) => {
    dispatch({
      type: 'UPDATE_TIMER_MODE',
      payload: { interval }
    });
  }, [dispatch]);

  const toggleTimerMode = useCallback(() => {
    dispatch({
      type: 'UPDATE_TIMER_MODE',
      payload: timerMode.enabled ? { enabled: false, isRunning: false } : { enabled: true }
    });
  }, [dispatch, timerMode]);

  // Auto-reveal effect
  useEffect(() => {
    if (!timerMode?.enabled || !timerMode?.isRunning) return;

    const intervalId = setInterval(() => {
      const revealed = revealNextInSequence();
      if (!revealed) {
        dispatch({
          type: 'UPDATE_TIMER_MODE',
          payload: { isRunning: false }
        });
      }
    }, timerMode.interval);

    return () => clearInterval(intervalId);
  }, [timerMode, revealNextInSequence, dispatch]);

  return {
    timerMode,
    startTimer,
    pauseTimer,
    stopTimer,
    setTimerInterval,
    toggleTimerMode
  };
};
