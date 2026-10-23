import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

export const getHealth = () => api.get('/health');
export const getScenarios = () => api.get('/scenarios');
export const getScenario = (id) => api.get(`/scenarios/${id}`);

export const getRuns = () => api.get('/runs');
export const createRun = (scenarioId) => api.post('/runs', { scenarioId });
export const getRun = (id) => api.get(`/runs/${id}`);
export const executeAction = (runId, action, targetService) =>
  api.post(`/runs/${runId}/actions`, { action, targetService });
export const finishRun = (runId) => api.post(`/runs/${runId}/finish`);
export const getReport = (runId) => api.get(`/runs/${runId}/report`);

export const register = (data) => api.post('/auth/register', data);
export const login = (data) => api.post('/auth/login', data);
export const logout = () => api.post('/auth/logout');
export const getMe = () => api.get('/auth/me');

export default api;
