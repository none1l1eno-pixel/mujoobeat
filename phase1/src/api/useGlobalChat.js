import { useCallback, useEffect, useRef, useState } from 'react';
import { WS_BASE, tokenStore } from './client';

/**
 * 방 구분 없는 전역 채팅 소켓. 로그인한 모든 유저가 같은 채널(global_chat)에 붙는다.
 * 이력은 REST로 따로 불러와 seedHistory로 채우고, 이후 새 메시지만 이 소켓으로 받는다.
 */
export function useGlobalChat({ enabled, onMessage }) {
  const wsRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    if (!enabled) return undefined;
    const token = tokenStore.getAccess();
    const ws = new WebSocket(`${WS_BASE}/ws/chat/global/?token=${encodeURIComponent(token ?? '')}`);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);
    ws.onmessage = (ev) => {
      let msg;
      try { msg = JSON.parse(ev.data); } catch { return; }
      if (msg.type !== 'chat') return;
      setMessages((prev) => [...prev, msg]);
      onMessageRef.current?.(msg);
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [enabled]);

  const sendMessage = useCallback((text) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'chat', message: text }));
    }
  }, []);

  const seedHistory = useCallback((history) => {
    setMessages(history);
  }, []);

  return { connected, messages, sendMessage, seedHistory };
}
