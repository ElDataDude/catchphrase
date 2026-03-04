import React, { useEffect } from 'react';
import LiveSceneStage from '../components/LiveSceneStage';
import StatusBadge from '../components/StatusBadge';
import { useQuiz } from '../contexts/QuizContext';
import { preloadQuestionMedia } from '../lib/mediaPreflight';
import { buildQuestionLabel } from '../lib/quizSchema';

const DisplayView = () => {
  const { state, presence, syncStatus } = useQuiz();
  const currentIndex = state.liveState.currentQuestionIndex;
  const currentQuestion = state.questions[currentIndex];
  const nextQuestion = state.questions[currentIndex + 1];

  useEffect(() => {
    if (currentQuestion) {
      void preloadQuestionMedia(currentQuestion);
    }
    if (nextQuestion) {
      void preloadQuestionMedia(nextQuestion);
    }
  }, [currentQuestion, nextQuestion]);

  if (state.isPlaceholder && !currentQuestion) {
    return (
      <div className="display-shell">
        <div className="surface-strong p-8 max-w-md w-full text-center">
          <h2 className="text-white font-black text-3xl mb-3">Waiting for controller…</h2>
          <p className="text-white/65">
            Keep this display open. It will attach to the controller automatically when a live snapshot arrives.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="display-shell">
      <div className="display-stage">
        <LiveSceneStage
          quiz={state}
          question={currentQuestion}
          scene={state.liveState.scene}
          questionIndex={currentIndex}
          displayMode
        />
      </div>

      <div className="display-topbar">
        <div>
          <div className="text-white/55 text-xs uppercase tracking-[0.3em]">{state.name}</div>
          <div className="text-white font-bold text-lg">{buildQuestionLabel(currentQuestion, currentIndex)}</div>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={syncStatus} />
          <div className="text-white/65 text-sm">
            Q
            {' '}
            {currentIndex + 1}
            {' '}
            /
            {' '}
            {state.questions.length}
          </div>
        </div>
      </div>

      {(presence.controller === 0 || syncStatus === 'stale' || syncStatus === 'error') && (
        <div className="display-status-banner">
          {syncStatus === 'stale'
            ? 'Signal stale. Holding the last good frame.'
            : syncStatus === 'error'
              ? 'Display relay offline. Keep this screen open and cast locally if needed.'
              : 'Waiting for controller heartbeat…'}
        </div>
      )}
    </div>
  );
};

export default DisplayView;
