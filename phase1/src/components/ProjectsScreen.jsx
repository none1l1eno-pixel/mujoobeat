import { useEffect, useState } from 'react';
import {
  addCollaborator, createProject, deleteProject, listProjects,
  listPublicProjects, updateProject,
} from '../api/projects';
import AdminPanel from './AdminPanel';

export default function ProjectsScreen({ user, onOpenProject, onLogout }) {
  const [tab, setTab] = useState('mine'); // 'mine' | 'public' | 'admin'
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newTitle, setNewTitle] = useState('');
  const [inviteEmail, setInviteEmail] = useState({}); // projectId -> email input

  const load = async () => {
    if (tab === 'admin') return;
    setLoading(true);
    setError(null);
    try {
      const data = tab === 'mine' ? await listProjects() : await listPublicProjects();
      setProjects(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const project = await createProject({ title: newTitle.trim(), bpm: 90, data: { tracks: [] } });
    setNewTitle('');
    onOpenProject(project.id);
  };

  const handleDelete = async (id) => {
    await deleteProject(id);
    load();
  };

  const handleTogglePublic = async (project) => {
    await updateProject(project.id, { is_public: !project.is_public });
    load();
  };

  const handleInvite = async (projectId) => {
    const email = (inviteEmail[projectId] ?? '').trim();
    if (!email) return;
    try {
      await addCollaborator(projectId, email);
      setInviteEmail((prev) => ({ ...prev, [projectId]: '' }));
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="projects-screen">
      <div className="projects-header">
        <div>
          <h1>내 스튜디오</h1>
          <p className="lead">{user.display_name || user.email}님, 프로젝트를 골라 시작하세요.</p>
        </div>
        <button className="ghost" onClick={onLogout}>로그아웃</button>
      </div>

      <form className="new-project-form" onSubmit={handleCreate}>
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="새 프로젝트 이름"
        />
        <button type="submit">+ 새 프로젝트</button>
      </form>

      <div className="projects-tabs">
        <button className={tab === 'mine' ? 'active' : ''} onClick={() => setTab('mine')}>내 프로젝트</button>
        <button className={tab === 'public' ? 'active' : ''} onClick={() => setTab('public')}>공개 프로젝트 둘러보기</button>
        {user.is_staff && (
          <button className={tab === 'admin' ? 'active' : ''} onClick={() => setTab('admin')}>관리자 페이지</button>
        )}
      </div>

      {tab === 'admin' ? (
        <AdminPanel onOpenProject={onOpenProject} />
      ) : (
        <>
          {loading && <p className="loading">불러오는 중...</p>}
          {error && <p className="auth-error">{error}</p>}

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
                {tab === 'mine' && p.owner?.id === user.id && (
                  <div className="project-card-actions" onClick={(e) => e.stopPropagation()}>
                    <button className="ghost" onClick={() => handleTogglePublic(p)}>
                      {p.is_public ? '비공개로' : '공개로'}
                    </button>
                    <div className="invite-row">
                      <input
                        type="email"
                        placeholder="협업자 이메일"
                        value={inviteEmail[p.id] ?? ''}
                        onChange={(e) => setInviteEmail((prev) => ({ ...prev, [p.id]: e.target.value }))}
                      />
                      <button onClick={() => handleInvite(p.id)}>초대</button>
                    </div>
                    <button className="danger" onClick={() => handleDelete(p.id)}>삭제</button>
                  </div>
                )}
              </li>
            ))}
            {!loading && projects.length === 0 && <p className="empty-hint">프로젝트가 없어요.</p>}
          </ul>
        </>
      )}
    </div>
  );
}
