'use client';

import { create } from 'zustand';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  isReady: boolean;
  setUser: (user: User | null) => void;
}

/**
 * Mirrors the session that the server already resolved. It is never the source
 * of truth — the httpOnly cookie is — it just lets client components render the
 * right header state without an extra request.
 */
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isReady: false,
  setUser: (user) => set({ user, isReady: true }),
}));

export const selectIsAuthenticated = (state: AuthState): boolean => state.user !== null;
export const selectIsAdmin = (state: AuthState): boolean => state.user?.role === 'ADMIN';
