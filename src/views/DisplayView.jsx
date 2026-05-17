import React, { useEffect } from 'react';
import LiveSceneStage from '../components/LiveSceneStage';
import StatusBadge from '../components/StatusBadge';
import { useQuiz } from '../contexts/QuizContext';
import { preloadQuestionMedia } from '../lib/mediaPreflight';

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

  const statusMessage = (() => {
    if (syncStatus === 'stale') return 'Relay has not confirmed a fresh update. Holding the last frame.';
    if (syncStatus === 'error') return 'Relay is unavailable. Keep this tab open and use cast or mirror as backup.';
    if (presence.controller === 0) return 'No controller heartbeat yet. Waiting without changing the frame.';
    return '';
  })();

  if (state.isPlaceholder) {
    return (
      <div className="display-shell">
        <div className="bg-white text-zinc-950 p-6 max-w-md w-[calc(100%-2rem)] text-center shadow-2xl">
          <h2 className="font-black text-2xl mb-3">Waiting for controller...</h2>
          <p className="text-zinc-700">
            Keep this display open. It will show the live frame after the controller sends a snapshot.
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

      {statusMessage && (
        <div className="display-status-banner" aria-live="polite">
          <div className="flex items-start gap-3">
            <StatusBadge status={syncStatus === 'live' ? 'stale' : syncStatus} />
            <div>{statusMessage}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DisplayView;
