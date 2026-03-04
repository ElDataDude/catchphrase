import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { QuizProvider } from '../contexts/QuizContext';
import { createQuestion, createQuiz } from '../lib/quizSchema';
import { getDisplaySnapshot, getQuiz, saveQuiz } from '../lib/quizStore';
import ControllerView from './ControllerView';
import DisplayView from './DisplayView';

const QuizView = () => {
  const { quizId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const viewMode = searchParams.get('view') || 'controller';
  const hostPeerId = searchParams.get('host');

  useEffect(() => {
    const load = async () => {
      const loadedQuiz = await getQuiz(quizId);

      if (!loadedQuiz) {
        if (viewMode === 'display') {
          const cached = getDisplaySnapshot(quizId);
          setQuiz(
            cached || {
              ...createQuiz({
                id: quizId,
                username: 'remote',
                name: 'Connecting...',
                questions: [createQuestion()],
                liveState: {
                  scene: 'question'
                }
              }),
              isPlaceholder: true
            }
          );
          setIsLoading(false);
          return;
        }
        setQuiz(null);
        setIsLoading(false);
        return;
      }

      if (viewMode !== 'display') {
        void saveQuiz({
          ...loadedQuiz,
          lastOpenedAt: new Date().toISOString()
        });
      }

      setQuiz(loadedQuiz);
      setIsLoading(false);
    };

    void load();
  }, [hostPeerId, navigate, quizId, viewMode]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="surface-strong p-6 w-full max-w-sm flex items-center gap-4">
          <div className="w-10 h-10 border-4 border-white/15 border-t-white/80 rounded-full animate-spin" />
          <div className="text-white font-extrabold">Loading quiz...</div>
        </div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="surface-strong p-6 w-full max-w-md text-center">
          <h1 className="text-white text-xl font-black mb-2">Quiz not found</h1>
          <p className="text-white/70 mb-6">
            This link expects the quiz to exist in this browser. Open the controller on this device or create a new quiz.
          </p>
          <button onClick={() => navigate('/')} className="w-full btn-primary py-3 px-6">
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <QuizProvider
      initialQuiz={quiz}
      role={viewMode === 'display' ? 'display' : 'controller'}
      hostPeerId={hostPeerId}
    >
      {viewMode === 'display' ? <DisplayView /> : <ControllerView />}
    </QuizProvider>
  );
};

export default QuizView;
