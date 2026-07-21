import { useState } from 'react';
import { createSuggestion } from '../api/community';

export default function SuggestionBox() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);

  const close = () => {
    setOpen(false);
    setText('');
    setDone(false);
    setError(null);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    setError(null);
    try {
      await createSuggestion(text.trim());
      setDone(true);
      setText('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="widget-anchor">
      <button className="icon-btn" onClick={() => setOpen(true)} title="건의하기" aria-label="건의하기">✏️</button>
      {open && (
        <div className="modal-backdrop" onClick={close}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <h3>건의하기</h3>
            {done ? (
              <>
                <p>건의사항이 전달됐어요. 고마워요!</p>
                <button className="ghost" onClick={close}>닫기</button>
              </>
            ) : (
              <form onSubmit={submit}>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="불편한 점이나 원하는 기능을 적어주세요"
                  rows={5}
                  autoFocus
                />
                {error && <p className="auth-error">{error}</p>}
                <div className="modal-actions">
                  <button type="button" className="ghost" onClick={close}>취소</button>
                  <button type="submit" disabled={sending || !text.trim()}>
                    {sending ? '보내는 중...' : '보내기'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
