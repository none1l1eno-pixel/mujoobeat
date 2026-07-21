import { useEffect, useState } from 'react';
import { createAnnouncement, listSuggestionsAdmin } from '../api/community';
import { deleteProject, listAllProjectsAdmin } from '../api/projects';

export default function AdminPanel({ onOpenProject }) {
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsError, setSuggestionsError] = useState(null);
  const [projects, setProjects] = useState([]);
  const [projectsError, setProjectsError] = useState(null);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);
  const [sendDone, setSendDone] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setSuggestions(await listSuggestionsAdmin());
    } catch (err) {
      setSuggestionsError(err.message);
    }
    try {
      setProjects(await listAllProjectsAdmin());
    } catch (err) {
      setProjectsError(err.message);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handlePostAnnouncement = async (e) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setSending(true);
    setSendError(null);
    setSendDone(false);
    try {
      await createAnnouncement(title.trim(), body.trim());
      setTitle('');
      setBody('');
      setSendDone(true);
    } catch (err) {
      setSendError(err.message);
    } finally {
      setSending(false);
    }
  };

  const handleDeleteProject = async (id) => {
    if (!confirm('이 프로젝트를 삭제할까요? 되돌릴 수 없어요.')) return;
    try {
      await deleteProject(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="admin-panel">
      <section className="admin-section">
        <h2>공지사항 작성</h2>
        <form className="admin-announcement-form" onSubmit={handlePostAnnouncement}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="내용"
            rows={3}
          />
          {sendError && <p className="auth-error">{sendError}</p>}
          {sendDone && <p className="admin-ok">등록됐어요.</p>}
          <button type="submit" disabled={sending || !title.trim() || !body.trim()}>
            {sending ? '등록 중...' : '공지 등록'}
          </button>
        </form>
      </section>

      <section className="admin-section">
        <h2>건의사항 ({suggestions.length})</h2>
        {suggestionsError && <p className="auth-error">{suggestionsError}</p>}
        {loading && <p className="loading">불러오는 중...</p>}
        {!loading && suggestions.length === 0 && !suggestionsError && <p className="empty-hint">건의사항이 없어요.</p>}
        <ul className="admin-suggestion-list">
          {suggestions.map((s) => (
            <li key={s.id}>
              <div className="admin-suggestion-meta">
                {s.user?.display_name || s.user?.email} · {new Date(s.created_at).toLocaleString('ko-KR')}
              </div>
              <div className="admin-suggestion-text">{s.message}</div>
            </li>
          ))}
        </ul>
      </section>

      <section className="admin-section">
        <h2>전체 프로젝트 ({projects.length})</h2>
        {projectsError && <p className="auth-error">{projectsError}</p>}
        {!loading && projects.length === 0 && !projectsError && <p className="empty-hint">프로젝트가 없어요.</p>}
        <ul className="project-list">
          {projects.map((p) => (
            <li key={p.id} className="project-card">
              <div className="project-card-main" onClick={() => onOpenProject(p.id)}>
                <span className="project-title">{p.title}</span>
                <span className="project-meta">
                  {p.owner?.display_name || p.owner?.email} · BPM {p.bpm} · 트랙 {p.track_count ?? 0}개
                  {p.is_public && <span className="badge">공개</span>}
                </span>
              </div>
              <div className="project-card-actions" onClick={(e) => e.stopPropagation()}>
                <button className="danger" onClick={() => handleDeleteProject(p.id)}>삭제</button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
