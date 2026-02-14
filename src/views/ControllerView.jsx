import React, { useState } from 'react';
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

const ControllerView = () => {
  const { state, dispatch, presence, hostPeerId, syncStatus } = useQuiz();
  const navigate = useNavigate();
  const [resetModal, setResetModal] = useState({ isOpen: false, type: null });
  const [activeControl, setActiveControl] = useState('reveal');

  const currentQuestion = state.questions[state.currentQuestionIndex];

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
    const url = new URL(`/quiz/${state.id}`, window.location.origin);
    url.searchParams.set('view', 'display');
    if (hostPeerId) {
      url.searchParams.set('host', hostPeerId);
    }
    window.open(url.toString(), '_blank', 'noopener,noreferrer');
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
          <div className="text-[11px] text-white/60 flex items-center gap-1">
            <span
              className={[
                'inline-block h-2 w-2 rounded-full',
                displayConnected ? 'bg-green-400' : syncStatus === 'error' ? 'bg-rose-400' : 'bg-white/20'
              ].join(' ')}
            />
            {displayStatus}
          </div>
        </div>
        <div className="flex gap-1">
          <button
            onClick={openDisplayView}
            className="btn-primary py-1 px-3 text-xs"
          >
            Display
          </button>
          <button
            onClick={() => navigate('/')}
            className="btn-secondary py-1 px-3 text-xs"
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
