import { describe, expect, it } from 'vitest';
import { createQuiz, migrateLegacyQuiz } from './quizSchema';

describe('quizSchema', () => {
  it('migrates a legacy quiz into the v2 schema', () => {
    const migrated = migrateLegacyQuiz({
      id: 'quiz_legacy',
      username: 'host',
      name: 'Legacy Night',
      createdAt: '2026-02-28T20:00:00.000Z',
      currentQuestionIndex: 1,
      questions: [
        {
          id: 'q1',
          type: 'image',
          imageUrl: 'https://example.com/one.jpg',
          revealSequence: [1, 2, 3],
          revealedSquares: [1],
          revealHistory: [1]
        },
        {
          id: 'q2',
          type: 'video',
          videoUrl: 'https://example.com/two.mp4',
          startTime: 6,
          timerMode: { interval: 8000 }
        }
      ]
    });

    expect(migrated.schemaVersion).toBe(2);
    expect(migrated.liveState.currentQuestionIndex).toBe(1);
    expect(migrated.questions[0].media.kind).toBe('image');
    expect(migrated.questions[0].reveal.sequence).toEqual([1, 2, 3]);
    expect(migrated.questions[1].media.kind).toBe('video');
    expect(migrated.settings.defaultTimerMs).toBe(8000);
  });

  it('creates a v2 quiz with defaults', () => {
    const quiz = createQuiz({ username: 'host', name: 'Fresh quiz' });
    expect(quiz.schemaVersion).toBe(2);
    expect(quiz.questions).toHaveLength(1);
    expect(quiz.settings.theme).toBe('studio');
    expect(quiz.liveState.scene).toBe('question');
  });
});
