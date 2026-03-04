import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import BulkImportPanel from '../components/BulkImportPanel';
import QuestionEditorCard from '../components/QuestionEditorCard';
import { probeQuestionMedia } from '../lib/mediaPreflight';
import { importQuestionsFromText } from '../lib/questionImport';
import { createQuestion, createQuiz, ensureQuizV2 } from '../lib/quizSchema';
import {
  clearSnapshot,
  getLastProfile,
  getQuiz,
  getSnapshot,
  saveQuiz,
  saveSnapshot
} from '../lib/quizStore';

const themeOptions = [
  { value: 'studio', label: 'Studio' },
  { value: 'minimal', label: 'Minimal' },
  { value: 'retro', label: 'Retro Board' }
];

const validateQuiz = (quiz) => {
  const topLevelErrors = [];
  const questionErrors = {};

  if (!quiz.username.trim()) topLevelErrors.push('Profile is required.');
  if (!quiz.name.trim()) topLevelErrors.push('Quiz name is required.');

  quiz.questions.forEach((question, index) => {
    const errors = [];
    if (!question.media.src.trim()) errors.push('Media URL is required.');
    if (question.media.kind === 'video' && Number(question.media.duration) < 0) {
      errors.push('Video duration must be 0 or greater.');
    }
    if (question.reveal.sequence?.length > 9) {
      errors.push('Reveal sequence cannot exceed 9 squares.');
    }
    if (errors.length > 0) {
      questionErrors[index] = errors;
    }
  });

  return {
    topLevelErrors,
    questionErrors,
    hasErrors: topLevelErrors.length > 0 || Object.keys(questionErrors).length > 0
  };
};

