import {
  GRID_SQUARES,
  areAllSquaresRevealed,
  createQuiz,
  ensureQuizV2,
  getNextSequenceSquare
} from './quizSchema';

const liveActionTypes = new Set([
  'SET_SCENE',
  'SET_CURRENT_QUESTION',
  'NEXT_QUESTION',
  'PREV_QUESTION',
  'REVEAL_SQUARE',
  'REVEAL_RANDOM',
  'ADVANCE_REVEAL',
  'UNDO_LAST_REVEAL',
  'REVEAL_ALL',
  'SET_REVEAL_SEQUENCE',
  'RESET_CURRENT_QUESTION',
  'RESET_ALL_QUESTIONS',
  'SET_TIMER_INTERVAL',
  'START_TIMER',
  'PAUSE_TIMER',
  'STOP_TIMER'
]);

const nextTimestamp = () => new Date().toISOString();

const bumpLiveState = (state: any, action: any) => {
  if (action?.meta?.remote || !liveActionTypes.has(action.type)) return state;
  return {
    ...state,
    updatedAt: nextTimestamp(),
    lastPlayedAt: nextTimestamp(),
    liveState: {
      ...state.liveState,
      syncVersion: (state.liveState?.syncVersion || 0) + 1
    }
  };
};

const updateCurrentQuestion = (state: any, updater: (_question: any) => any) => ({
  ...state,
  questions: state.questions.map((question: any, index: number) =>
    index === state.liveState.currentQuestionIndex ? updater(question) : question
  )
});

const setScene = (state: any, scene: string) => ({
  ...state,
  liveState: {
    ...state.liveState,
    scene
  }
});

const revealSquare = (state: any, squareNumber: number) => {
  if (!squareNumber) return state;

  return updateCurrentQuestion(state, (question) => {
    if (question.reveal.revealedSquares.includes(squareNumber)) return question;
    return {
      ...question,
      reveal: {
        ...question.reveal,
        revealedSquares: [...question.reveal.revealedSquares, squareNumber],
        revealHistory: [...question.reveal.revealHistory, squareNumber]
      }
    };
  });
};

const resetCurrentQuestion = (state: any) =>
  updateCurrentQuestion(state, (question) => ({
    ...question,
    reveal: {
      ...question.reveal,
      revealedSquares: [],
      revealHistory: []
    }
  }));

