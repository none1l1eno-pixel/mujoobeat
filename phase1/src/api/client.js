/**
 * Django 백엔드 REST 클라이언트 (plan.md Phase 3.5). accessToken 만료 시
 * refreshToken으로 한 번 자동 갱신 후 재시도, 그마저 실패하면 로그아웃 이벤트를 쏜다.
 */
export const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000';
export const WS_BASE = import.meta.env.VITE_WS_BASE ?? 'ws://localhost:8000';

const ACCESS_KEY = 'music_studio_access';
const REFRESH_KEY = 'music_studio_refresh';

export const tokenStore = {
  getAccess: () => localStorage.getItem(ACCESS_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_KEY),
  set: (access, refresh) => {
    localStorage.setItem(ACCESS_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear: () => {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

async function refreshAccessToken() {
  const refresh = tokenStore.getRefresh();
  if (!refresh) return false;
  const res = await fetch(`${API_BASE}/api/auth/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  });
  if (!res.ok) return false;
  const data = await res.json();
  tokenStore.set(data.access, refresh);
  return true;
}

export async function apiFetch(path, { method = 'GET', body, auth = true } = {}) {
  const doFetch = () => fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(auth && tokenStore.getAccess() ? { Authorization: `Bearer ${tokenStore.getAccess()}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let res = await doFetch();
  if (res.status === 401 && auth) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      res = await doFetch();
    } else {
      tokenStore.clear();
      window.dispatchEvent(new CustomEvent('auth:logout'));
    }
  }

  if (!res.ok) {
    let detail = `요청 실패 (${res.status})`;
    try {
      const data = await res.json();
      detail = data.detail || Object.values(data).flat().join(' ') || detail;
    } catch { /* ignore */ }
    throw new Error(detail);
  }
  if (res.status === 204) return null;
  return res.json();
}
