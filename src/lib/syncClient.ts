export const PRESENCE_PING_MS = 1500;
export const PRESENCE_STALE_MS = 5000;
export const RELAY_HEARTBEAT_MS = 2000;
export const RELAY_POLL_MS = 900;
export const DISPLAY_STALE_MS = 6500;

export const createClientId = () => {
  if (typeof crypto !== 'undefined' && crypto?.randomUUID) return crypto.randomUUID();
  return `client_${Date.now()}_${Math.random().toString(36).slice(2)}`;
};

export const createHostPeerId = (quizId: string) => {
  const suffix = Math.random().toString(36).slice(2, 8);
  return `host_${String(quizId || 'quiz').replace(/[^a-zA-Z0-9]/g, '').slice(-12)}_${suffix}`;
};

export const createEnvelope = (
  type: string,
  quizId: string,
  clientId: string,
  role: 'controller' | 'display',
  extra: Record<string, unknown> = {}
) => ({
  type,
  quizId,
  clientId,
  role,
  sentAt: Date.now(),
  ...extra
});

export const isNewerSyncVersion = (incoming: any, currentVersion: number) =>
  Number(incoming?.liveState?.syncVersion ?? -1) > currentVersion;

export const buildRelayUrl = (quizId: string) => `/api/realtime?quizId=${encodeURIComponent(quizId)}`;

export const statusLabelMap: Record<string, string> = {
  local: 'Local only',
  connecting: 'Connecting',
  live: 'Live',
  stale: 'Stale',
  error: 'Error'
};
