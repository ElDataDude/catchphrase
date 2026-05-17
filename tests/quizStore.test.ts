import FDBFactory from 'fake-indexeddb/lib/FDBFactory';
import FDBKeyRange from 'fake-indexeddb/lib/FDBKeyRange';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createQuiz } from '../src/lib/quizSchema';

const resetIndexedDb = () => {
  Object.defineProperty(globalThis, 'indexedDB', {
    configurable: true,
    value: new FDBFactory()
  });
  Object.defineProperty(globalThis, 'IDBKeyRange', {
    configurable: true,
    value: FDBKeyRange
  });
};

const loadQuizStore = async () => import('../src/lib/quizStore');

describe('quizStore IndexedDB persistence', () => {
  beforeEach(() => {
    vi.resetModules();
    resetIndexedDb();
    localStorage.clear();
  });

  it('saves, loads, lists, and remembers a quiz locally', async () => {
    const { getLastProfile, getLastQuizId, getQuiz, listQuizzes, saveQuiz } = await loadQuizStore();
    const quiz = createQuiz({
      id: 'quiz_store',
      username: 'host',
      name: 'Storage Smoke'
    });

    const saved = await saveQuiz(quiz);
    const loaded = await getQuiz(saved.id);
    const quizzes = await listQuizzes('host');

    expect(loaded?.id).toBe('quiz_store');
    expect(loaded?.name).toBe('Storage Smoke');
    expect(quizzes.map((item) => item.id)).toEqual(['quiz_store']);
    expect(getLastProfile()).toBe('host');
    expect(getLastQuizId()).toBe('quiz_store');
  });

  it('migrates legacy localStorage quizzes into IndexedDB once', async () => {
    localStorage.setItem(
      'catchphrase_quiz_legacy',
      JSON.stringify({
        id: 'quiz_legacy',
        username: 'legacy-host',
        name: 'Legacy Quiz',
        questions: [
          {
            id: 'q1',
            type: 'image',
            imageUrl: 'https://example.com/legacy.jpg'
          }
        ]
      })
    );

    const { getQuiz, initQuizStore } = await loadQuizStore();
    await initQuizStore();

    const migrated = await getQuiz('quiz_legacy');
    expect(migrated?.schemaVersion).toBe(2);
    expect(migrated?.questions[0].media.src).toBe('https://example.com/legacy.jpg');
    expect(localStorage.getItem('catchphrase_v2_migrated')).toBe('1');
  });

  it('stores draft and display snapshots separately from durable quizzes', async () => {
    const {
      clearSnapshot,
      getDisplaySnapshot,
      getSnapshot,
      saveDisplaySnapshot,
      saveSnapshot
    } = await loadQuizStore();
    const draft = createQuiz({ id: 'quiz_snapshot', username: 'host', name: 'Draft' });
    const display = createQuiz({ id: 'quiz_snapshot', username: 'host', name: 'Live Display' });

    await saveSnapshot(draft.id, draft);
    expect((await getSnapshot(draft.id))?.draft.name).toBe('Draft');

    saveDisplaySnapshot(display.id, display);
    expect(getDisplaySnapshot(display.id)?.name).toBe('Live Display');

    await clearSnapshot(draft.id);
    expect(await getSnapshot(draft.id)).toBeNull();
  });
});
