import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllQuizzesForUser } from '../utils/storage';

const LoadView = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [quizzes, setQuizzes] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = () => {
    if (!username.trim()) {
      setError('Username is required.');
      return;
    }

    setError('');
    const userQuizzes = getAllQuizzesForUser(username.trim());
    setQuizzes(userQuizzes);
    setHasSearched(true);
  };

  const handleLoadQuiz = (quizId) => {
    navigate(`/quiz/${quizId}?view=controller`);
  };

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-2xl mx-auto">
        <div className="surface-strong p-6 mb-6">
          <h1 className="text-3xl font-black tracking-tight mb-2 bg-gradient-to-r from-white via-cyan-100 to-amber-100 bg-clip-text text-transparent">
            Load Existing Quiz
          </h1>
          <p className="text-white/70">Enter your username to find your quizzes.</p>
        </div>

        <div className="surface-strong p-6 space-y-4">
          <div className="flex gap-2">
            <label htmlFor="load-username" className="sr-only">Username</label>
            <input
              id="load-username"
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError('');
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Enter username"
              className="flex-1 field"
            />
            <button
              onClick={handleSearch}
              className="btn-primary py-3 px-6"
            >
              Search
            </button>
          </div>

          {error && (
            <div className="text-rose-200 text-xs mt-1">{error}</div>
          )}

          {hasSearched && (
            <div className="pt-4">
              {quizzes.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-white/70 text-lg mb-4">No quizzes found for "{username}"</div>
                  <button
                    onClick={() => navigate('/setup')}
                    className="btn-secondary py-3 px-6"
                  >
                    Create New Quiz
                  </button>
                </div>
              ) : (
                <>
                  <h3 className="text-white font-bold text-lg mb-3">
                    Found {quizzes.length} quiz{quizzes.length !== 1 ? 'zes' : ''}:
                  </h3>
                  <div className="space-y-2">
                    {quizzes.map((quiz) => (
                      <div
                        key={quiz.id}
                        className="surface p-4 flex justify-between items-center hover:bg-white/5 transition-colors"
                      >
                        <div>
                          <div className="text-white font-bold">{quiz.name}</div>
                          <div className="text-white/60 text-sm">
                            {quiz.questions.length} question{quiz.questions.length !== 1 ? 's' : ''} -{' '}
                            Created {new Date(quiz.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <button
                          onClick={() => handleLoadQuiz(quiz.id)}
                          className="btn-primary py-2 px-6"
                        >
                          Load
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          <div className="pt-4 border-t border-white/10">
            <button
              onClick={() => navigate('/')}
              className="w-full btn-secondary py-3 px-6"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadView;
