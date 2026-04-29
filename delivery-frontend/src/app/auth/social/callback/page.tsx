"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { getAdminAppUrl, isExternalUrl } from "@/lib/admin-url";
import { useAuthStore } from "@/store/auth-store";
import { type AppRole, type AuthSession } from "@/types";

type CallbackState =
  | { status: "loading" }
  | { status: "error"; message: string };

function resolveRedirectPath(session: AuthSession) {
  switch (session.user.role) {
    case "driver":
      return "/driver";
    case "admin":
      return getAdminAppUrl(session);
    case "owner":
      return "/owner";
    default:
      return "/orders";
  }
}

export default function SocialAuthCallbackPage() {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  const [state, setState] = useState<CallbackState>({ status: "loading" });

  useEffect(() => {
    const hash = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash;
    const params = new URLSearchParams(hash);
    const error = params.get("error");

    if (error) {
      setState({ status: "error", message: error });
      return;
    }

    const token = params.get("token");
    const expiresAt = params.get("expires_at") ?? undefined;
    const userId = params.get("user_id");
    const name = params.get("name");
    const email = params.get("email");
    const role = params.get("role") as AppRole | null;

    if (!token || !userId || !name || !email || !role) {
      setState({ status: "error", message: "Social sign in response was incomplete." });
      return;
    }

    const session: AuthSession = {
      token,
      expiresAt,
      user: {
        id: userId,
        fullName: name,
        email,
        role
      }
    };

    setSession(session);

    const redirectPath = resolveRedirectPath(session);

    window.history.replaceState(null, "", "/auth/social/callback");

    if (isExternalUrl(redirectPath)) {
      window.location.replace(redirectPath);
      return;
    }

    router.replace(redirectPath);
    router.refresh();
  }, [router, setSession]);

  if (state.status === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-semibold text-foreground">Social sign in failed</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{state.message}</p>
          <div className="mt-6">
            <Link
              href="/auth/sign-in"
              className="inline-flex rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground"
            >
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 text-center shadow-sm sm:p-8">
        <h1 className="text-2xl font-semibold text-foreground">Signing you in</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          We are finishing your Google or Apple sign in now.
        </p>
      </div>
    </div>
  );
}
