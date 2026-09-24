import { createContext, useContext, useMemo, useState } from 'react';
import { authService } from '../services/authService';
import { authStorage } from '../services/storage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(authStorage.getToken());
  const [user, setUser] = useState(authStorage.getUser());
  const [organization, setOrganization] = useState(authStorage.getOrganization());

  const login = async (credentials) => {
    const response = await authService.login(credentials);
    const nextToken = response.data.token;
    const nextUser = response.data.user;
    const nextOrganization = response.data.organization;
    authStorage.setToken(nextToken);
    authStorage.setUser(nextUser);
    authStorage.setOrganization(nextOrganization);
    setToken(nextToken);
    setUser(nextUser);
    setOrganization(nextOrganization);
    return response.data;
  };

  const logout = () => {
    authStorage.clear();
    setToken(null);
    setUser(null);
    setOrganization(null);
  };

  const refreshUser = async () => {
    const response = await authService.me();
    authStorage.setUser(response.data.user);
    authStorage.setOrganization(response.data.organization);
    setUser(response.data.user);
    setOrganization(response.data.organization);
    return response.data.user;
  };

  const value = useMemo(
    () => ({ token, user, organization, isAuthenticated: Boolean(token), login, logout, refreshUser, setUser }),
    [token, user, organization]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
