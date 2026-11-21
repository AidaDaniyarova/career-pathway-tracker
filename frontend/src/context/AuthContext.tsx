import React, { useState, useEffect, useCallback } from 'react';
import { authAPI, clearStoredAuth, type Payload, type RegisterPayload } from '../services/api';
import { AuthContext, type AuthUser } from './auth';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const storeUser = (u: AuthUser) => {
    setUser(u);
    localStorage.setItem('user', JSON.stringify(u));
  };

  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          const response = await authAPI.getProfile();
          storeUser(response.data);
        } catch {
          clearStoredAuth();
        }
      }
      setIsLoading(false);
    };
    loadUser();
  }, []);

  const saveSession = (data: { access: string; refresh: string; user: AuthUser }) => {
    localStorage.setItem('access_token', data.access);
    localStorage.setItem('refresh_token', data.refresh);
    storeUser(data.user);
  };

  const login = async (email: string, password: string) => {
    const response = await authAPI.login(email, password);
    saveSession(response.data);
  };

  const register = async (data: RegisterPayload) => {
    const response = await authAPI.register(data);
    // New accounts have not answered the AI notice yet
    saveSession({ ...response.data, user: { ...response.data.user, ai_consent: null, ai_consent_required: true } });
  };

  const logout = async () => {
    const refresh = localStorage.getItem('refresh_token');
    try {
      // Revoke the refresh token server-side so it cannot be reused
      if (refresh) await authAPI.logout(refresh);
    } catch {
      // Ignore network/expired-token errors; local session is cleared regardless
    }
    clearStoredAuth();
    setUser(null);
  };

  const updateProfile = async (data: Payload) => {
    const response = await authAPI.updateProfile(data);
    setUser((prev) => {
      const next = { ...(prev as AuthUser), ...response.data };
      localStorage.setItem('user', JSON.stringify(next));
      return next;
    });
  };

  const setAIConsent = useCallback(async (accepted: boolean) => {
    const response = await authAPI.setAIConsent(accepted);
    setUser((prev) => {
      if (!prev) return prev;
      const next = {
        ...prev,
        ai_consent: response.data.ai_consent,
        ai_consent_required: response.data.ai_consent_required,
      };
      localStorage.setItem('user', JSON.stringify(next));
      return next;
    });
  }, []);

  const isAdmin = user?.is_staff || false;
  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider
      value={{ user, isLoading, isAuthenticated, login, register, logout, updateProfile, setAIConsent, isAdmin }}
    >
      {children}
    </AuthContext.Provider>
  );
};
