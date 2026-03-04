import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState
} from 'react';
import { quizReducer } from '../lib/quizReducer';
import { areAllSquaresRevealed, ensureQuizV2 } from '../lib/quizSchema';
import {
  getDisplaySnapshot,
  rememberLastQuizId,
  saveDisplaySnapshot,
  saveQuiz
} from '../lib/quizStore';
import {
  DISPLAY_STALE_MS,
  PRESENCE_PING_MS,
  PRESENCE_STALE_MS,
  RELAY_HEARTBEAT_MS,
  RELAY_POLL_MS,
  buildRelayUrl,
  createClientId,
  createEnvelope,
  createHostPeerId
} from '../lib/syncClient';

const QuizContext = createContext(null);

const clampPresence = (value) => Math.max(0, Number(value || 0));

export const QuizProvider = ({ children, initialQuiz, role = 'controller', hostPeerId = null }) => {
  const [state, baseDispatch] = useReducer(quizReducer, initialQuiz, ensureQuizV2);
  const [presence, setPresence] = useState({
    controller: role === 'controller' ? 1 : 0,
    display: role === 'display' ? 1 : 0
  });
  const [syncStatus, setSyncStatus] = useState(role === 'display' ? 'connecting' : 'local');
  const [relayHealthy, setRelayHealthy] = useState(false);

  const clientId = useMemo(() => createClientId(), []);
  const channelRef = useRef(null);
  const stateRef = useRef(state);
  const localPeersRef = useRef(new Map());
  const remotePresenceRef = useRef({ controller: 0, display: 0 });
  const lastRemoteStateAtRef = useRef(Date.now());
  const isApplyingRemoteRef = useRef(false);

  const resolvedHostPeerId = useMemo(() => {
    if (!state?.id || role !== 'controller') return hostPeerId;
    const key = `catchphrase_host_peer_${state.id}`;
    if (hostPeerId) {
      localStorage.setItem(key, hostPeerId);
      return hostPeerId;
    }
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const created = createHostPeerId(state.id);
    localStorage.setItem(key, created);
    return created;
  }, [hostPeerId, role, state?.id]);

  const refreshPresence = useCallback(() => {
    const nextPresence = {
      controller: role === 'controller' ? 1 : 0,
      display: role === 'display' ? 1 : 0
    };

    for (const peer of localPeersRef.current.values()) {
      if (peer.role === 'controller') nextPresence.controller += 1;
      if (peer.role === 'display') nextPresence.display += 1;
    }

    nextPresence.controller += remotePresenceRef.current.controller;
    nextPresence.display += remotePresenceRef.current.display;
    setPresence(nextPresence);
  }, [role]);

  const applySyncedState = useCallback(
    (incomingState) => {
      if (!incomingState?.id) return false;
      const normalized = ensureQuizV2(incomingState);
      const expectedId = stateRef.current?.id || normalized.id;
      if (expectedId !== normalized.id) return false;

      const currentVersion = Number(stateRef.current?.liveState?.syncVersion || -1);
      const incomingVersion = Number(normalized.liveState?.syncVersion || 0);

      if (role === 'display' && incomingVersion <= currentVersion && !stateRef.current?.isPlaceholder) {
        return false;
      }

      isApplyingRemoteRef.current = true;
      baseDispatch({
        type: 'LOAD_QUIZ',
        payload: {
          ...normalized,
          isPlaceholder: false
        },
        meta: { remote: true }
      });
      lastRemoteStateAtRef.current = Date.now();
      if (role === 'display') {
        saveDisplaySnapshot(normalized.id, normalized);
        setSyncStatus('live');
      }
      return true;
    },
    [role]
  );

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    refreshPresence();
  }, [refreshPresence]);

  useEffect(() => {
    if (role !== 'controller') return;
    setSyncStatus(presence.display > 0 ? 'live' : relayHealthy ? 'connecting' : 'local');
  }, [presence.display, relayHealthy, role]);

  useEffect(() => {
    if (role !== 'display') return undefined;

    const intervalId = window.setInterval(() => {
      if (Date.now() - lastRemoteStateAtRef.current > DISPLAY_STALE_MS) {
        setSyncStatus((current) => (current === 'error' ? current : 'stale'));
      }
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [role]);

  useEffect(() => {
    const quizId = state?.id;
    if (!quizId || typeof BroadcastChannel === 'undefined') return undefined;

    const channel = new BroadcastChannel(`quiz_sync_${quizId}`);
    channelRef.current = channel;

    const send = (type, extra = {}) => {
      channel.postMessage(createEnvelope(type, quizId, clientId, role, extra));
    };

    const sweepPeers = () => {
      const cutoff = Date.now() - PRESENCE_STALE_MS;
      let changed = false;

      for (const [peerId, peer] of localPeersRef.current.entries()) {
        if (peer.lastSeenAt < cutoff) {
          localPeersRef.current.delete(peerId);
          changed = true;
        }
      }

      if (changed) refreshPresence();
    };

    channel.onmessage = (event) => {
      const message = event.data;
      if (!message || message.clientId === clientId || message.quizId !== quizId) return;

      localPeersRef.current.set(message.clientId, {
        role: message.role,
        lastSeenAt: Date.now()
      });
      refreshPresence();

      if (message.to && message.to !== clientId) return;

      if (message.type === 'REQUEST_SNAPSHOT' && role === 'controller') {
        send('SNAPSHOT_STATE', {
          to: message.clientId,
          syncVersion: stateRef.current.liveState.syncVersion,
          state: stateRef.current
        });
      }

      if ((message.type === 'SNAPSHOT_STATE' || message.type === 'STATE_UPDATE') && role === 'display') {
        applySyncedState(message.state);
      }

      if (message.type === 'GOODBYE') {
        localPeersRef.current.delete(message.clientId);
        refreshPresence();
      }
    };

    if (role === 'display') {
      send('REQUEST_SNAPSHOT');
    }

    const heartbeatId = window.setInterval(() => {
      send('HEARTBEAT');
      sweepPeers();
    }, PRESENCE_PING_MS);

    const handleBeforeUnload = () => send('GOODBYE');
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.clearInterval(heartbeatId);
      send('GOODBYE');
      channel.close();
      channelRef.current = null;
    };
  }, [applySyncedState, clientId, refreshPresence, role, state?.id]);

  useEffect(() => {
    const quizId = state?.id;
    if (!quizId) return undefined;

    const relayUrl = buildRelayUrl(quizId);
    let stopped = false;
    let pollTimeoutId = null;

    const applyRelayResponse = (payload) => {
      if (!payload || typeof payload !== 'object') return;

      remotePresenceRef.current = {
        controller: Math.max(0, clampPresence(payload.presence?.controller) - (role === 'controller' ? 1 : 0)),
        display: Math.max(0, clampPresence(payload.presence?.display) - (role === 'display' ? 1 : 0))
      };
      refreshPresence();

      if (payload.state) {
        applySyncedState(payload.state);
      }
    };

    const relayPost = async (type, payloadState = null) => {
      try {
        const response = await fetch(relayUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type,
            role,
            clientId,
            syncVersion: payloadState?.liveState?.syncVersion || stateRef.current?.liveState?.syncVersion || 0,
            state: payloadState
          })
        });
        if (!response.ok) throw new Error('relay_failed');
        const payload = await response.json();
        setRelayHealthy(true);
        applyRelayResponse(payload);
      } catch {
        setRelayHealthy(false);
        if (role === 'display' && !stateRef.current?.isPlaceholder) {
          setSyncStatus('stale');
        } else if (role === 'display') {
          setSyncStatus('error');
        }
      }
    };

    const relayPull = async () => {
      try {
        const response = await fetch(relayUrl, {
          method: 'GET',
          cache: 'no-store'
        });
        if (!response.ok) throw new Error('relay_failed');
        const payload = await response.json();
        setRelayHealthy(true);
        applyRelayResponse(payload);
      } catch {
        setRelayHealthy(false);
        if (role === 'display' && !stateRef.current?.isPlaceholder) {
          setSyncStatus('stale');
        } else if (role === 'display') {
          setSyncStatus('error');
        }
      } finally {
        if (!stopped && role === 'display') {
          pollTimeoutId = window.setTimeout(relayPull, document.visibilityState === 'hidden' ? RELAY_POLL_MS * 2 : RELAY_POLL_MS);
        }
      }
    };

    const heartbeatId = window.setInterval(() => {
      void relayPost('HEARTBEAT');
    }, RELAY_HEARTBEAT_MS);

    if (role === 'display') {
      setSyncStatus(state.isPlaceholder ? 'connecting' : syncStatus);
      void relayPull();
    }

    return () => {
      stopped = true;
      window.clearInterval(heartbeatId);
      if (pollTimeoutId) window.clearTimeout(pollTimeoutId);
    };
  }, [applySyncedState, clientId, refreshPresence, role, state?.id]);

  useEffect(() => {
    if (!state?.id) return undefined;
    if (role === 'controller' && !isApplyingRemoteRef.current) {
      rememberLastQuizId(state.id);
      const timeoutId = window.setTimeout(() => {
        void saveQuiz({
          ...state,
          isPlaceholder: false
        });
      }, 300);

      if (channelRef.current) {
        channelRef.current.postMessage(
          createEnvelope('STATE_UPDATE', state.id, clientId, role, {
            syncVersion: state.liveState.syncVersion,
            state
          })
        );
      }

      void fetch(buildRelayUrl(state.id), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'STATE_UPDATE',
          role,
          clientId,
          syncVersion: state.liveState.syncVersion,
          state
        })
      })
        .then((response) => (response.ok ? response.json() : null))
        .then((payload) => {
          if (!payload) return;
          setRelayHealthy(true);
          remotePresenceRef.current = {
            controller: Math.max(0, clampPresence(payload.presence?.controller) - 1),
            display: clampPresence(payload.presence?.display)
          };
          refreshPresence();
        })
        .catch(() => {
          setRelayHealthy(false);
        });

      return () => window.clearTimeout(timeoutId);
    }

    isApplyingRemoteRef.current = false;

    if (role === 'display') {
      saveDisplaySnapshot(state.id, state);
    }

    return undefined;
  }, [clientId, refreshPresence, role, state]);

  useEffect(() => {
    if (role !== 'controller' || !state.liveState.timer.isRunning) return undefined;

    const intervalId = window.setInterval(() => {
      const current = stateRef.current.questions[stateRef.current.liveState.currentQuestionIndex];
      if (!current || areAllSquaresRevealed(current)) {
        baseDispatch({ type: 'STOP_TIMER' });
        return;
      }
      baseDispatch({ type: 'ADVANCE_REVEAL' });
    }, state.liveState.timer.intervalMs);

    return () => window.clearInterval(intervalId);
  }, [role, state.liveState.timer.intervalMs, state.liveState.timer.isRunning, state.liveState.currentQuestionIndex]);

  const dispatch = useCallback((action) => {
    baseDispatch(action);
  }, []);

  const actions = useMemo(() => ({
    setScene: (scene) => dispatch({ type: 'SET_SCENE', payload: scene }),
    jumpToQuestion: (index) => dispatch({ type: 'SET_CURRENT_QUESTION', payload: index }),
    nextQuestion: () => dispatch({ type: 'NEXT_QUESTION' }),
    previousQuestion: () => dispatch({ type: 'PREV_QUESTION' }),
    revealSquare: (squareNumber) => dispatch({ type: 'REVEAL_SQUARE', payload: squareNumber }),
    revealRandom: () => dispatch({ type: 'REVEAL_RANDOM' }),
    advanceReveal: () => dispatch({ type: 'ADVANCE_REVEAL' }),
    undoLastReveal: () => dispatch({ type: 'UNDO_LAST_REVEAL' }),
    revealAll: () => dispatch({ type: 'REVEAL_ALL' }),
    setRevealSequence: (questionIndex, sequence) => dispatch({ type: 'SET_REVEAL_SEQUENCE', payload: { questionIndex, sequence } }),
    resetCurrentQuestion: () => dispatch({ type: 'RESET_CURRENT_QUESTION' }),
    resetQuiz: () => dispatch({ type: 'RESET_ALL_QUESTIONS' }),
    setTimerInterval: (interval) => dispatch({ type: 'SET_TIMER_INTERVAL', payload: interval }),
    startTimer: () => dispatch({ type: 'START_TIMER' }),
    pauseTimer: () => dispatch({ type: 'PAUSE_TIMER' }),
    stopTimer: () => dispatch({ type: 'STOP_TIMER' }),
    applyAssetStatus: (questionIndex, assetStatus) => dispatch({ type: 'APPLY_ASSET_STATUS', payload: { questionIndex, assetStatus } })
  }), [dispatch]);

  return (
    <QuizContext.Provider
      value={{
        state,
        role,
        presence,
        syncStatus,
        relayHealthy,
        hostPeerId: resolvedHostPeerId,
        actions
      }}
    >
      {children}
    </QuizContext.Provider>
  );
};

export const useQuiz = () => {
  const context = useContext(QuizContext);
  if (!context) {
    throw new Error('useQuiz must be used within QuizProvider.');
  }
  return context;
};

export const useCachedDisplayState = (quizId) => getDisplaySnapshot(quizId);
