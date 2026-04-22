"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { AUTH_STORAGE_KEY } from "@/lib/auth-storage";
import { type AuthSession, type AuthUser } from "@/types";

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  expiresAt?: string;
  hydrated: boolean;
  setSession: (session: AuthSession) => void;
  clearSession: () => void;
  markHydrated: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      expiresAt: undefined,
      hydrated: false,
      setSession: (session) =>
        set({
          token: session.token,
          user: session.user,
          expiresAt: session.expiresAt,
          hydrated: true
        }),
      clearSession: () =>
        set({
          token: null,
          user: null,
          expiresAt: undefined,
          hydrated: true
        }),
      markHydrated: () => set({ hydrated: true })
    }),
    {
      name: AUTH_STORAGE_KEY,
      onRehydrateStorage: () => (state) => {
        state?.markHydrated();
      }
    }
  )
);
