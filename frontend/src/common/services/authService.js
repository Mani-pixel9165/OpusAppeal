import apiClient from './apiClient';

export const authService = {
  registerOrganization: (payload) => apiClient.post('/auth/register', payload),
  login: (payload) => apiClient.post('/auth/login', payload),
  me: () => apiClient.get('/auth/me'),
  updatePassword: (payload) => apiClient.post('/auth/update-password', payload)
};