export const quizReducer = (inputState: any, action: any) => {
  const state = ensureQuizV2(inputState || createQuiz());

  if (action.type === 'LOAD_QUIZ') return ensureQuizV2(action.payload);

  let nextState = state;
  switch (action.type) {
    case 'SET_SCENE':
      nextState = setScene(state, action.payload);
      break;
    case 'SET_CURRENT_QUESTION':
      nextState = {
        ...state,
        liveState: {
          ...state.liveState,
          currentQuestionIndex: Math.max(0, Math.min(action.payload, state.questions.length - 1)),
          scene: 'title',
          timer: {
            ...state.liveState.timer,
            isRunning: false,
            startedAt: null
          }
        }
      };
      break;
    case 'NEXT_QUESTION':
      nextState = {
        ...state,
        liveState: {
          ...state.liveState,
          currentQuestionIndex: Math.min(state.liveState.currentQuestionIndex + 1, state.questions.length - 1),
          scene: 'title',
          timer: {
            ...state.liveState.timer,
            isRunning: false,
            startedAt: null
          }
        }
      };
      break;
    case 'PREV_QUESTION':
      nextState = {
        ...state,
        liveState: {
          ...state.liveState,
          currentQuestionIndex: Math.max(state.liveState.currentQuestionIndex - 1, 0),
          scene: 'title',
          timer: {
            ...state.liveState.timer,
            isRunning: false,
            startedAt: null
          }
        }
      };
      break;
    case 'REVEAL_SQUARE':
      nextState = setScene(revealSquare(state, action.payload), 'question');
      break;
    case 'REVEAL_RANDOM': {
      const current = state.questions[state.liveState.currentQuestionIndex];
      const unrevealed = GRID_SQUARES.filter((square) => !current.reveal.revealedSquares.includes(square));
      if (unrevealed.length === 0) {
        nextState = state;
        break;
      }
      nextState = setScene(revealSquare(state, unrevealed[Math.floor(Math.random() * unrevealed.length)]), 'question');
      break;
    }
    case 'ADVANCE_REVEAL': {
      if (state.liveState.scene !== 'question') {
        nextState = setScene(state, 'question');
        break;
      }
      const current = state.questions[state.liveState.currentQuestionIndex];
      if (areAllSquaresRevealed(current)) {
        nextState = state;
        break;
      }
      const nextSequence = getNextSequenceSquare(current);
      if (nextSequence) {
        nextState = revealSquare(state, nextSequence);
        break;
      }
      const unrevealed = GRID_SQUARES.filter((square) => !current.reveal.revealedSquares.includes(square));
      nextState = unrevealed.length > 0
        ? revealSquare(state, unrevealed[Math.floor(Math.random() * unrevealed.length)])
        : state;
      break;
    }
    case 'UNDO_LAST_REVEAL':
      nextState = updateCurrentQuestion(state, (question) => {
        const history = question.reveal.revealHistory || [];
        if (history.length === 0) return question;
        const last = history[history.length - 1];
        return {
          ...question,
          reveal: {
            ...question.reveal,
            revealedSquares: question.reveal.revealedSquares.filter((square: number) => square !== last),
            revealHistory: history.slice(0, -1)
          }
        };
      });
      break;
    case 'REVEAL_ALL':
      nextState = updateCurrentQuestion(state, (question) => {
        const unrevealed = GRID_SQUARES.filter((square) => !question.reveal.revealedSquares.includes(square));
        if (unrevealed.length === 0) return question;
        return {
          ...question,
          reveal: {
            ...question.reveal,
            revealedSquares: [...question.reveal.revealedSquares, ...unrevealed],
            revealHistory: [...question.reveal.revealHistory, ...unrevealed]
          }
        };
      });
      break;
    case 'SET_REVEAL_SEQUENCE':
      nextState = {
        ...state,
        questions: state.questions.map((question: any, index: number) =>
          index === (action.payload.questionIndex ?? state.liveState.currentQuestionIndex)
            ? {
                ...question,
                reveal: {
                  ...question.reveal,
                  sequence: action.payload.sequence?.length ? action.payload.sequence : null
                }
              }
            : question
        )
      };
      break;
    case 'RESET_CURRENT_QUESTION':
      nextState = resetCurrentQuestion(state);
      break;
    case 'RESET_ALL_QUESTIONS':
      nextState = {
        ...state,
        questions: state.questions.map((question: any) => ({
          ...question,
          reveal: {
            ...question.reveal,
            revealedSquares: [],
            revealHistory: []
          }
        })),
        liveState: {
          ...state.liveState,
          currentQuestionIndex: 0,
          scene: 'title',
          timer: {
            ...state.liveState.timer,
            isRunning: false,
            startedAt: null
          }
        }
      };
      break;
    case 'SET_TIMER_INTERVAL':
      nextState = {
        ...state,
        liveState: {
          ...state.liveState,
          timer: {
            ...state.liveState.timer,
            intervalMs: action.payload
          }
        }
      };
      break;
    case 'START_TIMER':
      nextState = {
        ...state,
        liveState: {
          ...state.liveState,
          scene: 'question',
          timer: {
            ...state.liveState.timer,
            enabled: true,
            isRunning: true,
            startedAt: nextTimestamp()
          }
        }
      };
      break;
    case 'PAUSE_TIMER':
      nextState = {
        ...state,
        liveState: {
          ...state.liveState,
          timer: {
            ...state.liveState.timer,
            isRunning: false,
            startedAt: null
          }
        }
      };
      break;
    case 'STOP_TIMER':
      nextState = {
        ...state,
        liveState: {
          ...state.liveState,
          timer: {
            ...state.liveState.timer,
            isRunning: false,
            startedAt: null
          }
        }
      };
      break;
    case 'APPLY_ASSET_STATUS':
      nextState = {
        ...state,
        questions: state.questions.map((question: any, index: number) =>
          index === action.payload.questionIndex
            ? {
                ...question,
                assetStatus: action.payload.assetStatus
              }
            : question
        ),
        updatedAt: nextTimestamp()
      };
      break;
    default:
      nextState = state;
      break;
  }

  return bumpLiveState(nextState, action);
};
