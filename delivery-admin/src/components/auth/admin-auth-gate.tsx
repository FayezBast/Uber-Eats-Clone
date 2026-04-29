import { type FormEvent, type PropsWithChildren, useEffect, useState } from "react";
import { LockKeyhole, Package2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { env } from "@/lib/env";
import { authService } from "@/services/auth-service";
import { useAuthStore } from "@/store/auth-store";

export function AdminAuthGate({ children }: PropsWithChildren) {
  const hydrated = useAuthStore((state) => state.hydrated);
  const currentUser = useAuthStore((state) => state.currentUser);
  const token = useAuthStore((state) => state.token);
  const bootstrapSession = useAuthStore((state) => state.bootstrapSession);
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    bootstrapSession();
  }, [bootstrapSession]);

  useEffect(() => {
    if (!hydrated || !token) {
      return;
    }

    let cancelled = false;
    setValidating(true);

    authService
      .me()
      .catch(() => {
        if (!cancelled) {
          clearSession();
        }
      })
      .finally(() => {
        if (!cancelled) {
          setValidating(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [clearSession, hydrated, token]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const session = await authService.login(email, password);

      if (!setSession(session)) {
        setError("This dashboard is restricted to admin accounts.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!hydrated || validating) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="rounded-2xl border border-border bg-card px-5 py-4 text-sm text-muted-foreground shadow-panel">
          Loading admin session...
        </div>
      </div>
    );
  }

  if (currentUser) {
    return <>{children}</>;
  }

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[minmax(0,0.95fr)_minmax(420px,0.7fr)]">
      <section className="relative hidden overflow-hidden border-r border-border bg-sidebar text-sidebar-foreground lg:block">
        <div className="absolute inset-0 bg-grid-fade bg-[length:32px_32px] opacity-40" />
        <div className="relative flex min-h-screen flex-col justify-between p-10">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-white/10 p-3">
              <Package2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-lg font-semibold">{env.appName}</p>
              <p className="text-sm text-sidebar-foreground/70">Real operations console</p>
            </div>
          </div>
          <div className="max-w-xl">
            <p className="text-sm uppercase tracking-[0.24em] text-sidebar-foreground/55">Backend connected</p>
            <h1 className="mt-4 text-5xl font-semibold tracking-tight">Sign in with your jo3an admin account.</h1>
            <p className="mt-5 text-base leading-7 text-sidebar-foreground/72">
              This dashboard uses the same Go API, JWT auth, deliveries, drivers, logs, and notifications as the main app.
            </p>
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center px-4 py-10">
        <form className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-panel sm:p-8" onSubmit={handleSubmit}>
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <LockKeyhole className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Admin sign in</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Use the same admin credentials you use in the customer app.
          </p>

          <div className="mt-6 space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-medium">Email</span>
              <Input autoComplete="email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium">Password</span>
              <Input autoComplete="current-password" onChange={(event) => setPassword(event.target.value)} required type="password" value={password} />
            </label>
          </div>

          {error ? <p className="mt-4 rounded-xl border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}

          <Button className="mt-6 w-full" disabled={submitting} type="submit">
            {submitting ? "Signing in..." : "Sign in"}
          </Button>
          <a className="mt-4 block text-center text-sm text-muted-foreground hover:text-foreground" href={env.frontendUrl}>
            Back to customer app
          </a>
        </form>
      </section>
    </div>
  );
}
