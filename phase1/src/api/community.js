import { apiFetch } from './client';

export const listAnnouncements = () => apiFetch('/api/community/announcements/');
export const createAnnouncement = (title, body) => apiFetch('/api/community/announcements/', { method: 'POST', body: { title, body } });
export const createSuggestion = (message) => apiFetch('/api/community/suggestions/', { method: 'POST', body: { message } });
export const listSuggestionsAdmin = () => apiFetch('/api/community/suggestions/');
export const listChatHistory = () => apiFetch('/api/community/chat/history/');
export const deleteChatMessage = (id) => apiFetch(`/api/community/chat/${id}/`, { method: 'DELETE' });
