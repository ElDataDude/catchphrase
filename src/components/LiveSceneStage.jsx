import React, { useEffect, useMemo, useState } from 'react';
import { buildQuestionLabel } from '../lib/quizSchema';
import GridOverlay from './GridOverlay';
import MediaStage from './MediaStage';

const useCountdownProgress = (timer) => {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!timer?.isRunning || !timer?.startedAt) return undefined;
    const intervalId = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(intervalId);
  }, [timer?.isRunning, timer?.startedAt]);

  if (!timer?.isRunning || !timer?.startedAt) return 0;
  const elapsed = now - Date.parse(timer.startedAt);
  return Math.max(0, Math.min(1, elapsed / timer.intervalMs));
};

const LiveSceneStage = ({
  quiz,
  question,
  scene,
  questionIndex,
  displayMode = false,
  interactive = false,
  onRevealSquare
}) => {
  const progress = useCountdownProgress(quiz.liveState.timer);
  const themeClass = `theme-${quiz.settings.theme}`;

  const roundLabel = question?.roundLabel || 'Catchphrase';
  const questionLabel = useMemo(() => buildQuestionLabel(question, questionIndex || 0), [question, questionIndex]);

  if (!question) {
    return (
      <div className={`h-full w-full stage-shell ${themeClass}`}>
        <div className="stage-empty">No question available</div>
      </div>
    );
  }

  if (scene === 'blank') {
    return (
      <div className={`h-full w-full stage-shell ${themeClass}`}>
        <div className="stage-empty text-2xl font-black tracking-[0.3em] uppercase">Blank</div>
      </div>
    );
  }

  if (scene === 'title') {
    return (
      <div className={`h-full w-full stage-shell ${themeClass}`}>
        <div className="absolute inset-0 opacity-35">
          <MediaStage media={question.media} alt={questionLabel} />
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.2),rgba(2,6,23,0.88))]" />
        <div className="relative h-full w-full flex items-end">
          <div className="stage-title-panel">
            <div className="stage-kicker">{roundLabel}</div>
            <h1 className="stage-title">{questionLabel}</h1>
            <div className="stage-meta">
              Question
              {' '}
              {questionIndex + 1}
              {' '}
              of
              {' '}
              {quiz.questions.length}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full w-full stage-shell ${themeClass}`}>
      <div className="absolute inset-0">
        <MediaStage media={question.media} alt={questionLabel} />
      </div>

      {scene === 'question' && (
        <GridOverlay
          question={question}
          interactive={interactive}
          showNumbers={!displayMode}
          onReveal={onRevealSquare}
          animation={quiz.settings.revealAnimation}
        />
      )}

      {scene === 'answer' && (
        <div className="absolute inset-0 flex items-end justify-start p-4 md:p-8 pointer-events-none">
          <div className="stage-answer-panel">
            <div className="stage-kicker">{roundLabel}</div>
            <div className="stage-answer">{question.answer || 'Answer not set'}</div>
            {question.category && <div className="stage-answer-meta">{question.category}</div>}
          </div>
        </div>
      )}

      {quiz.settings.showLowerThird && scene !== 'title' && (
        <div className="stage-lower-third">
          <div className="stage-kicker">{roundLabel}</div>
          <div className="stage-lower-title">{questionLabel}</div>
          <div className="stage-meta">
            {questionIndex + 1}
            {' '}
            /
            {' '}
            {quiz.questions.length}
          </div>
        </div>
      )}

      {quiz.liveState.timer.isRunning && scene === 'question' && (
        <div className="absolute left-0 right-0 bottom-0 h-2 bg-white/10">
          <div
            className="h-full bg-cyan-300 transition-[width] duration-150"
            style={{ width: `${Math.min(100, Math.round(progress * 100))}%` }}
          />
        </div>
      )}
    </div>
  );
};

export default LiveSceneStage;
