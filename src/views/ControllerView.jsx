import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuiz } from '../contexts/QuizContext';
import ImageDisplay from '../components/ImageDisplay';
import VideoDisplay from '../components/VideoDisplay';
import GridOverlay from '../components/GridOverlay';
import ControlPanel from '../components/ControlPanel';
import ManualRevealPad from '../components/ManualRevealPad';
import QuestionNavigator from '../components/QuestionNavigator';
import SequenceBuilder from '../components/SequenceBuilder';
import TimerMode from '../components/TimerMode';
import ResetConfirm from '../components/ResetConfirm';
import { useSquareReveal } from '../hooks/useSquareReveal';
import { areAllSquaresRevealed, getNextSequenceSquare, getUnrevealedSquares } from '../utils/quizHelpers';

const ControllerView = () => {
  const { state, dispatch, presence, hostPeerId, syncStatus } = useQuiz();
  const { revealRandomSquare, revealNextInSequence, undoLastReveal, canUndo } = useSquareReveal();
  const navigate = useNavigate();
  const [resetModal, setResetModal] = useState({ isOpen: false, type: null });
  const [activeControl, setActiveControl] = useState('reveal');
  const [copyNotice, setCopyNotice] = useState('');
  const noticeTimerRef = useRef(null);

  const currentQuestion = state.questions[state.currentQuestionIndex];

  useEffect(() => () => {
    if (noticeTimerRef.current) {
      clearTimeout(noticeTimerRef.current);
    }
  }, []);

  const setFlashNotice = (message) => {
    setCopyNotice(message);
    if (noticeTimerRef.current) {
      clearTimeout(noticeTimerRef.current);
    }
    noticeTimerRef.current = setTimeout(() => {
      setCopyNotice('');
      noticeTimerRef.current = null;
    }, 1800);
  };

  const getDisplayUrl = () => {
    const url = new URL(`/quiz/${state.id}`, window.location.origin);
    url.searchParams.set('view', 'display');
    if (hostPeerId) {
      url.searchParams.set('host', hostPeerId);
    }
    return url.toString();
  };

  const handleResetQuestion = () => {
    setResetModal({ isOpen: true, type: 'question' });
  };

  const handleResetQuiz = () => {
    setResetModal({ isOpen: true, type: 'quiz' });
  };

  const confirmReset = () => {
    if (resetModal.type === 'question') {
      dispatch({ type: 'RESET_CURRENT_QUESTION' });
    } else if (resetModal.type === 'quiz') {
      dispatch({ type: 'RESET_ALL_QUESTIONS' });
    }
    setResetModal({ isOpen: false, type: null });
  };

  const openDisplayView = () => {
    window.open(getDisplayUrl(), '_blank', 'noopener,noreferrer');
  };

  const copyDisplayView = async () => {
    try {
      if (!navigator?.clipboard) throw new Error('clipboard_unavailable');
      await navigator.clipboard.writeText(getDisplayUrl());
      setFlashNotice('Display link copied');
    } catch {
      setFlashNotice('Copy failed');
    }
  };

  if (!currentQuestion) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-white text-center">
          <div className="text-2xl mb-4">No questions in this quiz</div>
          <button
            onClick={() => navigate('/')}
            className="btn-primary py-3 px-6"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const controls = [
    { id: 'reveal', label: 'Reveal' },
    { id: 'manual', label: 'Manual' },
    { id: 'sequence', label: 'Sequence' },
    { id: 'timer', label: 'Timer' }
  ];

  const displayConnected = (presence?.display || 0) > 0;
  const hasSequence = currentQuestion.revealSequence && currentQuestion.revealSequence.length > 0;
  const nextSequenceSquare = hasSequence ? getNextSequenceSquare(currentQuestion) : null;
  const unrevealedCount = getUnrevealedSquares(currentQuestion).length;
  const allRevealed = areAllSquaresRevealed(currentQuestion);
  const displayStatus =
    syncStatus === 'error'
      ? 'Realtime link error'
      : displayConnected
        ? 'Display connected'
        : syncStatus === 'connecting'
          ? 'Connecting display...'
          : 'Display waiting';

  const renderControlPanel = () => {
    if (activeControl === 'manual') return <ManualRevealPad />;
    if (activeControl === 'sequence') return <SequenceBuilder />;
    if (activeControl === 'timer') return <TimerMode />;
    return <ControlPanel onResetQuestion={handleResetQuestion} />;
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="bg-black/40 backdrop-blur-md border-b border-white/10 px-3 py-2 flex justify-between items-center">
        <div>
          <h1 className="text-white font-black text-sm tracking-wide">{state.name}</h1>
          <div className="text-[11px] text-white/60 flex items-center gap-1 min-h-[16px]">
            <span
              className={[
                'inline-block h-2 w-2 rounded-full',
                displayConnected ? 'bg-green-400' : syncStatus === 'error' ? 'bg-rose-400' : 'bg-white/20'
              ].join(' ')}
            />
            {copyNotice || displayStatus}
          </div>
        </div>
        <div className="flex gap-1">
          <button
            onClick={openDisplayView}
            className="btn-primary py-1 px-2 text-xs"
          >
            Display
          </button>
          <button
            onClick={copyDisplayView}
            className="btn-secondary py-1 px-2 text-xs"
          >
            Copy Link
          </button>
          <button
            onClick={() => navigate('/')}
            className="btn-secondary py-1 px-2 text-xs"
          >
            Exit
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 p-2 flex flex-col gap-2">
        <div className="surface overflow-hidden shrink-0" style={{ height: '145px' }}>
          <div className="relative w-full h-full">
            {currentQuestion.type === 'video' ? (
              <VideoDisplay url={currentQuestion.videoUrl} startTime={currentQuestion.startTime} />
            ) : (
              <ImageDisplay imageUrl={currentQuestion.imageUrl} />
            )}
            <GridOverlay interactive={true} showNumbers={true} />
          </div>
        </div>

        <div className="shrink-0">
          <QuestionNavigator />
        </div>

        <div className="surface p-2 shrink-0">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-white font-extrabold text-xs uppercase tracking-wide">Live</h2>
            <span className="text-[11px] text-white/60">
              {allRevealed ? 'All revealed' : `${unrevealedCount} left`}
            </span>
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={revealRandomSquare}
              disabled={allRevealed}
              className="flex-1 btn-primary disabled:opacity-40 disabled:cursor-not-allowed py-2 px-2 text-xs"
            >
              Random
            </button>
            {hasSequence && (
              <button
                type="button"
                onClick={revealNextInSequence}
                disabled={!nextSequenceSquare}
                className="flex-1 btn-secondary disabled:opacity-40 disabled:cursor-not-allowed py-2 px-2 text-xs"
              >
                Next Seq
              </button>
            )}
            <button
              type="button"
              onClick={undoLastReveal}
              disabled={!canUndo}
              className="flex-1 btn-secondary disabled:opacity-40 disabled:cursor-not-allowed py-2 px-2 text-xs"
            >
              Undo
            </button>
            <button
              type="button"
              onClick={handleResetQuestion}
              className="flex-1 btn-danger py-2 px-2 text-xs"
            >
              Reset Q
            </button>
          </div>
        </div>

        <div className="surface p-1 shrink-0">
          <div className="grid grid-cols-4 gap-1">
            {controls.map((control) => (
              <button
                key={control.id}
                type="button"
                onClick={() => setActiveControl(control.id)}
                className={[
                  'py-2 rounded-lg text-xs font-extrabold transition-colors',
                  activeControl === control.id
                    ? 'bg-cyan-200 text-black'
                    : 'bg-white/10 text-white/70 hover:bg-white/15'
                ].join(' ')}
              >
                {control.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto pb-1">
          {renderControlPanel()}
        </div>

        <div className="shrink-0">
          <button
            onClick={handleResetQuiz}
            className="w-full btn-danger py-2 px-4 text-sm"
          >
            Reset Quiz
          </button>
        </div>
      </div>

      <ResetConfirm
        isOpen={resetModal.isOpen}
        onConfirm={confirmReset}
        onCancel={() => setResetModal({ isOpen: false, type: null })}
        title={resetModal.type === 'question' ? 'Reset Question?' : 'Reset Entire Quiz?'}
        message={
          resetModal.type === 'question'
            ? 'This will reset all revealed squares for the current question.'
            : 'This will reset all questions and start from the beginning.'
        }
      />
    </div>
  );
};

export default ControllerView;
