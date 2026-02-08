// LocalStorage utilities for quiz persistence

const USER_QUIZ_LIST_KEY = (username) => `catchphrase_user_${username}`;
const QUIZ_DATA_KEY = (quizId) => `catchphrase_quiz_${quizId}`;

export const generateQuizId = () => {
  return `quiz_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const saveQuizList = (username, quizIds) => {
  try {
    localStorage.setItem(USER_QUIZ_LIST_KEY(username), JSON.stringify(quizIds));
    return true;
  } catch (error) {
    console.error('Error saving quiz list:', error);
    return false;
  }
};

export const getQuizList = (username) => {
  try {
    const data = localStorage.getItem(USER_QUIZ_LIST_KEY(username));
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading quiz list:', error);
    return [];
  }
};

export const saveQuiz = (quiz) => {
  try {
    localStorage.setItem(QUIZ_DATA_KEY(quiz.id), JSON.stringify(quiz));

    // Update user's quiz list
    const quizList = getQuizList(quiz.username);
    if (!quizList.includes(quiz.id)) {
      quizList.push(quiz.id);
      saveQuizList(quiz.username, quizList);
    }

    return true;
  } catch (error) {
    console.error('Error saving quiz:', error);
    return false;
  }
};

export const loadQuiz = (quizId) => {
  try {
    const data = localStorage.getItem(QUIZ_DATA_KEY(quizId));
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error loading quiz:', error);
    return null;
  }
};

export const deleteQuiz = (quiz) => {
  try {
    localStorage.removeItem(QUIZ_DATA_KEY(quiz.id));

    // Remove from user's quiz list
    const quizList = getQuizList(quiz.username);
    const updatedList = quizList.filter(id => id !== quiz.id);
    saveQuizList(quiz.username, updatedList);

    return true;
  } catch (error) {
    console.error('Error deleting quiz:', error);
    return false;
  }
};

export const getAllQuizzesForUser = (username) => {
  const quizIds = getQuizList(username);
  return quizIds.map(id => loadQuiz(id)).filter(quiz => quiz !== null);
};
