import { describe, expect, it } from 'vitest';
import { createQuiz } from '../lib/quizSchema';
import { getSyncedQuizUpdate, normalizeProviderQuiz } from './QuizContext';

describe('QuizContext sync helpers', () => {
  it('preserves display placeholder state through provider normalization', () => {
    const placeholder = normalizeProviderQuiz({
      ...createQuiz({
        id: 'quiz_live',
        liveState: { syncVersion: 0 }
      }),
      isPlaceholder: true
    });

    expect(placeholder.isPlaceholder).toBe(true);
    expect(placeholder.liveState.syncVersion).toBe(0);
  });

  it('accepts the first display snapshot even when syncVersion is 0', () => {
    const bootstrap = createQuiz({
      id: 'quiz_live',
      name: 'Cached frame',
      liveState: { syncVersion: 0 }
    });
    const incoming = createQuiz({
      id: 'quiz_live',
      name: 'Live frame',
      liveState: { syncVersion: 0 }
    });

    expect(getSyncedQuizUpdate(bootstrap, incoming, 'display', false)?.name).toBe('Live frame');
    expect(getSyncedQuizUpdate(bootstrap, incoming, 'display', true)).toBeNull();
  });

  it('lets explicit placeholders accept an equal-version display snapshot', () => {
    const placeholder = normalizeProviderQuiz({
      ...createQuiz({
        id: 'quiz_live',
        name: 'Connecting...',
        liveState: { syncVersion: 0 }
      }),
      isPlaceholder: true
    });
    const incoming = createQuiz({
      id: 'quiz_live',
      name: 'Live frame',
      liveState: { syncVersion: 0 }
    });

    expect(getSyncedQuizUpdate(placeholder, incoming, 'display', true)?.name).toBe('Live frame');
  });

  it('rejects stale and equal relay snapshots for controllers', () => {
    const controllerState = createQuiz({
      id: 'quiz_live',
      name: 'Controller latest',
      liveState: { syncVersion: 10 }
    });
    const staleIncoming = createQuiz({
      id: 'quiz_live',
      name: 'Relay stale',
      liveState: { syncVersion: 9 }
    });
    const equalIncoming = createQuiz({
      id: 'quiz_live',
      name: 'Relay equal',
      liveState: { syncVersion: 10 }
    });
    const newerIncoming = createQuiz({
      id: 'quiz_live',
      name: 'Relay newer',
      liveState: { syncVersion: 11 }
    });

    expect(getSyncedQuizUpdate(controllerState, staleIncoming, 'controller', true)).toBeNull();
    expect(getSyncedQuizUpdate(controllerState, equalIncoming, 'controller', true)).toBeNull();
    expect(getSyncedQuizUpdate(controllerState, newerIncoming, 'controller', true)?.name).toBe('Relay newer');
  });
});
