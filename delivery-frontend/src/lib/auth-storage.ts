import type { AuthSession } from "@/types";

export const AUTH_STORAGE_KEY = "delivery-auth";

interface PersistedAuthState {
  state?: {
    token?: string | null;
    user?: AuthSession["user"] | null;
    expiresAt?: string | null;
  };
}

export function readStoredAuthSession(): AuthSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as PersistedAuthState;
    const token = parsed.state?.token;
    const user = parsed.state?.user;

    if (!token || !user) {
      return null;
    }

    return {
      token,
      user,
      expiresAt: parsed.state?.expiresAt ?? undefined
    };
  } catch {
    return null;
  }
}

export function readStoredAuthToken() {
  return readStoredAuthSession()?.token ?? null;
}
