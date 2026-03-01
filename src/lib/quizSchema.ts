export const SCHEMA_VERSION = 2;
export const GRID_SQUARES = [1, 2, 3, 4, 5, 6, 7, 8, 9];

const DEFAULT_TIMER_MS = 5000;

const nowIso = () => new Date().toISOString();

const createId = (prefix: string) => {
  if (typeof crypto !== 'undefined' && crypto?.randomUUID) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

const normalizeText = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

const clampInt = (value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (Number.isNaN(parsed)) return min;
  return Math.max(min, Math.min(max, parsed));
};

const normalizeFitMode = (value: unknown) => (value === 'contain' ? 'contain' : 'cover');

const normalizeTheme = (value: unknown) => {
  if (value === 'minimal' || value === 'retro') return value;
  return 'studio';
};

const normalizeScene = (value: unknown) => {
  if (value === 'title' || value === 'answer' || value === 'blank') return value;
  return 'question';
};

const uniqueSequence = (value: unknown) => {
  if (!Array.isArray(value)) return null;
  const sanitized = value
    .map((item) => clampInt(item, 1, 9))
    .filter((item, index, array) => array.indexOf(item) === index);
  return sanitized.length > 0 ? sanitized : null;
};

export const getUnrevealedSquares = (question: any) =>
  GRID_SQUARES.filter((square) => !(question?.reveal?.revealedSquares || []).includes(square));

export const getNextSequenceSquare = (question: any) => {
  const sequence = question?.reveal?.sequence || [];
  const revealed = new Set(question?.reveal?.revealedSquares || []);
  return sequence.find((square: number) => !revealed.has(square)) ?? null;
};

export const areAllSquaresRevealed = (question: any) =>
  (question?.reveal?.revealedSquares || []).length >= GRID_SQUARES.length;

export const createQuestion = (seed: Partial<any> = {}) => ({
  id: seed.id || createId('q'),
  title: normalizeText(seed.title),
  answer: normalizeText(seed.answer),
  category: normalizeText(seed.category),
  roundLabel: normalizeText(seed.roundLabel),
  hostNotes: normalizeText(seed.hostNotes),
  media: {
    kind: seed.media?.kind === 'video' ? 'video' : 'image',
    src: normalizeText(seed.media?.src),
    startTime: clampInt(seed.media?.startTime, 0),
    duration: clampInt(seed.media?.duration ?? 10, 0, 600),
    fitMode: normalizeFitMode(seed.media?.fitMode)
  },
  reveal: {
    sequence: uniqueSequence(seed.reveal?.sequence),
    revealedSquares: Array.isArray(seed.reveal?.revealedSquares)
      ? seed.reveal.revealedSquares.map((item: unknown) => clampInt(item, 1, 9)).filter((item: number, index: number, array: number[]) => array.indexOf(item) === index)
      : [],
    revealHistory: Array.isArray(seed.reveal?.revealHistory)
      ? seed.reveal.revealHistory.map((item: unknown) => clampInt(item, 1, 9))
      : []
  },
  assetStatus: {
    state:
      seed.assetStatus?.state === 'ready' ||
      seed.assetStatus?.state === 'warn' ||
      seed.assetStatus?.state === 'error'
        ? seed.assetStatus.state
        : 'idle',
    message: normalizeText(seed.assetStatus?.message) || null,
    checkedAt: normalizeText(seed.assetStatus?.checkedAt) || null
  }
});

export const createQuiz = (seed: Partial<any> = {}) => {
  const createdAt = normalizeText(seed.createdAt) || nowIso();
  const updatedAt = normalizeText(seed.updatedAt) || createdAt;
  const username = normalizeText(seed.username) || 'default';
  const questions = Array.isArray(seed.questions) && seed.questions.length > 0
    ? seed.questions.map((question) => createQuestion(question))
    : [createQuestion()];

  return {
    id: seed.id || createId('quiz'),
    schemaVersion: SCHEMA_VERSION,
    username,
    name: normalizeText(seed.name) || 'Untitled quiz',
    createdAt,
    updatedAt,
    lastOpenedAt: normalizeText(seed.lastOpenedAt) || null,
    lastPlayedAt: normalizeText(seed.lastPlayedAt) || null,
    settings: {
      theme: normalizeTheme(seed.settings?.theme),
      gridSize: 3,
      defaultTimerMs: clampInt(seed.settings?.defaultTimerMs ?? DEFAULT_TIMER_MS, 1000, 60000),
      revealAnimation: seed.settings?.revealAnimation === 'fade' ? 'fade' : 'flip',
      preflightRequired: seed.settings?.preflightRequired !== false,
      showLowerThird: seed.settings?.showLowerThird !== false
    },
    questions,
    liveState: {
      currentQuestionIndex: clampInt(seed.liveState?.currentQuestionIndex, 0, Math.max(questions.length - 1, 0)),
      scene: normalizeScene(seed.liveState?.scene),
      syncVersion: clampInt(seed.liveState?.syncVersion, 0),
      timer: {
        enabled: seed.liveState?.timer?.enabled !== false,
        intervalMs: clampInt(seed.liveState?.timer?.intervalMs ?? seed.settings?.defaultTimerMs ?? DEFAULT_TIMER_MS, 1000, 60000),
        isRunning: Boolean(seed.liveState?.timer?.isRunning),
        startedAt: normalizeText(seed.liveState?.timer?.startedAt) || null
      }
    }
  };
};

const migrateLegacyQuestion = (legacyQuestion: any) =>
  createQuestion({
    id: legacyQuestion?.id,
    title: legacyQuestion?.title || '',
    answer: legacyQuestion?.answer || '',
    category: legacyQuestion?.category || '',
    roundLabel: legacyQuestion?.roundLabel || '',
    hostNotes: legacyQuestion?.hostNotes || '',
    media: {
      kind: legacyQuestion?.type === 'video' ? 'video' : 'image',
      src: legacyQuestion?.type === 'video' ? legacyQuestion?.videoUrl || '' : legacyQuestion?.imageUrl || '',
      startTime: legacyQuestion?.startTime || 0,
      duration: legacyQuestion?.duration || 10,
      fitMode: legacyQuestion?.fitMode || 'cover'
    },
    reveal: {
      sequence: legacyQuestion?.revealSequence || null,
      revealedSquares: legacyQuestion?.revealedSquares || [],
      revealHistory: legacyQuestion?.revealHistory || []
    },
    assetStatus: legacyQuestion?.assetStatus || { state: 'idle', message: null, checkedAt: null }
  });

export const migrateLegacyQuiz = (legacyQuiz: any) => {
  if (!legacyQuiz) return createQuiz();
  if (legacyQuiz.schemaVersion === SCHEMA_VERSION) return createQuiz(legacyQuiz);

  const questions = Array.isArray(legacyQuiz.questions) && legacyQuiz.questions.length > 0
    ? legacyQuiz.questions.map(migrateLegacyQuestion)
    : [createQuestion()];

  const currentQuestion = legacyQuiz.questions?.[legacyQuiz.currentQuestionIndex || 0];
  const defaultTimerMs = currentQuestion?.timerMode?.interval || DEFAULT_TIMER_MS;

  return createQuiz({
    id: legacyQuiz.id,
    username: legacyQuiz.username,
    name: legacyQuiz.name,
    createdAt: legacyQuiz.createdAt,
    updatedAt: legacyQuiz.updatedAt || legacyQuiz.createdAt || nowIso(),
    lastOpenedAt: legacyQuiz.lastOpenedAt || null,
    lastPlayedAt: legacyQuiz.lastPlayedAt || null,
    settings: {
      theme: legacyQuiz.settings?.theme || 'studio',
      defaultTimerMs,
      revealAnimation: legacyQuiz.settings?.revealAnimation || 'flip',
      preflightRequired: legacyQuiz.settings?.preflightRequired,
      showLowerThird: legacyQuiz.settings?.showLowerThird
    },
    questions,
    liveState: {
      currentQuestionIndex: legacyQuiz.currentQuestionIndex || 0,
      scene: 'question',
      syncVersion: 0,
      timer: {
        enabled: currentQuestion?.timerMode?.enabled !== false,
        intervalMs: defaultTimerMs,
        isRunning: false,
        startedAt: null
      }
    }
  });
};

export const ensureQuizV2 = (quiz: any) => migrateLegacyQuiz(quiz);

export const resetQuestionReveal = (question: any) =>
  createQuestion({
    ...question,
    reveal: {
      ...question.reveal,
      revealedSquares: [],
      revealHistory: []
    }
  });

export const resetQuizProgress = (quiz: any) =>
  createQuiz({
    ...quiz,
    questions: quiz.questions.map((question: any) => resetQuestionReveal(question)),
    liveState: {
      ...quiz.liveState,
      currentQuestionIndex: 0,
      scene: 'title',
      timer: {
        ...quiz.liveState.timer,
        isRunning: false,
        startedAt: null
      }
    }
  });

export const duplicateQuiz = (quiz: any) => {
  const source = ensureQuizV2(quiz);
  const duplicatedQuestions = source.questions.map((question: any) =>
    createQuestion({
      ...question,
      id: undefined,
      reveal: {
        ...question.reveal,
        revealedSquares: [],
        revealHistory: []
      }
    })
  );

  return createQuiz({
    ...source,
    id: undefined,
    name: `${source.name} Copy`,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    lastOpenedAt: null,
    lastPlayedAt: null,
    questions: duplicatedQuestions,
    liveState: {
      ...source.liveState,
      currentQuestionIndex: 0,
      scene: 'title',
      syncVersion: 0,
      timer: {
        ...source.liveState.timer,
        isRunning: false,
        startedAt: null
      }
    }
  });
};

export const buildQuestionLabel = (question: any, index: number) =>
  normalizeText(question?.title) || normalizeText(question?.answer) || `Question ${index + 1}`;

export const exportQuizBundle = (quiz: any) =>
  JSON.stringify(
    {
      version: 1,
      exportedAt: nowIso(),
      quiz: ensureQuizV2(quiz)
    },
    null,
    2
  );

export const parseQuizBundle = (raw: string) => {
  const parsed = JSON.parse(raw);
  if (parsed?.quiz) return ensureQuizV2(parsed.quiz);
  return ensureQuizV2(parsed);
};
