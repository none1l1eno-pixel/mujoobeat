import { apiFetch } from './client';

export const listAnnouncements = () => apiFetch('/api/community/announcements/');
export const createSuggestion = (message) => apiFetch('/api/community/suggestions/', { method: 'POST', body: { message } });
export const listChatHistory = () => apiFetch('/api/community/chat/history/');
