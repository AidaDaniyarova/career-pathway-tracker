import { createContext, useContext } from 'react';
import type { Payload, RegisterPayload } from '../services/api';

export interface AuthUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  is_staff: boolean;
  total_xp?: number;
  current_level?: number;
  ai_consent?: boolean | null;
  ai_consent_required?: boolean;
}

export interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Payload) => Promise<void>;
  /** Record the user's answer to the AI usage notice. */
  setAIConsent: (accepted: boolean) => Promise<void>;
  isAdmin: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
