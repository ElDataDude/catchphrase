import handler from '../../api/realtime.js';

export const resetRelayStore = () => {
  delete globalThis.__catchphraseRelayStore;
};

export const makeQuizState = (quizId, syncVersion, overrides = {}) => ({
  id: quizId,
  name: 'Relay Test',
  liveState: {
    currentQuestionIndex: 0,
    scene: 'question',
    syncVersion
  },
  questions: [],
  ...overrides
});

export const invokeRealtime = async ({ method = 'GET', quizId = 'quiz_relay', body } = {}) => {
  const headers = new Map();
  let statusCode = 0;
  let payload = null;

  const req = {
    method,
    query: quizId ? { quizId } : {},
    body
  };

  const res = {
    setHeader(name, value) {
      headers.set(name.toLowerCase(), value);
    },
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      payload = data;
      return this;
    }
  };

  await handler(req, res);

  return {
    status: statusCode,
    body: payload,
    headers
  };
};
