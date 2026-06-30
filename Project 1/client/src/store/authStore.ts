import { create } from 'zustand';
import { API_URL } from '../lib/api';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Member';
  avatar: string;
}

interface AuthState {
  user: UserProfile | null;
  accessToken: string | null;
  loading: boolean;
  error: string | null;
  setUser: (user: UserProfile | null) => void;
  setAccessToken: (token: string | null) => void;
  setError: (err: string | null) => void;
  login: (email: string, password: string) => Promise<boolean>;
  tryDemoLogin: () => Promise<boolean>;
  logout: () => Promise<void>;
  registerUser: (name: string, email: string, password: string) => Promise<boolean>;
}

function formatAuthError(err: unknown): string {
  if (err instanceof TypeError && err.message === 'Failed to fetch') {
    return 'Cannot reach the API server. Start the backend with `cd server && npm run dev`, then try again.';
  }

  if (err instanceof Error) {
    return err.message;
  }

  return 'Authentication failed';
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  loading: false,
  error: null,

  setUser: (user) => set({ user }),
  setAccessToken: (accessToken) => set({ accessToken }),
  setError: (error) => set({ error }),

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });

      const responseText = await response.text();
      let data;
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch {
        throw new Error(`Server returned invalid response (Status ${response.status}). If using a free-tier Hugging Face backend, it may take 1-2 minutes to spin up. Please try again in a moment.`);
      }

      if (!response.ok) {
        throw new Error(data.message || 'Authentication failed');
      }

      set({
        user: data.user,
        accessToken: data.accessToken,
        loading: false
      });
      return true;
    } catch (err: unknown) {
      set({ error: formatAuthError(err), loading: false });
      return false;
    }
  },

  tryDemoLogin: async () => {
    return get().login('mariam@intellmeet.app', 'Mariam@1234');
  },

  registerUser: async (name, email, password) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, email, password })
      });

      const responseText = await response.text();
      let data;
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch {
        throw new Error(`Server returned invalid response (Status ${response.status}). If using a free-tier Hugging Face backend, it may take 1-2 minutes to spin up. Please try again in a moment.`);
      }

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      set({
        user: data.user,
        accessToken: data.accessToken,
        loading: false
      });
      return true;
    } catch (err: unknown) {
      set({ error: formatAuthError(err), loading: false });
      return false;
    }
  },

  logout: async () => {
    const token = get().accessToken;
    try {
      if (token) {
        await fetch(`${API_URL}/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    } catch (err) {
      // ignore logout networking failures
    } finally {
      set({ user: null, accessToken: null });
      document.cookie = 'refreshToken=; Max-Age=0; path=/;';
    }
  }
}));
