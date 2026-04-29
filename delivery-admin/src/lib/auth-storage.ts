export const ADMIN_AUTH_STORAGE_KEY = "delivery-admin-auth";
export const ADMIN_SESSION_HASH_KEY = "admin_session";

export interface AdminAuthSession {
  token: string;
  expiresAt?: string;
  user: {
    id: string | number;
    name?: string;
    fullName?: string;
    email: string;
    role: string;
    createdAt?: string;
    updatedAt?: string;
    created_at?: string;
    updated_at?: string;
  };
}

export function readAdminAuthSession(): AdminAuthSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(ADMIN_AUTH_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as AdminAuthSession;
    return parsed.token && parsed.user?.email ? parsed : null;
  } catch {
    return null;
  }
}

export function writeAdminAuthSession(session: AdminAuthSession) {
  window.localStorage.setItem(ADMIN_AUTH_STORAGE_KEY, JSON.stringify(session));
}

export function clearAdminAuthSession() {
  window.localStorage.removeItem(ADMIN_AUTH_STORAGE_KEY);
}

export function readAdminAuthToken() {
  return readAdminAuthSession()?.token ?? null;
}

export function consumeRedirectSession(): AdminAuthSession | null {
  if (typeof window === "undefined" || !window.location.hash) {
    return null;
  }

  const params = new URLSearchParams(window.location.hash.slice(1));
  const encodedSession = params.get(ADMIN_SESSION_HASH_KEY);

  if (!encodedSession) {
    return null;
  }

  params.delete(ADMIN_SESSION_HASH_KEY);
  const nextHash = params.toString();
  const nextUrl = `${window.location.pathname}${window.location.search}${nextHash ? `#${nextHash}` : ""}`;
  window.history.replaceState(null, "", nextUrl);

  try {
    const parsed = JSON.parse(encodedSession) as AdminAuthSession;
    return parsed.token && parsed.user?.email ? parsed : null;
  } catch {
    return null;
  }
}
