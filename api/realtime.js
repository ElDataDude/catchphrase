const PRESENCE_TIMEOUT_MS = 10_000;
const SESSION_TTL_MS = 3 * 60 * 60 * 1000;

const getStore = () => {
  if (!globalThis.__catchphraseRelayStore) {
    globalThis.__catchphraseRelayStore = new Map();
  }
  return globalThis.__catchphraseRelayStore;
};

const getSession = (store, quizId) => {
  const now = Date.now();
  const existing = store.get(quizId);
  if (existing) {
    existing.lastSeenAt = now;
    return existing;
  }

  const session = {
    quizId,
    state: null,
    version: 0,
    updatedAt: 0,
    lastSeenAt: now,
    clients: new Map()
  };
  store.set(quizId, session);
  return session;
};

const prunePresence = (session) => {
  const cutoff = Date.now() - PRESENCE_TIMEOUT_MS;
  for (const [clientId, client] of session.clients.entries()) {
    if (!client?.lastSeenAt || client.lastSeenAt < cutoff) {
      session.clients.delete(clientId);
    }
  }
};

const cleanupSessions = (store) => {
  const cutoff = Date.now() - SESSION_TTL_MS;
  for (const [quizId, session] of store.entries()) {
    if (session.lastSeenAt < cutoff) {
      store.delete(quizId);
    }
  }
};

const buildPresence = (session) => {
  let controller = 0;
  let display = 0;
  for (const client of session.clients.values()) {
    if (client?.role === 'controller') controller += 1;
    if (client?.role === 'display') display += 1;
  }
  return { controller, display };
};

const parseBody = (req) => {
  if (!req.body) return {};
  if (typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return {};
};

const normalizeQuizId = (input) => {
  if (Array.isArray(input)) return input[0];
  return input;
};

const normalizeRole = (value) => (value === 'display' ? 'display' : 'controller');

const normalizeClientId = (value) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 80);
};

const normalizeState = (value, quizId) => {
  if (!value || typeof value !== 'object') return null;
  if (value.id !== quizId) return null;
  return { ...value, isPlaceholder: false };
};

export default async function handler(req, res) {
  const quizId = normalizeQuizId(req.query?.quizId);
  if (!quizId) {
    res.status(400).json({ ok: false, error: 'missing_quiz_id' });
    return;
  }

  const store = getStore();
  const session = getSession(store, quizId);
  prunePresence(session);
  cleanupSessions(store);

  if (req.method === 'GET') {
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.status(200).json({
      ok: true,
      version: session.version,
      updatedAt: session.updatedAt,
      presence: buildPresence(session),
      state: session.state
    });
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    res.status(405).json({ ok: false, error: 'method_not_allowed' });
    return;
  }

  const body = parseBody(req);
  const role = normalizeRole(body.role);
  const clientId = normalizeClientId(body.clientId);
  const now = Date.now();

  if (clientId) {
    session.clients.set(clientId, { role, lastSeenAt: now });
  }

  if (body.kind === 'state' && role === 'controller') {
    const nextState = normalizeState(body.state, quizId);
    if (nextState) {
      session.state = nextState;
      session.updatedAt = now;
      session.version += 1;
    }
  }

  prunePresence(session);
  session.lastSeenAt = now;

  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.status(200).json({
    ok: true,
    version: session.version,
    updatedAt: session.updatedAt,
    presence: buildPresence(session),
    state: session.state
  });
}
