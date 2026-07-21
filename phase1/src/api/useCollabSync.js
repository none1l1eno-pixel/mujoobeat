import { useCallback, useEffect, useRef, useState } from 'react';
import { WS_BASE, tokenStore } from './client';

const genClientId = () => (crypto.randomUUID ? crypto.randomUUID() : `client-${Date.now()}-${Math.random()}`);

/**
 * 프로젝트 방에 WebSocket으로 붙어 op를 주고받는다 (plan.md Phase 3.5 실시간 동시편집).
 * 자기 자신이 보낸 op는 client_id로 걸러 에코 반영을 막는다.
 */
export function useCollabSync({ projectId, enabled, onRemoteOp, onPresence }) {
  const wsRef = useRef(null);
  const clientIdRef = useRef(genClientId());
  const [connected, setConnected] = useState(false);
  const onRemoteOpRef = useRef(onRemoteOp);
  onRemoteOpRef.current = onRemoteOp;
  const onPresenceRef = useRef(onPresence);
  onPresenceRef.current = onPresence;

  useEffect(() => {
    if (!enabled || !projectId) return undefined;
    const token = tokenStore.getAccess();
    const ws = new WebSocket(`${WS_BASE}/ws/projects/${projectId}/?token=${encodeURIComponent(token ?? '')}`);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);
    ws.onmessage = (ev) => {
      let msg;
      try { msg = JSON.parse(ev.data); } catch { return; }
      if (msg.type === 'op') {
        if (msg.client_id === clientIdRef.current) return; // 내가 보낸 거 에코 무시
        onRemoteOpRef.current?.(msg.op, msg.user);
      } else if (msg.type === 'presence') {
        onPresenceRef.current?.(msg.event, msg.user);
      }
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [projectId, enabled]);

  const sendOp = useCallback((op) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'op', op, client_id: clientIdRef.current }));
    }
  }, []);

  const sendSnapshot = useCallback((tracks) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'snapshot', tracks, client_id: clientIdRef.current }));
    }
  }, []);

  return { connected, sendOp, sendSnapshot };
}
