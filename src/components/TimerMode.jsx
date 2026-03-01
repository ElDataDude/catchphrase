import React from 'react';

const TimerMode = ({ timer, hasSequence, onSetInterval, onStart, onPause, onStop }) => {
  if (!timer) return null;

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
        <span className="text-white/60 text-xs uppercase tracking-[0.2em]">Auto reveal</span>
      </div>

      {!hasSequence && (
        <div className="bg-amber-500/15 text-amber-200 p-2 rounded-lg text-xs ring-1 ring-amber-200/20">
          Add a reveal sequence first. Timer mode uses that sequence before falling back to random reveals.
        </div>
      )}

      <div className="space-y-1">
        <div className="text-white/60 text-xs">Interval:</div>
        <div className="flex gap-2 flex-wrap">
          {presetIntervals.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => onSetInterval(value)}
              className={[
                'px-3 py-2 rounded-lg text-xs font-extrabold transition-colors ring-1',
                timer.intervalMs === value
                  ? 'bg-white text-black ring-white/20'
                  : 'bg-white/10 text-white/70 hover:bg-white/15 ring-white/15'
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        {!timer.isRunning ? (
          <button onClick={onStart} className="flex-1 btn-primary py-2 px-4 text-sm" disabled={!hasSequence}>
            Start
          </button>
        ) : (
          <>
            <button onClick={onPause} className="flex-1 btn-secondary py-2 px-4 text-sm">
              Pause
            </button>
            <button onClick={onStop} className="flex-1 btn-danger py-2 px-4 text-sm">
              Stop
            </button>
          </>
        )}
      </div>

      {timer.isRunning && (
        <div className="text-cyan-200 text-center animate-pulse text-xs font-bold">
          Running...
        </div>
      )}
    </div>
  );
};

export default TimerMode;
