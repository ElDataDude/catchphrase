import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DisplayJoinPanel from '../components/DisplayJoinPanel';
import LiveSceneStage from '../components/LiveSceneStage';
import ManualRevealPad from '../components/ManualRevealPad';
import PreflightPanel from '../components/PreflightPanel';
import QuestionDrawer from '../components/QuestionDrawer';
import QuestionNavigator from '../components/QuestionNavigator';
import ResetConfirm from '../components/ResetConfirm';
import SequenceBuilder from '../components/SequenceBuilder';
import StatusBadge from '../components/StatusBadge';
import TimerMode from '../components/TimerMode';
import { useQuiz } from '../contexts/QuizContext';
import { preloadQuestionMedia, probeQuestionMedia } from '../lib/mediaPreflight';
import {
  areAllSquaresRevealed,
  buildQuestionLabel,
  getNextSequenceSquare,
  getUnrevealedSquares
} from '../lib/quizSchema';

const tabs = [
  { id: 'reveal', label: 'Reveal' },
  { id: 'questions', label: 'Questions' },
  { id: 'preflight', label: 'Preflight' },
  { id: 'join', label: 'Join' },
  { id: 'timer', label: 'Timer' }
];

const ControllerView = () => {
  const navigate = useNavigate();
  const { state, presence, syncStatus, hostPeerId, actions } = useQuiz();
  const [activeTab, setActiveTab] = useState('reveal');
  const [copyMessage, setCopyMessage] = useState('');
  const [isPreflighting, setIsPreflighting] = useState(false);
  const [resetTarget, setResetTarget] = useState(null);
  const copyTimeoutRef = useRef(null);

  const currentIndex = state.liveState.currentQuestionIndex;
  const currentQuestion = state.questions[currentIndex];
  const nextQuestion = state.questions[currentIndex + 1] || null;
  const nextSequenceSquare = getNextSequenceSquare(currentQuestion);
  const unrevealedCount = getUnrevealedSquares(currentQuestion).length;
  const canUndo = currentQuestion.reveal.revealHistory.length > 0;
  const allRevealed = areAllSquaresRevealed(currentQuestion);
  const displayUrl = useMemo(() => {
    const url = new URL(`/quiz/${state.id}`, window.location.origin);
    url.searchParams.set('view', 'display');
    if (hostPeerId) url.searchParams.set('host', hostPeerId);
    return url.toString();
  }, [hostPeerId, state.id]);

  useEffect(() => {
    void preloadQuestionMedia(currentQuestion);
    if (nextQuestion) {
      void preloadQuestionMedia(nextQuestion);
    }
  }, [currentQuestion, nextQuestion]);

  useEffect(() => () => {
    if (copyTimeoutRef.current) window.clearTimeout(copyTimeoutRef.current);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      const target = event.target;
      if (target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

      if (event.code === 'Space' || event.key.toLowerCase() === 'n') {
        event.preventDefault();
        actions.advanceReveal();
      }
      if (event.key.toLowerCase() === 'u') {
        event.preventDefault();
        actions.undoLastReveal();
      }
      if (event.key.toLowerCase() === 'a') {
        event.preventDefault();
        actions.setScene('answer');
      }
      if (event.key.toLowerCase() === 'b') {
        event.preventDefault();
        actions.setScene('blank');
      }
      if (event.key.toLowerCase() === 'r') {
        event.preventDefault();
        setResetTarget('question');
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        actions.nextQuestion();
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        actions.previousQuestion();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [actions]);

  const flashCopyMessage = (message) => {
    setCopyMessage(message);
    if (copyTimeoutRef.current) window.clearTimeout(copyTimeoutRef.current);
    copyTimeoutRef.current = window.setTimeout(() => setCopyMessage(''), 1800);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(displayUrl);
      flashCopyMessage('Display link copied');
    } catch {
      flashCopyMessage('Copy failed');
    }
  };

  const handleOpenDisplay = () => {
    window.open(displayUrl, '_blank', 'noopener,noreferrer');
  };

  const runPreflight = async (allQuestions = false) => {
    setIsPreflighting(true);
    const indices = allQuestions
      ? state.questions.map((_, index) => index)
      : [currentIndex, currentIndex + 1, currentIndex + 2].filter((index) => index < state.questions.length);

    for (const index of indices) {
      const assetStatus = await probeQuestionMedia(state.questions[index]);
      actions.applyAssetStatus(index, assetStatus);
    }

    setIsPreflighting(false);
  };

  const confirmReset = () => {
    if (resetTarget === 'question') actions.resetCurrentQuestion();
    if (resetTarget === 'quiz') actions.resetQuiz();
    setResetTarget(null);
  };

  if (!currentQuestion) {
    return (
      <div className="page-shell">
        <div className="surface-strong p-6 text-center space-y-4">
          <div className="text-white font-black text-2xl">No questions available</div>
          <button type="button" className="btn-primary px-4 py-3 text-sm" onClick={() => navigate('/library')}>
            Back to Library
          </button>
        </div>
      </div>
    );
  }

  const renderTab = () => {
    if (activeTab === 'questions') {
      return (
        <QuestionDrawer
          questions={state.questions}
          currentIndex={currentIndex}
          onJump={(index) => actions.jumpToQuestion(index)}
        />
      );
    }

    if (activeTab === 'preflight') {
      return (
        <PreflightPanel
          questions={state.questions}
          currentIndex={currentIndex}
          onRunNear={() => void runPreflight(false)}
          onRunAll={() => void runPreflight(true)}
          isRunning={isPreflighting}
        />
      );
    }

    if (activeTab === 'join') {
      return (
        <DisplayJoinPanel
          link={displayUrl}
          syncStatus={syncStatus}
          displayCount={presence.display}
          onCopy={() => void handleCopyLink()}
          onOpen={handleOpenDisplay}
        />
      );
    }

    if (activeTab === 'timer') {
      return (
        <TimerMode
          timer={state.liveState.timer}
          hasSequence={Boolean(currentQuestion.reveal.sequence?.length)}
          onSetInterval={actions.setTimerInterval}
          onStart={actions.startTimer}
          onPause={actions.pauseTimer}
          onStop={actions.stopTimer}
        />
      );
    }

    return (
      <div className="space-y-4">
        <ManualRevealPad question={currentQuestion} onReveal={actions.revealSquare} />
        <SequenceBuilder question={currentQuestion} onSaveSequence={(sequence) => actions.setRevealSequence(currentIndex, sequence)} />
      </div>
    );
  };

  return (
    <div className="page-shell space-y-4">
      <div className="surface-strong p-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-white/50 uppercase tracking-[0.2em] text-xs">{state.username}</div>
          <h1 className="text-white font-black text-2xl">{state.name}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <StatusBadge status={syncStatus} />
            <span className="text-white/55 text-sm">
              Displays:
              {' '}
              {presence.display}
            </span>
            <span className="text-white/55 text-sm">
              Scene:
              {' '}
              {state.liveState.scene}
            </span>
            {copyMessage && <span className="text-cyan-200 text-sm">{copyMessage}</span>}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary px-4 py-3 text-sm" onClick={() => actions.setScene('title')}>
            Title Scene
          </button>
          <button type="button" className="btn-secondary px-4 py-3 text-sm" onClick={() => navigate(`/quiz/${state.id}/edit`)}>
            Edit Quiz
          </button>
          <button type="button" className="btn-secondary px-4 py-3 text-sm" onClick={() => navigate('/library')}>
            Exit
          </button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.3fr,0.9fr]">
        <div className="space-y-4">
          <div className="surface-strong p-4 space-y-4">
            <div className="aspect-video rounded-[28px] overflow-hidden ring-1 ring-white/10">
              <LiveSceneStage
                quiz={state}
                question={currentQuestion}
                scene={state.liveState.scene}
                questionIndex={currentIndex}
                interactive={state.liveState.scene === 'question'}
                onRevealSquare={actions.revealSquare}
              />
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="surface-soft rounded-2xl p-3">
                <div className="text-white/50 text-xs uppercase tracking-[0.2em]">Current</div>
                <div className="text-white font-bold">{buildQuestionLabel(currentQuestion, currentIndex)}</div>
              </div>
              <div className="surface-soft rounded-2xl p-3">
                <div className="text-white/50 text-xs uppercase tracking-[0.2em]">Reveal</div>
                <div className="text-white font-bold">{allRevealed ? 'All revealed' : `${unrevealedCount} hidden`}</div>
              </div>
              <div className="surface-soft rounded-2xl p-3">
                <div className="text-white/50 text-xs uppercase tracking-[0.2em]">Sequence</div>
                <div className="text-white font-bold">{nextSequenceSquare || 'None queued'}</div>
              </div>
            </div>
          </div>

          <div className="surface-strong p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-white font-black text-base">Live Rail</div>
                <div className="text-white/60 text-sm">Keyboard shortcuts: Space / N, U, A, B, arrows, R.</div>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              <button type="button" className="btn-primary py-3 px-4 text-sm" onClick={actions.revealRandom} disabled={allRevealed}>
                Random
              </button>
              <button type="button" className="btn-primary py-3 px-4 text-sm" onClick={actions.advanceReveal} disabled={allRevealed && state.liveState.scene === 'question'}>
                Next
              </button>
              <button type="button" className="btn-secondary py-3 px-4 text-sm" onClick={actions.undoLastReveal} disabled={!canUndo}>
                Undo
              </button>
              <button type="button" className="btn-secondary py-3 px-4 text-sm" onClick={() => actions.setScene('answer')}>
                Answer
              </button>
              <button type="button" className="btn-secondary py-3 px-4 text-sm" onClick={() => actions.setScene('blank')}>
                Blank
              </button>
              <button type="button" className="btn-secondary py-3 px-4 text-sm" onClick={actions.nextQuestion} disabled={currentIndex === state.questions.length - 1}>
                Next Question
              </button>
            </div>
          </div>

          <QuestionNavigator
            questions={state.questions}
            currentQuestionIndex={currentIndex}
            onPrevious={actions.previousQuestion}
            onNext={actions.nextQuestion}
            onJump={actions.jumpToQuestion}
          />
        </div>

        <div className="space-y-4">
          <div className="surface-strong p-3">
            <div className="grid grid-cols-5 gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-2xl py-3 px-3 text-xs font-black transition ${activeTab === tab.id ? 'bg-cyan-300 text-slate-950' : 'bg-white/8 text-white hover:bg-white/14'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {renderTab()}

          <div className="surface-strong p-4 flex flex-wrap gap-2">
            <button type="button" className="btn-danger px-4 py-3 text-sm" onClick={() => setResetTarget('question')}>
              Reset Question
            </button>
            <button type="button" className="btn-danger px-4 py-3 text-sm" onClick={() => setResetTarget('quiz')}>
              Reset Quiz
            </button>
            <button type="button" className="btn-secondary px-4 py-3 text-sm" onClick={() => void handleCopyLink()}>
              Copy Display Link
            </button>
            <button type="button" className="btn-secondary px-4 py-3 text-sm" onClick={handleOpenDisplay}>
              Open Display
            </button>
          </div>
        </div>
      </div>

      <ResetConfirm
        isOpen={Boolean(resetTarget)}
        onConfirm={confirmReset}
        onCancel={() => setResetTarget(null)}
        title={resetTarget === 'quiz' ? 'Reset the entire quiz?' : 'Reset this question?'}
        message={
          resetTarget === 'quiz'
            ? 'This clears all revealed squares and returns the session to Question 1.'
            : 'This clears all revealed squares for the current question.'
        }
      />
    </div>
  );
};

export default ControllerView;
