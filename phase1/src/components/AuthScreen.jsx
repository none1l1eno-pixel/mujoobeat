import { useState } from 'react';
import { login, register } from '../api/auth';

export default function AuthScreen({ onLoggedIn }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'register') {
        await register({ email, password, displayName });
      }
      const user = await login({ email, password });
      onLoggedIn(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-screen">
      <h1>AI 합주 스튜디오</h1>
      <p className="lead">로그인하고 내 프로젝트를 저장·공유·협업해보세요.</p>

      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="auth-tabs">
          <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>로그인</button>
          <button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>회원가입</button>
        </div>

        {mode === 'register' && (
          <label>
            이름
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="표시 이름" />
          </label>
        )}
        <label>
          이메일
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </label>
        <label>
          비밀번호
          <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="8자 이상" />
        </label>

        {error && <p className="auth-error">{error}</p>}

        <button type="submit" className="auth-submit" disabled={busy}>
          {busy ? '처리 중...' : mode === 'login' ? '로그인' : '가입하고 시작하기'}
        </button>
      </form>
    </div>
  );
}
