import type { AuthSession } from "@/types";

const configuredAdminAppUrl = process.env.NEXT_PUBLIC_ADMIN_APP_URL?.trim();

export function getAdminAppUrl(session?: AuthSession | null) {
  const url = configuredAdminAppUrl || (process.env.NODE_ENV === "development" ? "http://localhost:5173" : "/admin");
  return session ? appendAdminSession(url, session) : url;
}

export function isExternalUrl(url: string) {
  return /^https?:\/\//i.test(url);
}

function appendAdminSession(url: string, session: AuthSession) {
  if (!isExternalUrl(url) || session.user.role !== "admin") {
    return url;
  }

  const [withoutHash, existingHash = ""] = url.split("#");
  const params = new URLSearchParams(existingHash);
  params.set("admin_session", JSON.stringify(session));

  return `${withoutHash}#${params.toString()}`;
}
