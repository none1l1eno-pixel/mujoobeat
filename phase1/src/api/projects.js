import { apiFetch } from './client';

export const listProjects = () => apiFetch('/api/projects/');
export const listPublicProjects = () => apiFetch('/api/projects/public/');
export const listAllProjectsAdmin = () => apiFetch('/api/projects/admin-all/');
export const getProject = (id) => apiFetch(`/api/projects/${id}/`);
export const createProject = (payload) => apiFetch('/api/projects/', { method: 'POST', body: payload });
export const updateProject = (id, patch) => apiFetch(`/api/projects/${id}/`, { method: 'PATCH', body: patch });
export const deleteProject = (id) => apiFetch(`/api/projects/${id}/`, { method: 'DELETE' });
export const addCollaborator = (id, email) => apiFetch(`/api/projects/${id}/collaborators/`, { method: 'POST', body: { email } });
export const removeCollaborator = (id, userId) => apiFetch(`/api/projects/${id}/collaborators/${userId}/`, { method: 'DELETE' });
export const getAiComment = (id) => apiFetch(`/api/projects/${id}/comment/`, { method: 'POST' });
