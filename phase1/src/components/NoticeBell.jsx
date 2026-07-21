import { useEffect, useState } from 'react';
import { listAnnouncements } from '../api/community';

const SEEN_KEY = 'music_studio_notice_seen_at';

export default function NoticeBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    listAnnouncements().then((data) => {
      setItems(data);
      const seenAt = localStorage.getItem(SEEN_KEY);
      const latest = data[0]?.created_at;
      setHasUnread(!!latest && (!seenAt || new Date(latest) > new Date(seenAt)));
    }).catch(() => {});
  }, []);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (!next) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listAnnouncements();
      setItems(data);
      if (data[0]) localStorage.setItem(SEEN_KEY, data[0].created_at);
      setHasUnread(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="widget-anchor">
      <button className="icon-btn" onClick={toggle} title="공지사항" aria-label="공지사항">
        🔔
        {hasUnread && <span className="icon-badge" />}
      </button>
      {open && (
        <div className="dropdown-panel notice-dropdown">
          <h3>공지사항</h3>
          {loading && <p className="loading">불러오는 중...</p>}
          {error && <p className="auth-error">{error}</p>}
          {!loading && !error && items.length === 0 && <p className="empty-hint">공지사항이 없어요.</p>}
          <ul className="notice-list">
            {items.map((n) => (
              <li key={n.id}>
                <div className="notice-title">{n.title}</div>
                <div className="notice-body">{n.body}</div>
                <div className="notice-date">{new Date(n.created_at).toLocaleString('ko-KR')}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
