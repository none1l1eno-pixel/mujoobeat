import { useEffect, useRef, useState } from 'react';
import { deleteChatMessage, listChatHistory } from '../api/community';
import { useGlobalChat } from '../api/useGlobalChat';

export default function GlobalChat({ currentUserId, isAdmin }) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [text, setText] = useState('');
  const listRef = useRef(null);
  const openRef = useRef(open);
  openRef.current = open;

  const handleLiveMessage = () => {
    if (!openRef.current) setUnread((u) => u + 1);
  };

  const { connected, messages, sendMessage, seedHistory } = useGlobalChat({
    enabled: true,
    onMessage: handleLiveMessage,
  });

  useEffect(() => {
    listChatHistory().then(seedHistory).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (open && listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, open]);

  const toggle = () => {
    setOpen((o) => !o);
    setUnread(0);
  };

  const submit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    sendMessage(text.trim());
    setText('');
  };

  const handleDelete = (id) => {
    if (!id) return;
    deleteChatMessage(id).catch(() => {});
  };

  return (
    <>
      <button className="global-chat-fab" onClick={toggle} title="전체 채팅" aria-label="전체 채팅">
        💬
        {unread > 0 && !open && <span className="icon-badge">{unread}</span>}
      </button>
      {open && (
        <div className="global-chat-panel">
          <div className="global-chat-header">
            <span>전체 채팅</span>
            <span className={`collab-status ${connected ? 'on' : 'off'}`}>{connected ? '연결됨' : '연결 중...'}</span>
            <button className="ghost" onClick={() => setOpen(false)}>✕</button>
          </div>
          <div className="global-chat-messages" ref={listRef}>
            {messages.length === 0 && <p className="empty-hint">첫 메시지를 남겨보세요.</p>}
            {messages.map((m, i) => (
              <div key={m.id ?? i} className={`chat-msg ${m.user?.id === currentUserId ? 'mine' : ''}`}>
                <span className="chat-msg-author">{m.user?.display_name || m.user?.email}</span>
                <span className="chat-msg-text">
                  {m.message}
                  {isAdmin && (
                    <button className="chat-msg-delete" onClick={() => handleDelete(m.id)} title="메시지 삭제" aria-label="메시지 삭제">×</button>
                  )}
                </span>
              </div>
            ))}
          </div>
          <form className="global-chat-input" onSubmit={submit}>
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="메시지 입력..." />
            <button type="submit" disabled={!text.trim()}>전송</button>
          </form>
        </div>
      )}
    </>
  );
}
