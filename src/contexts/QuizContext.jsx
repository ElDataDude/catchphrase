import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
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

const createClientId = () => {
  if (typeof crypto !== 'undefined' && crypto?.randomUUID) return crypto.randomUUID();
  return `client_${Date.now()}_${Math.random().toString(36).slice(2)}`;
};

const createHostPeerId = (quizId) => {
  const shortQuizId = String(quizId || 'quiz').replace(/[^a-zA-Z0-9]/g, '').slice(-12);
  const suffix = Math.random().toString(36).slice(2, 8);
  return `host_${shortQuizId}_${suffix}`;
};

export const QuizProvider = ({ children, initialQuiz, role = 'controller', hostPeerId = null }) => {
  const [state, dispatch] = useReducer(quizReducer, initialQuiz);
  const channelRef = useRef(null);
  const peerRef = useRef(null);
  const peerConnectionsRef = useRef(new Map());
  const displayConnRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const isRemoteUpdate = useRef(false);
  const stateRef = useRef(state);
  const localPeersRef = useRef(new Map());
  const remotePresenceRef = useRef({ controller: 0, display: 0 });
  const [presence, setPresence] = useState({ controller: 0, display: 0 });
  const [syncStatus, setSyncStatus] = useState('local');

  const clientId = useMemo(() => createClientId(), []);

  const resolvedHostPeerId = useMemo(() => {
    if (!initialQuiz?.id) return hostPeerId;
    if (role !== 'controller') return hostPeerId;

    if (typeof window === 'undefined') return hostPeerId;

    const key = `catchphrase_host_peer_${initialQuiz.id}`;
    if (hostPeerId) {
      localStorage.setItem(key, hostPeerId);
      return hostPeerId;
    }

    const stored = localStorage.getItem(key);
    if (stored) return stored;

    const generated = createHostPeerId(initialQuiz.id);
    localStorage.setItem(key, generated);
    return generated;
  }, [initialQuiz?.id, role, hostPeerId]);

  const channelName = useMemo(() => {
    const id = initialQuiz?.id || state?.id || 'unknown';
    return `quiz_sync_${id}`;
  }, [initialQuiz?.id]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const refreshPresence = useCallback(() => {
    const counts = { controller: 0, display: 0 };
    for (const localRole of localPeersRef.current.values()) {
      if (localRole === 'controller') counts.controller += 1;
      if (localRole === 'display') counts.display += 1;
    }
    counts.controller += remotePresenceRef.current.controller;
    counts.display += remotePresenceRef.current.display;
    setPresence(counts);
  }, []);

  const applySyncedState = useCallback((newState) => {
    if (!newState || !newState.id) return;

    const expectedId = initialQuiz?.id || stateRef.current?.id;
    if (expectedId && newState.id !== expectedId) return;

    isRemoteUpdate.current = true;
    dispatch({
      type: 'LOAD_QUIZ',
      payload: { ...newState, isPlaceholder: false }
    });
  }, [dispatch, initialQuiz?.id]);

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
      const prev = localPeersRef.current.get(sender);
      if (prev === senderRole) return;
      localPeersRef.current.set(sender, senderRole);
      refreshPresence();
    };

    const untrackPeer = (sender) => {
      if (!sender || sender === clientId) return;
      if (!localPeersRef.current.has(sender)) return;
      localPeersRef.current.delete(sender);
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
        applySyncedState(msg.payload);
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
  }, [applySyncedState, channelName, clientId, initialQuiz?.id, refreshPresence, role]); // Only re-init if quiz/role changes

  // WebRTC sync for cross-device control/display.
  useEffect(() => {
    if (!initialQuiz?.id || typeof window === 'undefined') return;

    let isCancelled = false;

    const recalcRemotePresence = () => {
      if (role === 'controller') {
        let openDisplays = 0;
        for (const conn of peerConnectionsRef.current.values()) {
          if (conn?.open) openDisplays += 1;
        }
        remotePresenceRef.current.display = openDisplays;
      } else {
        remotePresenceRef.current.controller = displayConnRef.current?.open ? 1 : 0;
      }
      refreshPresence();
    };

    const clearReconnect = () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    const scheduleReconnect = (connectFn) => {
      clearReconnect();
      reconnectTimeoutRef.current = setTimeout(() => {
        if (!isCancelled) connectFn();
      }, 1200);
    };

    const handleIncomingMessage = (message, conn) => {
      if (!message || typeof message !== 'object') return;

      if (message.type === 'REQUEST_SYNC' && role === 'controller') {
        const latest = stateRef.current;
        if (latest && conn?.open) {
          try {
            conn.send({ type: 'SYNC_STATE_UPDATE', payload: latest });
          } catch {
            // no-op
          }
        }
        return;
      }

      if (message.type === 'SYNC_STATE_UPDATE') {
        applySyncedState(message.payload);
      }
    };

    const attachConnectionEvents = (conn, { onDisconnect }) => {
      conn.on('data', (message) => handleIncomingMessage(message, conn));
      conn.on('error', () => onDisconnect());
      conn.on('close', () => onDisconnect());
    };

    const setupPeer = async () => {
      try {
        const { default: Peer } = await import('peerjs');
        if (isCancelled) return;

        const peer =
          role === 'controller'
            ? new Peer(resolvedHostPeerId)
            : new Peer();

        peerRef.current = peer;

        if (role === 'controller') {
          setSyncStatus('connecting');
          peer.on('open', () => {
            if (isCancelled) return;
            setSyncStatus('ready');
          });

          peer.on('connection', (conn) => {
            peerConnectionsRef.current.set(conn.peer, conn);

            attachConnectionEvents(conn, {
              onDisconnect: () => {
                peerConnectionsRef.current.delete(conn.peer);
                recalcRemotePresence();
                if (peerConnectionsRef.current.size === 0) {
                  setSyncStatus('ready');
                }
              }
            });

            conn.on('open', () => {
              recalcRemotePresence();
              setSyncStatus('connected');
              const latest = stateRef.current;
              if (latest) {
                try {
                  conn.send({ type: 'SYNC_STATE_UPDATE', payload: latest });
                } catch {
                  // no-op
                }
              }
            });
          });
        } else if (resolvedHostPeerId) {
          setSyncStatus('connecting');

          const connectToController = () => {
            if (!peerRef.current || isCancelled) return;
            const conn = peerRef.current.connect(resolvedHostPeerId, { reliable: true });
            displayConnRef.current = conn;

            attachConnectionEvents(conn, {
              onDisconnect: () => {
                if (displayConnRef.current === conn) {
                  displayConnRef.current = null;
                }
                recalcRemotePresence();
                setSyncStatus('connecting');
                scheduleReconnect(connectToController);
              }
            });

            conn.on('open', () => {
              clearReconnect();
              recalcRemotePresence();
              setSyncStatus('connected');
              try {
                conn.send({ type: 'REQUEST_SYNC' });
              } catch {
                // no-op
              }
            });
          };

          peer.on('open', () => {
            if (isCancelled) return;
            connectToController();
          });
        }

        peer.on('error', () => {
          setSyncStatus('error');
        });
      } catch {
        setSyncStatus('error');
      }
    };

    setupPeer();

    return () => {
      isCancelled = true;
      clearReconnect();
      if (displayConnRef.current) {
        displayConnRef.current.close();
        displayConnRef.current = null;
      }
      for (const conn of peerConnectionsRef.current.values()) {
        try {
          conn.close();
        } catch {
          // no-op
        }
      }
      peerConnectionsRef.current.clear();
      if (peerRef.current) {
        try {
          peerRef.current.destroy();
        } catch {
          // no-op
        }
        peerRef.current = null;
      }
      remotePresenceRef.current = { controller: 0, display: 0 };
      refreshPresence();
      setSyncStatus('local');
    };
  }, [applySyncedState, initialQuiz?.id, refreshPresence, resolvedHostPeerId, role]);

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

      for (const conn of peerConnectionsRef.current.values()) {
        if (!conn?.open) continue;
        try {
          conn.send({ type: 'SYNC_STATE_UPDATE', payload: state });
        } catch {
          // no-op
        }
      }
    }

    // Reset remote update flag for next cycle
    isRemoteUpdate.current = false;

    const timeoutId = setTimeout(() => {
      if (isController) saveQuiz(state);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [state, clientId, role]);

  return (
    <QuizContext.Provider
      value={{
        state,
        dispatch,
        presence,
        hostPeerId: resolvedHostPeerId,
        syncStatus
      }}
    >
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
