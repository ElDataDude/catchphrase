import React from 'react';
import { useNavigate } from 'react-router-dom';

const HomeView = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-black tracking-tight mb-3 bg-gradient-to-r from-cyan-200 via-white to-amber-200 bg-clip-text text-transparent">
            Catchphrase
          </h1>
          <p className="text-white/70 text-lg">
            Quiz control + big-screen display
          </p>
        </div>

        <div className="surface-strong p-6 space-y-4">
          <button
            onClick={() => navigate('/setup')}
            className="w-full btn-primary py-4 text-lg"
          >
            Create New Quiz
          </button>

          <button
            onClick={() => navigate('/load')}
            className="w-full btn-secondary py-4 text-lg"
          >
            Load Existing Quiz
          </button>
        </div>

        <div className="mt-8 text-center text-white/50 text-sm">
          <p>Reveal the picture one square at a time.</p>
          <p className="mt-2">Built for quiz nights, casting, and chaos.</p>
        </div>
      </div>
    </div>
  );
};

export default HomeView;
