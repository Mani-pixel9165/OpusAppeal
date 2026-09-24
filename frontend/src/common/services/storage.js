const TOKEN_KEY = 'opus_access_token';
const USER_KEY = 'opus_user';
const ORGANIZATION_KEY = 'opus_organization';

const parseStoredValue = (key) => {
  const value = localStorage.getItem(key);
  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch {
    localStorage.removeItem(key);
    localStorage.removeItem(TOKEN_KEY);
    return null;
  }
};

export const authStorage = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  setToken: (token) => localStorage.setItem(TOKEN_KEY, token),
  clearToken: () => localStorage.removeItem(TOKEN_KEY),
  getUser: () => parseStoredValue(USER_KEY),
  setUser: (user) => localStorage.setItem(USER_KEY, JSON.stringify(user)),
  clearUser: () => localStorage.removeItem(USER_KEY),
  getOrganization: () => parseStoredValue(ORGANIZATION_KEY),
  setOrganization: (organization) => localStorage.setItem(ORGANIZATION_KEY, JSON.stringify(organization)),
  clearOrganization: () => localStorage.removeItem(ORGANIZATION_KEY),
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(ORGANIZATION_KEY);
  }
};
