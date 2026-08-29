import type { User } from '../types/user';
import { apiClient, authStorage } from './apiClient';

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:5000';

async function fetchUser(): Promise<User | null> {
  try {
    const response = await fetch(`${API_BASE}/api/auth/me`, { credentials: 'include' });
    if (!response.ok) return null;
    const data = (await response.json()) as { success: boolean; user?: User };
    return data.user ?? null;
  } catch {
    return null;
  }
}

export const authService = {
  getCurrentUser(): User | null {
    return authStorage.get();
  },

  async checkAuth(): Promise<User | null> {
    const user = await fetchUser();
    if (user) {
      authStorage.set(user);
    } else {
      authStorage.clear();
    }
    return user;
  },

  /** Redirect browser to Google OAuth */
  loginWithGoogle(): void {
    window.location.href = `${API_BASE}/api/auth/google`;
  },

  /** Demo email/password login — returns user on success, throws ApiError on failure */
  async loginWithEmail(email: string, password: string): Promise<User> {
    const data = await apiClient.post<{ success: boolean; user?: User; message?: string }>(
      '/api/auth/login',
      { email, password },
    );
    if (!data.success || !data.user) {
      throw new Error(data.message ?? 'Login failed');
    }
    authStorage.set(data.user);
    return data.user;
  },

  async logout(): Promise<void> {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, { method: 'POST', credentials: 'include' });
    } catch {
      // ignore network errors on logout
    }
    authStorage.clear();
    // Navigate to frontend login, not backend
    window.location.href = '/login';
  },
};
