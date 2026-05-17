import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { importQuizBundleFromText, getLastQuizId, listQuizzes } from '../lib/quizStore';
import { useInstallPrompt } from '../hooks/useInstallPrompt';

const DashboardView = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [recentQuizzes, setRecentQuizzes] = useState([]);
  const [quizCount, setQuizCount] = useState(0);
  const [lastQuizId, setLastQuizId] = useState(null);
  const [importMessage, setImportMessage] = useState('');
  const { canInstall, promptToInstall } = useInstallPrompt();

  useEffect(() => {
    const loadDashboard = async () => {
      const quizzes = await listQuizzes();
      setQuizCount(quizzes.length);
      setRecentQuizzes(quizzes.slice(0, 5));
      setLastQuizId(getLastQuizId());
    };

    void loadDashboard();
  }, []);

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const raw = await file.text();
      const imported = await importQuizBundleFromText(raw);
      setImportMessage(`Imported "${imported.name}".`);
      navigate(`/quiz/${imported.id}/edit`);
    } catch {
      setImportMessage('Import failed. Use a Catchphrase export bundle.');
    } finally {
      event.target.value = '';
    }
  };

  return (
    <div className="dashboard-shell">
      <div className="dashboard-hero">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="text-white/55 uppercase tracking-[0.24em] text-xs">Catchphrase operator console</div>
            <h1 className="dashboard-title">Prepare, check, and run the next show.</h1>
            <p className="dashboard-copy">
              Local quiz library, media preflight, controller, and display launch controls in one place.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 lg:min-w-[360px]">
            <div className="surface-soft rounded-lg p-3">
              <div className="text-white/50 text-[10px] uppercase tracking-[0.18em]">Library</div>
              <div className="text-white text-2xl font-black">{quizCount}</div>
            </div>
            <div className="surface-soft rounded-lg p-3">
              <div className="text-white/50 text-[10px] uppercase tracking-[0.18em]">Recent</div>
              <div className="text-white text-2xl font-black">{recentQuizzes.length}</div>
            </div>
            <div className="surface-soft rounded-lg p-3">
              <div className="text-white/50 text-[10px] uppercase tracking-[0.18em]">Mode</div>
              <div className="text-white text-base font-black leading-8">Local</div>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <button type="button" className="btn-primary py-4 px-5 text-base" onClick={() => navigate('/quiz/new')}>
            Create Quiz
          </button>
          <button type="button" className="btn-secondary py-4 px-5 text-base" onClick={() => navigate('/library')}>
            Open Library
          </button>
          <button type="button" className="btn-secondary py-4 px-5 text-base" onClick={() => fileInputRef.current?.click()}>
            Import Bundle
          </button>
          {canInstall && (
            <button type="button" className="btn-secondary py-4 px-5 text-base" onClick={() => void promptToInstall()}>
              Install App
            </button>
          )}
        </div>

        <input ref={fileInputRef} type="file" accept="application/json,.json" className="hidden" onChange={handleImportFile} />

        {importMessage && (
          <div className="surface-soft rounded-lg px-4 py-3 text-sm text-white/75">{importMessage}</div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr,0.9fr]">
        <section className="surface-strong p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-white font-black text-xl">Recent Quizzes</h2>
              <p className="text-white/60 text-sm">Resume what you were running most recently.</p>
            </div>
            <button type="button" className="btn-secondary px-4 py-3 text-sm" onClick={() => navigate('/library')}>
              View All
            </button>
          </div>

          <div className="grid gap-3">
            {recentQuizzes.length === 0 && (
              <div className="surface-soft rounded-lg p-4 text-white/65 text-sm">
                No saved quizzes yet. Create one or import a bundle to get started.
              </div>
            )}

            {recentQuizzes.map((quiz) => (
              <button
                key={quiz.id}
                type="button"
                onClick={() => navigate(`/quiz/${quiz.id}?view=controller`)}
                className="surface-soft rounded-lg p-4 text-left hover:bg-white/[0.09] hover:ring-1 hover:ring-white/20 transition"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-white font-bold text-lg">{quiz.name}</div>
                    <div className="text-white/55 text-sm">
                      {quiz.username}
                      {' '}
                      •
                      {' '}
                      {quiz.questions.length}
                      {' '}
                      questions
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-white/45 text-xs uppercase tracking-[0.16em]">
                      {quiz.lastOpenedAt ? new Date(quiz.lastOpenedAt).toLocaleDateString() : 'New'}
                    </div>
                    <div className="text-cyan-200 text-xs font-black mt-1">Run</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="surface-strong p-5 space-y-4">
          <div>
            <h2 className="text-white font-black text-xl">Fast Resume</h2>
            <p className="text-white/60 text-sm">Jump back into your most recently opened controller session.</p>
          </div>

          <button
            type="button"
            className="btn-primary w-full py-4 px-5 text-base disabled:opacity-40"
            disabled={!lastQuizId}
            onClick={() => navigate(`/quiz/${lastQuizId}?view=controller`)}
          >
            {lastQuizId ? 'Resume Last Session' : 'No Previous Session'}
          </button>

          <div className="surface-soft rounded-lg p-4 space-y-3">
            <div className="text-white font-bold">Show handoff</div>
            <div className="text-white/65 text-sm">
              Store quizzes locally, open the controller, then use Join to copy a display link or fall back to casting the same tab.
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default DashboardView;