const EditorView = () => {
  const navigate = useNavigate();
  const { quizId } = useParams();
  const isEditing = Boolean(quizId);
  const [draft, setDraft] = useState(null);
  const [snapshot, setSnapshot] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkImportText, setBulkImportText] = useState('');
  const [topLevelErrors, setTopLevelErrors] = useState([]);
  const [questionErrors, setQuestionErrors] = useState({});
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    const loadDraft = async () => {
      setIsLoading(true);

      if (isEditing) {
        const existing = await getQuiz(quizId);
        if (!existing) {
          setDraft(null);
          setIsLoading(false);
          return;
        }
        const existingSnapshot = await getSnapshot(existing.id);
        setDraft(existing);
        setSnapshot(existingSnapshot);
        setIsLoading(false);
        return;
      }

      const created = createQuiz({
        username: getLastProfile() || '',
        name: '',
        questions: [createQuestion()],
        liveState: {
          scene: 'title'
        }
      });
      const existingSnapshot = await getSnapshot(created.id);
      setDraft(created);
      setSnapshot(existingSnapshot);
      setIsLoading(false);
    };

    void loadDraft();
  }, [isEditing, quizId]);

  useEffect(() => {
    if (!draft) return undefined;
    const timeoutId = window.setTimeout(() => {
      void saveSnapshot(draft.id, draft);
    }, 400);
    return () => window.clearTimeout(timeoutId);
  }, [draft]);

  const importedQuestions = useMemo(() => importQuestionsFromText(bulkImportText), [bulkImportText]);

  const handleQuestionChange = (index, nextQuestion) => {
    setDraft((current) => ({
      ...current,
      questions: current.questions.map((question, questionIndex) =>
        questionIndex === index ? ensureQuizV2({ ...current, questions: [nextQuestion] }).questions[0] : question
      )
    }));
  };

  const moveQuestion = (index, direction) => {
    setDraft((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.questions.length) return current;
      const questions = [...current.questions];
      [questions[index], questions[nextIndex]] = [questions[nextIndex], questions[index]];
      return {
        ...current,
        questions
      };
    });
  };

  const duplicateQuestion = (index) => {
    setDraft((current) => {
      const nextQuestion = createQuestion(current.questions[index]);
      return {
        ...current,
        questions: [
          ...current.questions.slice(0, index + 1),
          nextQuestion,
          ...current.questions.slice(index + 1)
        ]
      };
    });
  };

  const deleteQuestion = (index) => {
    setDraft((current) => ({
      ...current,
      questions: current.questions.filter((_, questionIndex) => questionIndex !== index)
    }));
  };

  const addQuestion = () => {
    setDraft((current) => ({
      ...current,
      questions: [...current.questions, createQuestion()]
    }));
  };

  const runQuestionProbe = async (index) => {
    const assetStatus = await probeQuestionMedia(draft.questions[index]);
    setDraft((current) => ({
      ...current,
      questions: current.questions.map((question, questionIndex) =>
        questionIndex === index
          ? {
              ...question,
              assetStatus
            }
          : question
      )
    }));
  };

  const handleBulkImport = () => {
    if (importedQuestions.length === 0) return;
    setDraft((current) => ({
      ...current,
      questions: [...current.questions, ...importedQuestions]
    }));
    setBulkImportText('');
    setShowBulkImport(false);
  };

  const persist = async (andRun = false) => {
    const result = validateQuiz(draft);
    setTopLevelErrors(result.topLevelErrors);
    setQuestionErrors(result.questionErrors);
    if (result.hasErrors) {
      setSaveMessage('Fix the highlighted errors before saving.');
      return;
    }

    const normalized = ensureQuizV2({
      ...draft,
      updatedAt: new Date().toISOString()
    });
    const saved = await saveQuiz(normalized);
    await clearSnapshot(saved.id);
    setSaveMessage(andRun ? 'Saved. Opening controller…' : 'Saved locally.');
    setSnapshot(null);
    setDraft(saved);

    if (andRun) {
      navigate(`/quiz/${saved.id}?view=controller`);
      return;
    }

    if (!isEditing) {
      navigate(`/quiz/${saved.id}/edit`, { replace: true });
    }
  };

  if (isLoading) {
    return (
      <div className="page-shell">
        <div className="surface-strong p-6 text-white font-black">Loading editor…</div>
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="page-shell">
        <div className="surface-strong p-6 space-y-4">
          <div className="text-white font-black text-2xl">Quiz not found</div>
          <button type="button" className="btn-primary px-4 py-3 text-sm" onClick={() => navigate('/library')}>
            Back to Library
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell space-y-6">
      <div className="surface-strong p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-white/50 uppercase tracking-[0.2em] text-xs">{isEditing ? 'Edit Quiz' : 'Create Quiz'}</div>
            <h1 className="text-white font-black text-3xl">{draft.name || 'Untitled quiz'}</h1>
            <p className="text-white/60">Author questions, validate media, and save local durable state.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary px-4 py-3 text-sm" onClick={() => navigate('/library')}>
              Library
            </button>
            <button type="button" className="btn-secondary px-4 py-3 text-sm" onClick={() => setShowBulkImport((current) => !current)}>
              Bulk Import
            </button>
            <button type="button" className="btn-primary px-4 py-3 text-sm" onClick={() => void persist(false)}>
              Save Draft
            </button>
            <button type="button" className="btn-primary px-4 py-3 text-sm" onClick={() => void persist(true)}>
              Save & Run
            </button>
          </div>
        </div>

        {snapshot && (
          <div className="surface-soft rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="text-white/70 text-sm">
              Autosave snapshot available from
              {' '}
              {new Date(snapshot.updatedAt).toLocaleString()}.
            </div>
            <button
              type="button"
              className="btn-secondary px-4 py-3 text-sm"
              onClick={() => setDraft(ensureQuizV2(snapshot.draft))}
            >
              Restore Snapshot
            </button>
          </div>
        )}

        {topLevelErrors.length > 0 && (
          <div className="surface-soft rounded-2xl p-4 text-sm text-rose-100">
            {topLevelErrors.map((message) => (
              <div key={message}>{message}</div>
            ))}
          </div>
        )}

        {saveMessage && <div className="text-white/65 text-sm">{saveMessage}</div>}

        <div className="grid gap-4 lg:grid-cols-[1.2fr,0.9fr]">
          <label className="space-y-2">
            <span className="text-white/70 text-sm font-bold">Profile</span>
            <input className="field" value={draft.username} onChange={(event) => setDraft((current) => ({ ...current, username: event.target.value }))} />
          </label>
          <label className="space-y-2">
            <span className="text-white/70 text-sm font-bold">Quiz Name</span>
            <input className="field" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
          </label>
          <label className="space-y-2">
            <span className="text-white/70 text-sm font-bold">Theme</span>
            <select
              className="field"
              value={draft.settings.theme}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  settings: {
                    ...current.settings,
                    theme: event.target.value
                  }
                }))
              }
            >
              {themeOptions.map((theme) => (
                <option key={theme.value} value={theme.value}>
                  {theme.label}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="surface-soft rounded-2xl p-4 flex items-center gap-3">
              <input
                type="checkbox"
                checked={draft.settings.showLowerThird}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    settings: {
                      ...current.settings,
                      showLowerThird: event.target.checked
                    }
                  }))
                }
              />
              <span className="text-white/75 text-sm">Show lower-third metadata</span>
            </label>
            <label className="surface-soft rounded-2xl p-4 flex items-center gap-3">
              <input
                type="checkbox"
                checked={draft.settings.preflightRequired}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    settings: {
                      ...current.settings,
                      preflightRequired: event.target.checked
                    }
                  }))
                }
              />
              <span className="text-white/75 text-sm">Require preflight before showtime</span>
            </label>
          </div>
        </div>
      </div>

      <BulkImportPanel
        isOpen={showBulkImport}
        value={bulkImportText}
        onChange={setBulkImportText}
        onApply={handleBulkImport}
        onClose={() => setShowBulkImport(false)}
        importCount={importedQuestions.length}
      />

      <div className="space-y-4">
        {draft.questions.map((question, index) => (
          <QuestionEditorCard
            key={question.id}
            question={question}
            index={index}
            errors={questionErrors[index] || []}
            totalQuestions={draft.questions.length}
            onChange={handleQuestionChange}
            onMoveUp={() => moveQuestion(index, -1)}
            onMoveDown={() => moveQuestion(index, 1)}
            onDuplicate={duplicateQuestion}
            onDelete={deleteQuestion}
            onProbe={runQuestionProbe}
          />
        ))}
      </div>

      <div className="flex justify-center">
        <button type="button" className="btn-secondary px-5 py-4 text-sm" onClick={addQuestion}>
          Add Question
        </button>
      </div>
    </div>
  );
};

export default EditorView;
