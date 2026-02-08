import React from 'react';
import { useQuiz } from '../contexts/QuizContext';
import ImageDisplay from '../components/ImageDisplay';
import VideoDisplay from '../components/VideoDisplay';
import GridOverlay from '../components/GridOverlay';

const DisplayView = () => {
  const { state, presence } = useQuiz();

  const currentQuestion = state.questions[state.currentQuestionIndex];

  if (!currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="surface-strong p-6 text-center">
          <div className="text-white text-2xl font-black">No questions available</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-black overflow-hidden landscape:block relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-cyan-500/15 via-black to-black" />

      <div className="relative w-full h-full flex items-center justify-center p-8">
        <div className="relative w-full max-w-[120vh] aspect-square shadow-2xl rounded-xl overflow-hidden ring-1 ring-white/10">
          {currentQuestion.type === 'video' ? (
            <VideoDisplay
              url={currentQuestion.videoUrl}
              startTime={currentQuestion.startTime}
            />
          ) : (
            <ImageDisplay imageUrl={currentQuestion.imageUrl} />
          )}
          <GridOverlay showNumbers={false} />
        </div>

        <div className="absolute top-6 right-8 bg-black/60 backdrop-blur-md text-white/80 px-6 py-3 rounded-full text-sm font-medium tracking-wide border border-white/10 uppercase">
          Question {state.currentQuestionIndex + 1} <span className="text-white/40 mx-2">|</span> {state.questions.length}
        </div>

        {presence?.controller === 0 && (
          <div className="absolute bottom-6 left-8 bg-black/50 backdrop-blur-md text-white/70 px-4 py-2 rounded-full text-xs font-medium tracking-wide border border-white/10 uppercase">
            Waiting for controller...
          </div>
        )}
      </div>
    </div>
  );
};

export default DisplayView;
