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

const PRESENCE_PING_MS = 1500;
const PRESENCE_STALE_MS = 5000;
const RELAY_HEARTBEAT_MS = 2000;
const RELAY_POLL_MS = 800;

export const QuizProvider = ({ children, initialQuiz, role = 'controller', hostPeerId = null }) => {
  const [state, dispatch] = useReducer(quizReducer, initialQuiz);
  const channelRef = useRef(null);
  const isRemoteUpdate = useRef(false);
  const stateRef = useRef(state);
  const localPeersRef = useRef(new Map());
  const remotePresenceRef = useRef({ controller: 0, display: 0 });
  const relayVersionRef = useRef(0);
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
    for (const peerEntry of localPeersRef.current.values()) {
      const localRole =
        typeof peerEntry === 'string'
          ? peerEntry
          : peerEntry?.role;
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
      if (!sender || sender === clientId || !senderRole) return;
      const now = Date.now();
      const prev = localPeersRef.current.get(sender);

      if (prev && typeof prev === 'object' && prev.role === senderRole) {
        prev.lastSeen = now;
        return;
      }

      localPeersRef.current.set(sender, { role: senderRole, lastSeen: now });
      refreshPresence();
    };

    const untrackPeer = (sender) => {
      if (!sender || sender === clientId) return;
      if (!localPeersRef.current.has(sender)) return;
      localPeersRef.current.delete(sender);
      refreshPresence();
    };

    const sweepStalePeers = () => {
      const now = Date.now();
      let changed = false;
      for (const [sender, peerEntry] of localPeersRef.current.entries()) {
        if (sender === clientId) continue;
        const lastSeen =
          typeof peerEntry === 'object' && typeof peerEntry.lastSeen === 'number'
            ? peerEntry.lastSeen
            : 0;
        if (now - lastSeen > PRESENCE_STALE_MS) {
          localPeersRef.current.delete(sender);
          changed = true;
        }
      }
      if (changed) refreshPresence();
    };

    channel.onmessage = (event) => {
      const msg = event.data;
      if (!msg || msg.sender === clientId) return;
      if (quizId && msg.quizId && msg.quizId !== quizId) return;

      trackPeer(msg.sender, msg.senderRole);
      if (msg.to && msg.to !== clientId) return;

      if (msg.type === 'HELLO') {
        send({ type: 'HELLO_ACK', to: msg.sender });
        return;
      }

      if (msg.type === 'HELLO_ACK') {
        return;
      }

      if (msg.type === 'PING') {
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
    const pingIntervalId = window.setInterval(() => {
      send({ type: 'PING' });
      sweepStalePeers();
    }, PRESENCE_PING_MS);

    const handleBeforeUnload = () => {
      send({ type: 'GOODBYE' });
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.clearInterval(pingIntervalId);
      if (channelRef.current) {
        send({ type: 'GOODBYE' });
        channelRef.current.close();
      }
    };
  }, [applySyncedState, channelName, clientId, initialQuiz?.id, refreshPresence, role]); // Only re-init if quiz/role changes

  // Server relay sync (cross-device, no DB required).
  useEffect(() => {
    const quizId = initialQuiz?.id;
    if (!quizId || typeof window === 'undefined') return;

    const relayBase = `/api/realtime/${encodeURIComponent(quizId)}`;
    const aborter = new AbortController();

    const applyRelayResponse = (payload) => {
      if (!payload || typeof payload !== 'object') return;

      if (typeof payload.version === 'number') {
        relayVersionRef.current = Math.max(relayVersionRef.current, payload.version);
      }

      const presencePayload = payload.presence;
      if (presencePayload && typeof presencePayload === 'object') {
        remotePresenceRef.current = {
          controller: Number(presencePayload.controller || 0),
          display: Number(presencePayload.display || 0)
        };
        refreshPresence();
      }

      if (payload.state?.id === quizId) {
        applySyncedState(payload.state);
        if (role === 'display') {
          setSyncStatus('connected');
        }
      } else if (role === 'display') {
        setSyncStatus('connecting');
      }
    };

    const relayPost = async (kind, payload = null) => {
      try {
        const response = await fetch(relayBase, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: aborter.signal,
          body: JSON.stringify({
            kind,
            role,
            clientId,
            state: payload
          })
        });
        if (!response.ok) throw new Error('relay_post_failed');
        const data = await response.json();
        applyRelayResponse(data);
      } catch {
        if (aborter.signal.aborted) return;
        if (role === 'display') setSyncStatus('error');
      }
    };

    const relayPull = async () => {
      try {
        const response = await fetch(relayBase, {
          method: 'GET',
          cache: 'no-store',
          signal: aborter.signal
        });
        if (!response.ok) throw new Error('relay_pull_failed');
        const data = await response.json();
        applyRelayResponse(data);
      } catch {
        if (aborter.signal.aborted) return;
        if (role === 'display') setSyncStatus('error');
      }
    };

    const heartbeatId = window.setInterval(() => {
      void relayPost('heartbeat');
    }, RELAY_HEARTBEAT_MS);

    let pollId = null;
    if (role === 'display') {
      setSyncStatus('connecting');
      void relayPull();
      pollId = window.setInterval(() => {
        void relayPull();
      }, RELAY_POLL_MS);
    } else {
      setSyncStatus('ready');
    }

    return () => {
      aborter.abort();
      window.clearInterval(heartbeatId);
      if (pollId) window.clearInterval(pollId);
      setSyncStatus('local');
    };
  }, [applySyncedState, clientId, initialQuiz?.id, refreshPresence, role]);

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

      // Push latest state to relay so displays on other devices can pull updates.
      void fetch(`/api/realtime/${encodeURIComponent(state.id)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'state',
          role,
          clientId,
          state
        })
      })
        .then((response) => (response.ok ? response.json() : null))
        .then((payload) => {
          if (!payload || typeof payload.version !== 'number') return;
          relayVersionRef.current = Math.max(relayVersionRef.current, payload.version);
          if (payload.presence && typeof payload.presence === 'object') {
            remotePresenceRef.current = {
              controller: Number(payload.presence.controller || 0),
              display: Number(payload.presence.display || 0)
            };
            refreshPresence();
          }
        })
        .catch(() => {
          // no-op: local dev may not expose /api without `vercel dev`
        });
    }

    // Reset remote update flag for next cycle
    isRemoteUpdate.current = false;

    const timeoutId = setTimeout(() => {
      if (isController) saveQuiz(state);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [state, clientId, refreshPresence, role]);

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
