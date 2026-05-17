import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  deleteQuiz,
  generateQuizId,
  getAllQuizzesForUser,
  getQuizList,
  loadQuiz,
  saveQuiz
} from '../src/utils/storage';

describe('legacy localStorage utilities', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('saves, loads, lists, and deletes user quizzes', () => {
    const quiz = {
      id: 'quiz_local',
      username: 'host',
      name: 'Local Quiz',
      questions: []
    };

    expect(saveQuiz(quiz)).toBe(true);
    expect(loadQuiz(quiz.id)).toEqual(quiz);
    expect(getQuizList('host')).toEqual(['quiz_local']);
    expect(getAllQuizzesForUser('host')).toEqual([quiz]);

    expect(deleteQuiz(quiz)).toBe(true);
    expect(loadQuiz(quiz.id)).toBeNull();
    expect(getQuizList('host')).toEqual([]);
  });

  it('returns safe fallbacks when persisted JSON is broken', () => {
    localStorage.setItem('catchphrase_user_host', '{broken');
    localStorage.setItem('catchphrase_quiz_bad', '{broken');
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(getQuizList('host')).toEqual([]);
    expect(loadQuiz('bad')).toBeNull();
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('generates quiz ids with the expected prefix', () => {
    expect(generateQuizId()).toMatch(/^quiz_\d+_[a-z0-9]+$/);
  });
});
