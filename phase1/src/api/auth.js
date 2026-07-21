import { apiFetch, tokenStore } from './client';

export async function register({ email, password, displayName }) {
  return apiFetch('/api/auth/register/', {
    method: 'POST',
    auth: false,
    body: { email, password, display_name: displayName },
  });
}

export async function login({ email, password }) {
  const data = await apiFetch('/api/auth/login/', {
    method: 'POST',
    auth: false,
    body: { email, password },
  });
  tokenStore.set(data.access, data.refresh);
  return data.user;
}

export function logout() {
  tokenStore.clear();
}

export async function me() {
  return apiFetch('/api/auth/me/');
}
