import { beforeEach, describe, expect, it, vi } from 'vitest';
import { invokeRealtime, makeQuizState, resetRelayStore } from './helpers/realtime.js';

describe('realtime relay API', () => {
  beforeEach(() => {
    resetRelayStore();
  });

  it('sets no-store on success and error responses', async () => {
    const getResponse = await invokeRealtime({ method: 'GET', quizId: 'quiz_cache' });
    const postResponse = await invokeRealtime({
      method: 'POST',
      quizId: 'quiz_cache',
      body: { clientId: 'controller-1', role: 'controller', type: 'PING' }
    });
    const missingQuizResponse = await invokeRealtime({ method: 'GET', quizId: '' });
    const methodResponse = await invokeRealtime({ method: 'PUT', quizId: 'quiz_cache' });

    expect(getResponse.status).toBe(200);
    expect(postResponse.status).toBe(200);
    expect(missingQuizResponse.status).toBe(400);
    expect(methodResponse.status).toBe(405);
    for (const response of [getResponse, postResponse, missingQuizResponse, methodResponse]) {
      expect(response.headers.get('cache-control')).toBe('no-store, max-age=0');
    }
  });

  it('ignores stale state versions without overwriting the live snapshot', async () => {
    const quizId = 'quiz_versions';
    const fresh = makeQuizState(quizId, 5, { name: 'Fresh snapshot' });
    const stale = makeQuizState(quizId, 4, { name: 'Stale snapshot' });

    const accepted = await invokeRealtime({
      method: 'POST',
      quizId,
      body: { clientId: 'controller-1', role: 'controller', type: 'STATE_UPDATE', state: fresh }
    });
    const ignored = await invokeRealtime({
      method: 'POST',
      quizId,
      body: { clientId: 'controller-1', role: 'controller', type: 'STATE_UPDATE', state: stale }
    });

    expect(accepted.body.version).toBe(1);
    expect(ignored.body.version).toBe(1);
    expect(ignored.body.state.name).toBe('Fresh snapshot');
    expect(ignored.body.state.liveState.syncVersion).toBe(5);
  });

  it('rejects controller state for a different quiz id', async () => {
    const response = await invokeRealtime({
      method: 'POST',
      quizId: 'quiz_expected',
      body: {
        clientId: 'controller-1',
        role: 'controller',
        type: 'STATE_UPDATE',
        state: makeQuizState('quiz_other', 9, { name: 'Wrong quiz' })
      }
    });

    expect(response.status).toBe(200);
    expect(response.body.version).toBe(0);
    expect(response.body.state).toBeNull();
  });

  it('tracks controller and display presence and prunes stale clients', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-17T18:00:00.000Z'));

    await invokeRealtime({
      method: 'POST',
      quizId: 'quiz_presence',
      body: { clientId: 'controller-1', role: 'controller', type: 'PING' }
    });
    const withDisplay = await invokeRealtime({
      method: 'POST',
      quizId: 'quiz_presence',
      body: { clientId: 'display-1', role: 'display', type: 'PING' }
    });

    expect(withDisplay.body.presence).toEqual({ controller: 1, display: 1 });

    vi.setSystemTime(new Date('2026-05-17T18:00:11.000Z'));
    const pruned = await invokeRealtime({ method: 'GET', quizId: 'quiz_presence' });

    expect(pruned.body.presence).toEqual({ controller: 0, display: 0 });
  });
});
