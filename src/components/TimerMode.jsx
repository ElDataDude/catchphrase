import React from 'react';
import { useTimer } from '../hooks/useTimer';
import { useQuiz } from '../contexts/QuizContext';

const TimerMode = () => {
  const { state } = useQuiz();
  const { timerMode, startTimer, pauseTimer, stopTimer, setTimerInterval, toggleTimerMode } = useTimer();

  const currentQuestion = state.questions[state.currentQuestionIndex];

  if (!currentQuestion) return null;

  const hasSequence = currentQuestion.revealSequence && currentQuestion.revealSequence.length > 0;

  const presetIntervals = [
    { label: '3s', value: 3000 },
    { label: '5s', value: 5000 },
    { label: '10s', value: 10000 },
    { label: '15s', value: 15000 },
    { label: '30s', value: 30000 }
  ];

  return (
    <div className="surface p-3 space-y-2">
      <div className="flex justify-between items-center">
        <h3 className="text-white font-bold text-sm">Timer</h3>
        <button
          onClick={toggleTimerMode}
          className={[
            'px-3 py-1 rounded-lg text-xs font-extrabold transition-colors ring-1',
            timerMode.enabled
              ? 'bg-cyan-200 text-black ring-white/10'
              : 'bg-white/10 text-white/60 ring-white/15 hover:bg-white/15'
          ].join(' ')}
        >
          {timerMode.enabled ? 'ON' : 'OFF'}
        </button>
      </div>

      {timerMode.enabled && (
        <>
          {!hasSequence && (
            <div className="bg-amber-500/15 text-amber-200 p-2 rounded-lg text-xs ring-1 ring-amber-200/20">
              Set sequence first
            </div>
          )}

          <div className="space-y-1">
            <div className="text-white/60 text-xs">Interval:</div>
            <div className="flex gap-2">
              {presetIntervals.map(({ label, value }) => (
                <button
                  key={value}
                  onClick={() => setTimerInterval(value)}
                  className={[
                    'flex-1 py-1 rounded-lg text-xs font-extrabold transition-colors ring-1',
                    timerMode.interval === value
                      ? 'bg-white text-black ring-white/20'
                      : 'bg-white/10 text-white/70 hover:bg-white/15 ring-white/15'
                  ].join(' ')}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {hasSequence && (
            <div className="flex gap-2">
              {!timerMode.isRunning ? (
                <button
                  onClick={startTimer}
                  className="flex-1 btn-primary py-2 px-4 text-sm"
                >
                  Start
                </button>
              ) : (
                <>
                  <button
                    onClick={pauseTimer}
                    className="flex-1 btn-secondary py-2 px-4 text-sm"
                  >
                    Pause
                  </button>
                  <button
                    onClick={stopTimer}
                    className="flex-1 btn-danger py-2 px-4 text-sm"
                  >
                    Stop
                  </button>
                </>
              )}
            </div>
          )}

          {timerMode.isRunning && (
            <div className="text-cyan-200 text-center animate-pulse text-xs font-bold">
              Running...
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TimerMode;
