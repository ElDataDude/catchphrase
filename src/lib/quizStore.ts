import { duplicateQuiz, ensureQuizV2, exportQuizBundle, parseQuizBundle } from './quizSchema';

const DB_NAME = 'catchphrase-v2';
const DB_VERSION = 1;
const QUIZ_STORE = 'quizzes';
const SNAPSHOT_STORE = 'snapshots';

const LAST_PROFILE_KEY = 'catchphrase_last_profile';
const LAST_QUIZ_KEY = 'catchphrase_last_quiz';
const MIGRATION_KEY = 'catchphrase_v2_migrated';
const DISPLAY_SNAPSHOT_KEY = (quizId: string) => `catchphrase_display_snapshot_${quizId}`;

let dbPromise: Promise<IDBDatabase> | null = null;

const sortByRecent = (quizzes: any[]) =>
  quizzes.sort((left, right) => {
    const leftValue = Date.parse(left.lastOpenedAt || left.updatedAt || left.createdAt || 0);
    const rightValue = Date.parse(right.lastOpenedAt || right.updatedAt || right.createdAt || 0);
    return rightValue - leftValue;
  });

const withStore = async <T,>(
  storeName: string,
  mode: IDBTransactionMode,
  handler: (_store: IDBObjectStore) => Promise<T> | T
) => {
  const db = await openQuizDb();
  const transaction = db.transaction(storeName, mode);
  const store = transaction.objectStore(storeName);
  const result = await handler(store);
  await new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
  return result;
};

const requestToPromise = <T,>(request: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

export const openQuizDb = () => {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(QUIZ_STORE)) {
        db.createObjectStore(QUIZ_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(SNAPSHOT_STORE)) {
        db.createObjectStore(SNAPSHOT_STORE, { keyPath: 'quizId' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
};

const migrateLegacyLocalStorage = async () => {
  if (typeof window === 'undefined' || localStorage.getItem(MIGRATION_KEY) === '1') return;

  const legacyKeys = Object.keys(localStorage).filter((key) => key.startsWith('catchphrase_quiz_'));
  if (legacyKeys.length === 0) {
    localStorage.setItem(MIGRATION_KEY, '1');
    return;
  }

  for (const key of legacyKeys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const legacyQuiz = JSON.parse(raw);
      const migratedQuiz = ensureQuizV2(legacyQuiz);
      await withStore(QUIZ_STORE, 'readwrite', (store) => store.put(migratedQuiz));
    } catch {
      // Ignore broken legacy entries and continue.
    }
  }

  localStorage.setItem(MIGRATION_KEY, '1');
};

export const initQuizStore = async () => {
  if (typeof indexedDB === 'undefined') return;
  await openQuizDb();
  await migrateLegacyLocalStorage();
};

export const listQuizzes = async (username?: string) => {
  await initQuizStore();
  const quizzes = await withStore(QUIZ_STORE, 'readonly', (store) => requestToPromise(store.getAll()));
  const normalized = quizzes.map((quiz) => ensureQuizV2(quiz));
  return sortByRecent(
    username ? normalized.filter((quiz) => quiz.username === username) : normalized
  );
};

export const getProfiles = async () => {
  const quizzes = await listQuizzes();
  return [...new Set(quizzes.map((quiz) => quiz.username).filter(Boolean))].sort();
};

export const getQuiz = async (quizId: string) => {
  await initQuizStore();
  const quiz = await withStore(QUIZ_STORE, 'readonly', (store) => requestToPromise(store.get(quizId)));
  return quiz ? ensureQuizV2(quiz) : null;
};

export const saveQuiz = async (quiz: any) => {
  await initQuizStore();
  const normalized = ensureQuizV2({
    ...quiz,
    isPlaceholder: false
  });
  await withStore(QUIZ_STORE, 'readwrite', (store) => store.put(normalized));
  rememberLastProfile(normalized.username);
  rememberLastQuizId(normalized.id);
  return normalized;
};

export const deleteQuiz = async (quizId: string) => {
  await initQuizStore();
  await withStore(QUIZ_STORE, 'readwrite', (store) => store.delete(quizId));
  await withStore(SNAPSHOT_STORE, 'readwrite', (store) => store.delete(quizId));
};

export const duplicateQuizById = async (quizId: string) => {
  const quiz = await getQuiz(quizId);
  if (!quiz) return null;
  const duplicated = duplicateQuiz(quiz);
  return saveQuiz(duplicated);
};

export const saveSnapshot = async (quizId: string, draft: any) => {
  await initQuizStore();
  const payload = {
    quizId,
    updatedAt: new Date().toISOString(),
    draft
  };
  await withStore(SNAPSHOT_STORE, 'readwrite', (store) => store.put(payload));
};

export const getSnapshot = async (quizId: string) => {
  await initQuizStore();
  const snapshot = await withStore(SNAPSHOT_STORE, 'readonly', (store) => requestToPromise(store.get(quizId)));
  return snapshot || null;
};

export const clearSnapshot = async (quizId: string) => {
  await initQuizStore();
  await withStore(SNAPSHOT_STORE, 'readwrite', (store) => store.delete(quizId));
};

export const downloadQuizBundle = async (quizId: string) => {
  const quiz = await getQuiz(quizId);
  if (!quiz) throw new Error('Quiz not found.');
  return exportQuizBundle(quiz);
};

export const importQuizBundleFromText = async (raw: string) => {
  const imported = ensureQuizV2({
    ...parseQuizBundle(raw),
    id: undefined
  });
  return saveQuiz(imported);
};

export const rememberLastProfile = (profile: string) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LAST_PROFILE_KEY, profile);
};

export const getLastProfile = () => (typeof window === 'undefined' ? null : localStorage.getItem(LAST_PROFILE_KEY));

export const rememberLastQuizId = (quizId: string) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LAST_QUIZ_KEY, quizId);
};

export const getLastQuizId = () => (typeof window === 'undefined' ? null : localStorage.getItem(LAST_QUIZ_KEY));

export const saveDisplaySnapshot = (quizId: string, quiz: any) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DISPLAY_SNAPSHOT_KEY(quizId), JSON.stringify(ensureQuizV2(quiz)));
};

export const getDisplaySnapshot = (quizId: string) => {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(DISPLAY_SNAPSHOT_KEY(quizId));
  if (!raw) return null;
  try {
    return ensureQuizV2(JSON.parse(raw));
  } catch {
    return null;
  }
};
