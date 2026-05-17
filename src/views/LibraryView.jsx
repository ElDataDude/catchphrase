import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  deleteQuiz,
  downloadQuizBundle,
  duplicateQuizById,
  getProfiles,
  listQuizzes
} from '../lib/quizStore';

const triggerDownload = (filename, contents) => {
  const blob = new Blob([contents], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

const LibraryView = () => {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState('all');

  const refresh = async () => {
    const [nextQuizzes, nextProfiles] = await Promise.all([listQuizzes(), getProfiles()]);
    setQuizzes(nextQuizzes);
    setProfiles(nextProfiles);
  };

  useEffect(() => {
    void refresh();
  }, []);

  const filteredQuizzes = useMemo(
    () => (selectedProfile === 'all' ? quizzes : quizzes.filter((quiz) => quiz.username === selectedProfile)),
    [quizzes, selectedProfile]
  );

  const handleDuplicate = async (quizId) => {
    const duplicated = await duplicateQuizById(quizId);
    if (duplicated) {
      await refresh();
      navigate(`/quiz/${duplicated.id}/edit`);
    }
  };

  const handleExport = async (quiz) => {
    const bundle = await downloadQuizBundle(quiz.id);
    triggerDownload(`${quiz.name.replace(/\s+/g, '-').toLowerCase() || 'catchphrase-quiz'}.json`, bundle);
  };

  const handleDelete = async (quiz) => {
    const confirmed = window.confirm(`Delete "${quiz.name}"? This removes the local quiz and its autosave snapshot.`);
    if (!confirmed) return;
    await deleteQuiz(quiz.id);
    await refresh();
  };

  return (
    <div className="page-shell space-y-4">
      <div className="surface-strong p-4 md:p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-white/50 uppercase tracking-[0.18em] text-xs">Library</div>
          <h1 className="text-white font-black text-2xl md:text-3xl">Local Quiz Library</h1>
          <p className="text-white/65 text-sm md:text-base">Sorted by most recently opened. Launch, edit, export, or duplicate without leaving this screen.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <button type="button" className="btn-secondary px-4 py-3 text-sm" onClick={() => navigate('/')}>
            Dashboard
          </button>
          <button type="button" className="btn-primary px-4 py-3 text-sm" onClick={() => navigate('/quiz/new')}>
            New Quiz
          </button>
        </div>
      </div>

      <div className="surface-strong p-4 md:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-white font-bold">Profiles</div>
            <div className="text-white/55 text-sm">
              Showing
              {' '}
              {filteredQuizzes.length}
              {' '}
              of
              {' '}
              {quizzes.length}
              {' '}
              quizzes
            </div>
          </div>
          <select className="field max-w-[220px]" value={selectedProfile} onChange={(event) => setSelectedProfile(event.target.value)}>
            <option value="all">All profiles</option>
            {profiles.map((profile) => (
              <option key={profile} value={profile}>
                {profile}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-3">
          {filteredQuizzes.length === 0 && (
            <div className="surface-soft rounded-lg p-4 text-white/65">No quizzes match this filter.</div>
          )}

          {filteredQuizzes.map((quiz) => (
            <div key={quiz.id} className="surface-soft rounded-lg p-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="text-white font-bold text-lg">{quiz.name}</div>
                  <div className="text-white/55 text-sm">
                    {quiz.username}
                    {' '}
                    •
                    {' '}
                    {quiz.questions.length}
                    {' '}
                    questions
                    {' '}
                    •
                    {' '}
                    Theme:
                    {' '}
                    {quiz.settings.theme}
                  </div>
                  <div className="text-white/40 text-xs uppercase tracking-[0.2em] mt-2">
                    Last opened
                    {' '}
                    {quiz.lastOpenedAt ? new Date(quiz.lastOpenedAt).toLocaleString() : 'Never'}
                  </div>
                </div>

                <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:flex sm:flex-wrap sm:justify-end">
                  <button type="button" className="btn-primary px-4 py-3 text-sm" onClick={() => navigate(`/quiz/${quiz.id}?view=controller`)}>
                    Run
                  </button>
                  <button type="button" className="btn-secondary px-4 py-3 text-sm" onClick={() => navigate(`/quiz/${quiz.id}/edit`)}>
                    Edit
                  </button>
                  <button type="button" className="btn-secondary px-4 py-3 text-sm" onClick={() => void handleDuplicate(quiz.id)}>
                    Duplicate
                  </button>
                  <button type="button" className="btn-secondary px-4 py-3 text-sm" onClick={() => void handleExport(quiz)}>
                    Export
                  </button>
                  <button type="button" className="btn-danger px-4 py-3 text-sm" onClick={() => void handleDelete(quiz)}>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LibraryView;
