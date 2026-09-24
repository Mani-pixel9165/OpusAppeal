import apiClient from './apiClient';

export const codeDescriptionService = {
  logs: (params = {}) => apiClient.get('/code-descriptions/logs', { params }),
  status: () => apiClient.get('/code-descriptions/status'),
  run: (codeType) => apiClient.post(`/code-descriptions/run/${codeType}`),
};
