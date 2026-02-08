import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createEmptyQuiz, createEmptyQuestion } from '../utils/quizHelpers';
import { saveQuiz } from '../utils/storage';

const SetupView = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [quizName, setQuizName] = useState('');
  const [questions, setQuestions] = useState([{ type: 'image', imageUrl: '', videoUrl: '', startTime: 0 }]);

  const handleAddQuestion = () => {
    setQuestions([...questions, { type: 'image', imageUrl: '', videoUrl: '', startTime: 0 }]);
  };

  const handleRemoveQuestion = (index) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleQuestionChange = (index, field, value) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const handleCreateQuiz = () => {
    if (!username.trim()) {
      alert('Please enter a username');
      return;
    }

    if (!quizName.trim()) {
      alert('Please enter a quiz name');
      return;
    }

    const validQuestions = questions.filter(q => {
      if (q.type === 'video') return q.videoUrl.trim() !== '';
      return q.imageUrl.trim() !== '';
    });

    if (validQuestions.length === 0) {
      alert('Please add at least one question with valid content');
      return;
    }

    const quiz = createEmptyQuiz(username.trim(), quizName.trim());
    quiz.questions = validQuestions.map(q =>
      createEmptyQuestion(q.imageUrl.trim(), q.type, q.videoUrl.trim(), q.startTime)
    );

    saveQuiz(quiz);
    navigate(`/quiz/${quiz.id}?view=controller`);
  };

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-2xl mx-auto">
        <div className="surface-strong p-6 mb-6">
          <h1 className="text-3xl font-black tracking-tight mb-2 bg-gradient-to-r from-white via-cyan-100 to-amber-100 bg-clip-text text-transparent">
            Create New Quiz
          </h1>
          <p className="text-white/70">Set up your questions and start revealing squares.</p>
        </div>

        <div className="surface-strong p-6 space-y-6">
          <div>
            <label className="block text-white font-bold mb-2">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              className="field"
            />
          </div>

          <div>
            <label className="block text-white font-bold mb-2">Quiz Name</label>
            <input
              type="text"
              value={quizName}
              onChange={(e) => setQuizName(e.target.value)}
              placeholder="e.g., Christmas Quiz 2025"
              className="field"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="block text-white font-bold">Questions</label>
              <button
                onClick={handleAddQuestion}
                className="btn-secondary px-4 py-2 text-sm"
              >
                + Add Question
              </button>
            </div>

            <div className="space-y-4">
              {questions.map((question, index) => (
                <div key={index} className="surface p-4">
                  <div className="flex justify-between mb-3">
                    <span className="text-white/70 text-sm font-extrabold tracking-wide">
                      Question {index + 1}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleQuestionChange(index, 'type', 'image')}
                        className={[
                          'px-3 py-1 rounded-lg text-sm font-extrabold transition-colors',
                          question.type === 'image'
                            ? 'bg-cyan-200 text-black'
                            : 'bg-white/10 text-white/70 hover:bg-white/15'
                        ].join(' ')}
                      >
                        Image
                      </button>
                      <button
                        onClick={() => handleQuestionChange(index, 'type', 'video')}
                        className={[
                          'px-3 py-1 rounded-lg text-sm font-extrabold transition-colors',
                          question.type === 'video'
                            ? 'bg-cyan-200 text-black'
                            : 'bg-white/10 text-white/70 hover:bg-white/15'
                        ].join(' ')}
                      >
                        Video
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <div className="flex-1 space-y-2">
                      {question.type === 'image' ? (
                        <input
                          type="text"
                          value={question.imageUrl}
                          onChange={(e) => handleQuestionChange(index, 'imageUrl', e.target.value)}
                          placeholder="Image URL"
                          className="field"
                        />
                      ) : (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={question.videoUrl}
                            onChange={(e) => handleQuestionChange(index, 'videoUrl', e.target.value)}
                            placeholder="YouTube or MP4 URL"
                            className="flex-1 field"
                          />
                          <div className="w-24">
                            <input
                              type="number"
                              value={question.startTime}
                              onChange={(e) => handleQuestionChange(index, 'startTime', e.target.value)}
                              placeholder="Start (s)"
                              className="field"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {questions.length > 1 && (
                      <button
                        onClick={() => handleRemoveQuestion(index)}
                        className="btn-danger px-4 py-3 h-12"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={() => navigate('/')}
              className="flex-1 btn-secondary py-3 px-6"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateQuiz}
              className="flex-1 btn-primary py-3 px-6"
            >
              Create Quiz
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetupView;
