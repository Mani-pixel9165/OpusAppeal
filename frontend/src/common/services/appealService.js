import apiClient from './apiClient';

const filePayload = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return formData;
};

export const appealService = {
  listTemplates: () => apiClient.get('/appeals/templates'),
  saveTemplate: (payload) => apiClient.post('/appeals/templates', payload),
  deleteTemplate: (templateId) => apiClient.delete(`/appeals/templates/${templateId}`),
  uploadDocument: (file) => apiClient.post('/appeals/documents/upload', filePayload(file)),
  listPackages: () => apiClient.get('/appeals/packages'),
  savePackage: (denialId, payload) => apiClient.post(`/appeals/packages/${denialId}`, payload),
  documentFileUrl: (documentId) => `${apiClient.defaults.baseURL}/appeals/documents/${String(documentId).replace('document_', '')}/file`,
};
