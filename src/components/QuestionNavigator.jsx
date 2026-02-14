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

  const jumpToQuestion = (index) => {
    if (index === currentQuestionIndex) return;
    dispatch({ type: 'SET_CURRENT_QUESTION', payload: index });
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

      <div className="mt-2 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {questions.map((question, index) => {
            const isCurrent = index === currentQuestionIndex;
            const revealedCount = question.revealedSquares?.length || 0;
            return (
              <button
                key={question.id || index}
                type="button"
                onClick={() => jumpToQuestion(index)}
                className={[
                  'px-2 py-1 rounded-lg text-xs font-extrabold transition-colors ring-1',
                  isCurrent
                    ? 'bg-cyan-200 text-black ring-white/10'
                    : 'bg-white/10 text-white/70 hover:bg-white/15 ring-white/15'
                ].join(' ')}
                title={`Question ${index + 1} (${revealedCount}/9 revealed)`}
              >
                {index + 1}
                <span className="ml-1 text-[10px] opacity-70">{revealedCount}/9</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default QuestionNavigator;
