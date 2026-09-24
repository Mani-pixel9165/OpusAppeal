import apiClient from './apiClient';

const filePayload = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return formData;
};

export const denialService = {
  listPending: () => apiClient.get('/denials/pending'),
  listInProcess: () => apiClient.get('/denials/in-process'),
  listCompleted: () => apiClient.get('/denials/completed'),
  listActions: () => apiClient.get('/denials/actions'),
  createAction: (payload) => apiClient.post('/denials/actions', payload),
  listAssignmentRules: () => apiClient.get('/denials/assignment-rules'),
  createAssignmentRule: (payload) => apiClient.post('/denials/assignment-rules', payload),
  updateAssignmentRule: (ruleId, payload) => apiClient.patch(`/denials/assignment-rules/${ruleId}`, payload),
  deactivateAssignmentRule: (ruleId) => apiClient.patch(`/denials/assignment-rules/${ruleId}/deactivate`),
  previewUpload: (file) => apiClient.post('/denials/upload/preview', filePayload(file)),
  upload: (file) => apiClient.post('/denials/upload', filePayload(file)),
  assign: (denialId, userId) => apiClient.patch(`/denials/${denialId}/assign`, { user_id: userId }),
  startAppeal: (denialId) => apiClient.patch(`/denials/${denialId}/appeal/start`),
  updateAppealStage: (denialId, stage) => apiClient.patch(`/denials/${denialId}/appeal/stage`, { stage }),
  removeAppeal: (denialId) => apiClient.patch(`/denials/${denialId}/appeal/remove`),
  completeAppeal: (denialId) => apiClient.patch(`/denials/${denialId}/appeal/complete`),
  assignAction: (denialId, payload) => apiClient.patch(`/denials/${denialId}/action/assign`, payload),
  removeAction: (denialId) => apiClient.patch(`/denials/${denialId}/action/remove`),
  completeAction: (denialId) => apiClient.patch(`/denials/${denialId}/action/complete`)
};
