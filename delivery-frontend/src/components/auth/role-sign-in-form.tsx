"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";

import { apiClient } from "@/services/api/client";
import { useAuthStore } from "@/store/auth-store";
import { type AppRole } from "@/types";

interface RoleSignInFormProps {
  expectedRole: Extract<AppRole, "driver" | "owner">;
  signUpHref: string;
  signUpLabel: string;
}

type MessageTone = "neutral" | "success" | "error";

export function RoleSignInForm({
  expectedRole,
  signUpHref,
  signUpLabel
}: RoleSignInFormProps) {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [visiblePassword, setVisiblePassword] = useState(false);
  const [messageTone, setMessageTone] = useState<MessageTone>("neutral");
  const [message, setMessage] = useState("");

  const errors = {
    email: /\S+@\S+\.\S+/.test(email) ? "" : "Enter a valid email address.",
    password: password.length >= 8 ? "" : "Use at least 8 characters."
  };

  const hasErrors = Object.values(errors).some(Boolean);
  const roleLabel = expectedRole === "owner" ? "restaurant" : "driver";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    setMessage("");
    setMessageTone("neutral");

    if (hasErrors) return;

    setLoading(true);
    try {
      const session = await apiClient.login({ email, password });

      if (session.user.role !== expectedRole) {
        setMessageTone("error");
        setMessage(
          `This account is not approved for the ${roleLabel} portal. Use the correct sign-in flow for this role.`
        );
        return;
      }

      setSession(session);
      setMessageTone("success");
      setMessage("Account approved. Redirecting now.");
      router.push(expectedRole === "owner" ? "/owner" : "/driver");
      router.refresh();
    } catch (error) {
      setMessageTone("error");
      setMessage(error instanceof Error ? error.message : "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-foreground">
            Work email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@example.com"
            autoComplete="email"
            className="h-12 w-full rounded-xl border border-input bg-background px-4 text-sm text-foreground outline-none transition-colors focus:border-ring"
          />
          {submitted && errors.email ? <p className="text-xs text-destructive">{errors.email}</p> : null}
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium text-foreground">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={visiblePassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              className="h-12 w-full rounded-xl border border-input bg-background px-4 pr-12 text-sm text-foreground outline-none transition-colors focus:border-ring"
            />
            <button
              type="button"
              onClick={() => setVisiblePassword((current) => !current)}
              className="absolute inset-y-0 right-3 my-auto flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary"
              aria-label={visiblePassword ? "Hide password" : "Show password"}
            >
              {visiblePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {submitted && errors.password ? (
            <p className="text-xs text-destructive">{errors.password}</p>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-primary px-5 py-3 text-base font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      {message ? (
        <div
          className={[
            "mt-4 rounded-xl border px-4 py-3 text-sm",
            messageTone === "error" ? "border-destructive/20 bg-destructive/10 text-foreground" : "",
            messageTone === "success" ? "border-green-200 bg-green-50 text-foreground" : "",
            messageTone === "neutral" ? "border-border bg-secondary/50 text-muted-foreground" : ""
          ].join(" ")}
        >
          {message}
        </div>
      ) : null}

      <div className="mt-6 rounded-xl border border-border bg-secondary/30 p-4">
        <p className="text-sm text-muted-foreground">
          Applications must be approved before this portal can be used.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Need access?{" "}
          <Link href={signUpHref} className="font-medium text-foreground underline">
            {signUpLabel}
          </Link>
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Customer account?{" "}
          <Link href="/auth/sign-in" className="font-medium text-foreground underline">
            Use the regular sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
