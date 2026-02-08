import React from 'react';
import { useQuiz } from '../contexts/QuizContext';

const QuestionNavigator = () => {
  const { state, dispatch } = useQuiz();

  const { questions, currentQuestionIndex } = state;

  const goToPrevious = () => {
    if (currentQuestionIndex > 0) {
      dispatch({ type: 'SET_CURRENT_QUESTION', payload: currentQuestionIndex - 1 });
    }
  };

  const goToNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      dispatch({ type: 'SET_CURRENT_QUESTION', payload: currentQuestionIndex + 1 });
    }
  };

  if (questions.length === 0) return null;

  return (
    <div className="surface p-3">
      <div className="text-white text-center font-bold text-xs mb-2">
        Q {currentQuestionIndex + 1} / {questions.length}
      </div>

      <div className="flex gap-2">
        <button
          onClick={goToPrevious}
          disabled={currentQuestionIndex === 0}
          className="flex-1 btn-secondary disabled:opacity-40 disabled:cursor-not-allowed py-2 px-4 text-sm"
        >
          &lt;- Prev
        </button>

        <button
          onClick={goToNext}
          disabled={currentQuestionIndex === questions.length - 1}
          className="flex-1 btn-secondary disabled:opacity-40 disabled:cursor-not-allowed py-2 px-4 text-sm"
        >
          Next -&gt;
        </button>
      </div>
    </div>
  );
};

export default QuestionNavigator;
