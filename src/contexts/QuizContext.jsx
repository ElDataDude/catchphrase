import React, { createContext, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { saveQuiz } from '../utils/storage';

const QuizContext = createContext(null);

const quizReducer = (state, action) => {
  switch (action.type) {
    case 'LOAD_QUIZ':
      return action.payload;

    case 'SET_VIEW_MODE':
      return { ...state, viewMode: action.payload };

    case 'SET_CURRENT_QUESTION':
      return { ...state, currentQuestionIndex: action.payload };

    case 'REVEAL_SQUARE':
      return {
        ...state,
        questions: state.questions.map((q, idx) =>
          idx === state.currentQuestionIndex
            ? (() => {
                const revealedSquares = [...new Set([...q.revealedSquares, action.payload])];
                const nextRevealed = new Set(revealedSquares);
                const currentSequenceIndex =
                  q.revealSequence && q.revealSequence.length > 0
                    ? (() => {
                        const firstMissing = q.revealSequence.findIndex((sq) => !nextRevealed.has(sq));
                        return firstMissing === -1 ? q.revealSequence.length : firstMissing;
                      })()
                    : 0;
                return { ...q, revealedSquares, currentSequenceIndex };
              })()
            : q
        )
      };

    case 'SET_REVEAL_SEQUENCE':
      return {
        ...state,
        questions: state.questions.map((q, idx) =>
          idx === state.currentQuestionIndex
            ? (() => {
                const revealSequence = action.payload;
                if (!revealSequence || revealSequence.length === 0) {
                  return { ...q, revealSequence: null, currentSequenceIndex: 0 };
                }
                const revealed = new Set(q.revealedSquares);
                const firstMissing = revealSequence.findIndex((sq) => !revealed.has(sq));
                return {
                  ...q,
                  revealSequence,
                  currentSequenceIndex: firstMissing === -1 ? revealSequence.length : firstMissing
                };
              })()
            : q
        )
      };

    case 'RESET_CURRENT_QUESTION':
      return {
        ...state,
        questions: state.questions.map((q, idx) =>
          idx === state.currentQuestionIndex
            ? {
                ...q,
                revealedSquares: [],
                currentSequenceIndex: 0,
                timerMode: { ...q.timerMode, isRunning: false, currentSquare: 0 }
              }
            : q
        )
      };

    case 'RESET_ALL_QUESTIONS':
      return {
        ...state,
        currentQuestionIndex: 0,
        questions: state.questions.map(q => ({
          ...q,
          revealedSquares: [],
          currentSequenceIndex: 0,
          timerMode: { ...q.timerMode, isRunning: false, currentSquare: 0 }
        }))
      };

    case 'UPDATE_TIMER_MODE':
      return {
        ...state,
        questions: state.questions.map((q, idx) =>
          idx === state.currentQuestionIndex
            ? { ...q, timerMode: { ...q.timerMode, ...action.payload } }
            : q
        )
      };

    case 'ADD_QUESTION':
      return {
        ...state,
        questions: [...state.questions, action.payload]
      };

    case 'UPDATE_QUESTION':
      return {
        ...state,
        questions: state.questions.map((q, idx) =>
          idx === action.payload.index
            ? { ...q, ...action.payload.data }
            : q
        )
      };

    case 'REMOVE_QUESTION':
      return {
        ...state,
        questions: state.questions.filter((_, idx) => idx !== action.payload),
        currentQuestionIndex: Math.min(state.currentQuestionIndex, state.questions.length - 2)
      };

    default:
      return state;
  }
};

export const QuizProvider = ({ children, initialQuiz, role = 'controller' }) => {
  const [state, dispatch] = useReducer(quizReducer, initialQuiz);
  const channelRef = useRef(null);
  const isRemoteUpdate = useRef(false);
  const stateRef = useRef(state);
  const peersRef = useRef(new Map());
  const [presence, setPresence] = useState({ controller: 0, display: 0 });

  const clientId = useMemo(() => {
    if (typeof crypto !== 'undefined' && crypto?.randomUUID) return crypto.randomUUID();
    return `client_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  }, []);

  const channelName = useMemo(() => {
    const id = initialQuiz?.id || state?.id || 'unknown';
    return `quiz_sync_${id}`;
  }, [initialQuiz?.id]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const refreshPresence = () => {
    const counts = { controller: 0, display: 0 };
    for (const role of peersRef.current.values()) {
      if (role === 'controller') counts.controller += 1;
      if (role === 'display') counts.display += 1;
    }
    setPresence(counts);
  };

  // Initialize BroadcastChannel
  useEffect(() => {
    const quizId = initialQuiz?.id;
    const channel = new BroadcastChannel(channelName);
    channelRef.current = channel;

    const send = (message) => {
      try {
        channel.postMessage({
          quizId,
          sender: clientId,
          senderRole: role,
          ...message
        });
      } catch {
        // no-op: BroadcastChannel can throw in unsupported contexts
      }
    };

    const trackPeer = (sender, senderRole) => {
      if (!sender || sender === clientId) return;
      if (!senderRole) return;
      const prev = peersRef.current.get(sender);
      if (prev === senderRole) return;
      peersRef.current.set(sender, senderRole);
      refreshPresence();
    };

    const untrackPeer = (sender) => {
      if (!sender || sender === clientId) return;
      if (!peersRef.current.has(sender)) return;
      peersRef.current.delete(sender);
      refreshPresence();
    };

    channel.onmessage = (event) => {
      const msg = event.data;
      if (!msg || msg.sender === clientId) return;
      if (quizId && msg.quizId && msg.quizId !== quizId) return;
      if (msg.to && msg.to !== clientId) return;

      if (msg.type === 'HELLO') {
        trackPeer(msg.sender, msg.senderRole);
        send({ type: 'HELLO_ACK', to: msg.sender });
        return;
      }

      if (msg.type === 'HELLO_ACK') {
        trackPeer(msg.sender, msg.senderRole);
        return;
      }

      if (msg.type === 'GOODBYE') {
        untrackPeer(msg.sender);
        return;
      }

      if (msg.type === 'REQUEST_SYNC') {
        // Avoid stale displays "winning" by making the controller authoritative.
        if (role !== 'controller') return;
        const latest = stateRef.current;
        if (!latest) return;
        send({ type: 'SYNC_STATE_UPDATE', to: msg.sender, payload: latest });
        return;
      }

      if (msg.type === 'SYNC_STATE_UPDATE') {
        const newState = msg.payload;
        if (!newState) return;
        if (quizId && newState.id && newState.id !== quizId) return;
        isRemoteUpdate.current = true;
        dispatch({ type: 'LOAD_QUIZ', payload: newState });
        return;
      }
    };

    // Announce + request the latest state from any existing controller tab.
    send({ type: 'HELLO' });
    send({ type: 'REQUEST_SYNC' });

    const handleBeforeUnload = () => {
      send({ type: 'GOODBYE' });
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (channelRef.current) {
        send({ type: 'GOODBYE' });
        channelRef.current.close();
      }
    };
  }, [channelName, clientId, initialQuiz?.id, role]); // Only re-init if quiz/role changes

  // Auto-save to LocalStorage on state changes (debounced)
  // AND broadcast changes to other tabs
  useEffect(() => {
    if (!state || !state.id) return;

    const isController = role === 'controller';

    // Only the controller is allowed to broadcast/save. This prevents a newly-opened
    // display tab (with potentially stale LocalStorage) from clobbering state.
    if (isController && !isRemoteUpdate.current && channelRef.current) {
      channelRef.current.postMessage({
        quizId: state.id,
        sender: clientId,
        senderRole: role,
        type: 'SYNC_STATE_UPDATE',
        payload: state
      });
    }

    // Reset remote update flag for next cycle
    isRemoteUpdate.current = false;

    const timeoutId = setTimeout(() => {
      if (isController) saveQuiz(state);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [state, clientId, role]);

  return (
    <QuizContext.Provider value={{ state, dispatch, presence }}>
      {children}
    </QuizContext.Provider>
  );
};

export const useQuiz = () => {
  const context = useContext(QuizContext);
  if (!context) {
    throw new Error('useQuiz must be used within a QuizProvider');
  }
  return context;
};
