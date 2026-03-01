import { describe, expect, it } from 'vitest';
import { quizReducer } from './quizReducer';
import { createQuestion, createQuiz } from './quizSchema';

describe('quizReducer', () => {
  it('increments syncVersion for controller-side live mutations', () => {
    const initial = createQuiz({
      name: 'Reducer Test',
      questions: [
        createQuestion({
          media: { kind: 'image', src: 'https://example.com/image.jpg' },
          reveal: { sequence: [1, 2, 3] }
        })
      ]
    });

    const next = quizReducer(initial, { type: 'REVEAL_SQUARE', payload: 1 });

    expect(next.questions[0].reveal.revealedSquares).toEqual([1]);
    expect(next.liveState.syncVersion).toBe(initial.liveState.syncVersion + 1);
    expect(next.liveState.scene).toBe('question');
  });

  it('loads remote state without incrementing syncVersion', () => {
    const initial = createQuiz({ name: 'Initial' });
    const remote = createQuiz({
      id: initial.id,
      name: 'Remote',
      liveState: { syncVersion: 7, scene: 'answer' }
    });

    const next = quizReducer(initial, {
      type: 'LOAD_QUIZ',
      payload: remote,
      meta: { remote: true }
    });

    expect(next.name).toBe('Remote');
    expect(next.liveState.syncVersion).toBe(7);
    expect(next.liveState.scene).toBe('answer');
  });

  it('moves to a title scene when advancing questions', () => {
    const initial = createQuiz({
      questions: [
        createQuestion({ title: 'One', media: { kind: 'image', src: 'https://example.com/one.jpg' } }),
        createQuestion({ title: 'Two', media: { kind: 'image', src: 'https://example.com/two.jpg' } })
      ]
    });

    const next = quizReducer(initial, { type: 'NEXT_QUESTION' });

    expect(next.liveState.currentQuestionIndex).toBe(1);
    expect(next.liveState.scene).toBe('title');
  });
});
