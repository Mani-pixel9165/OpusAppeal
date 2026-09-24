import apiClient from './apiClient';

export const userService = {
  listUsers: () => apiClient.get('/users'),
  createUser: (payload) => apiClient.post('/users', payload)
};

