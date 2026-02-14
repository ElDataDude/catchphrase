// Helper functions for quiz logic

export const GRID_SQUARES = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export const createEmptyQuestion = (imageUrl = '', type = 'image', videoUrl = '', startTime = 0) => {
  return {
    id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type, // 'image' or 'video'
    imageUrl,
    videoUrl,
    startTime: parseInt(startTime, 10) || 0,
    revealedSquares: [],
    revealHistory: [],
    revealSequence: null,
    // Deprecated: compute next in sequence from revealedSquares + revealSequence.
    currentSequenceIndex: 0,
    timerMode: {
      enabled: false,
      interval: 5000,
      isRunning: false,
      currentSquare: 0
    }
  };
};

export const createEmptyQuiz = (username, name) => {
  return {
    id: `quiz_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    username,
    name,
    createdAt: new Date().toISOString(),
    questions: [],
    currentQuestionIndex: 0,
    viewMode: 'controller'
  };
};

export const getUnrevealedSquares = (question) => {
  return GRID_SQUARES.filter(sq => !question.revealedSquares.includes(sq));
};

export const getRandomUnrevealedSquare = (question) => {
  const unrevealed = getUnrevealedSquares(question);
  if (unrevealed.length === 0) return null;
  return unrevealed[Math.floor(Math.random() * unrevealed.length)];
};

export const getNextSequenceSquare = (question) => {
  if (!question.revealSequence || question.revealSequence.length === 0) {
    return null;
  }

  // Always derive "next" from what's still hidden so manual/random reveals
  // don't corrupt the sequence progression.
  return question.revealSequence.find((sq) => !question.revealedSquares.includes(sq)) ?? null;
};

export const isSquareRevealed = (question, squareNumber) => {
  return question.revealedSquares.includes(squareNumber);
};

export const areAllSquaresRevealed = (question) => {
  return question.revealedSquares.length === 9;
};
