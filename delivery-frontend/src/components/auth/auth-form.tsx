"use client";

import Link from "next/link";
import { type FormEvent, useMemo, useState } from "react";
import { Eye, EyeOff, Store, Truck } from "lucide-react";
import { useRouter } from "next/navigation";

import { SocialAuthButton } from "@/components/auth/social-auth-button";
import { useAuthStore } from "@/store/auth-store";
import { apiClient } from "@/services/api/client";
import { getAdminAppUrl, isExternalUrl } from "@/lib/admin-url";
import { type AuthSession } from "@/types";

interface AuthFormProps {
  mode: "sign-in" | "sign-up";
}

type MessageTone = "neutral" | "success" | "error";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080/api/v1";

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [messageTone, setMessageTone] = useState<MessageTone>("neutral");
  const [serverMessage, setServerMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationRequested, setVerificationRequested] = useState(false);
  const [debugVerificationCode, setDebugVerificationCode] = useState("");
  const [verificationExpiresAt, setVerificationExpiresAt] = useState("");

  const fullName = useMemo(
    () => `${firstName.trim()} ${lastName.trim()}`.trim(),
    [firstName, lastName]
  );
  const verificationStep = mode === "sign-up" && verificationRequested;

  const errors = {
    firstName: mode === "sign-up" && !firstName.trim() ? "First name is required." : "",
    email: /\S+@\S+\.\S+/.test(email) ? "" : "Enter a valid email address.",
    password: password.length >= 8 ? "" : "Use at least 8 characters.",
    confirmPassword:
      mode === "sign-up"
        ? !confirmPassword
          ? "Confirm your password."
          : password !== confirmPassword
            ? "Passwords do not match."
            : ""
        : "",
    verificationCode:
      verificationStep && !/^\d{6}$/.test(verificationCode) ? "Enter the 6-digit code." : ""
  };

  const hasErrors = Object.values(errors).some(Boolean);

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

  function navigateToRoleWorkspace(session: AuthSession) {
    const redirectPath = resolveRedirectPath(session);

    if (isExternalUrl(redirectPath)) {
      window.location.assign(redirectPath);
      return;
    }

    router.push(redirectPath);
    router.refresh();
  }

  function clearVerificationState() {
    setVerificationRequested(false);
    setVerificationCode("");
    setDebugVerificationCode("");
    setVerificationExpiresAt("");
  }

  function resetVerificationIfNeeded() {
    if (!verificationRequested) {
      return;
    }

    clearVerificationState();
    setSubmitted(false);
    setMessageTone("neutral");
    setServerMessage("");
  }

  function formatVerificationMessage(targetEmail: string, code?: string, expiresAt?: string) {
    let message = `Enter the 6-digit code sent to ${targetEmail}.`;

    if (code) {
      message += ` Local test code: ${code}.`;
    }

    if (expiresAt) {
      const expires = new Date(expiresAt);
      if (!Number.isNaN(expires.getTime())) {
        message += ` Expires at ${expires.toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit"
        })}.`;
      }
    }

    return message;
  }

  async function sendVerificationCode() {
    const result = await apiClient.requestRegistrationCode({
      fullName,
      email,
      password,
      role: "customer"
    });

    setVerificationRequested(true);
    setVerificationCode("");
    setDebugVerificationCode(result.verificationCode ?? "");
    setVerificationExpiresAt(result.expiresAt ?? "");
    setMessageTone("success");
    setServerMessage(formatVerificationMessage(email, result.verificationCode, result.expiresAt));
  }

  async function completeRegistration() {
    const session = await apiClient.register({
      email,
      code: verificationCode
    });

    setSession(session);
    setMessageTone("success");
    setServerMessage(`Account created for ${session.user.fullName}. Redirecting now.`);
    navigateToRoleWorkspace(session);
  }

  async function handleResendCode() {
    setMessageTone("neutral");
    setServerMessage("");
    setLoading(true);

    try {
      await sendVerificationCode();
    } catch (error) {
      setMessageTone("error");
      setServerMessage(error instanceof Error ? error.message : "Unable to send a new code.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    setMessageTone("neutral");
    setServerMessage("");

    if (hasErrors) return;

    setLoading(true);
    try {
      if (mode === "sign-in") {
        const session = await apiClient.login({ email, password });

        setSession(session);
        setMessageTone("success");
        setServerMessage(`Signed in as ${session.user.fullName}. Redirecting now.`);
        navigateToRoleWorkspace(session);
      } else if (verificationStep) {
        await completeRegistration();
      } else {
        await sendVerificationCode();
      }
    } catch (error) {
      setMessageTone("error");
      setServerMessage(error instanceof Error ? error.message : "Unable to authenticate.");
    } finally {
      setLoading(false);
    }
  }

  function handleSocialClick(provider: string) {
    if (provider === "Google" || provider === "Apple") {
      const slug = provider.toLowerCase();
      window.location.assign(`${API_BASE_URL}/auth/social/${slug}/start`);
      return;
    }

    setMessageTone("neutral");
    setServerMessage(`${provider} sign-in is not connected yet. Use the form for now.`);
  }

  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "sign-up" ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field
              label="First name"
              id="first-name"
              value={firstName}
              onChange={(value) => {
                setFirstName(value);
                resetVerificationIfNeeded();
              }}
              placeholder="First name"
              autoComplete="given-name"
              error={submitted ? errors.firstName : ""}
            />
            <Field
              label="Last name"
              id="last-name"
              value={lastName}
              onChange={(value) => {
                setLastName(value);
                resetVerificationIfNeeded();
              }}
              placeholder="Last name"
              autoComplete="family-name"
            />
          </div>
        ) : null}

        <Field
          label={mode === "sign-in" ? "Email" : "Email address"}
          id="email"
          type="email"
          value={email}
          onChange={(value) => {
            setEmail(value);
            resetVerificationIfNeeded();
          }}
          placeholder="name@example.com"
          autoComplete="email"
          error={submitted ? errors.email : ""}
        />

        {mode === "sign-up" ? (
          <Field
            label="Phone number"
            id="phone"
            type="tel"
            value={phone}
            onChange={setPhone}
            placeholder="Phone number"
            autoComplete="tel"
          />
        ) : null}

        <PasswordField
          id="password"
          label="Password"
          value={password}
          onChange={(value) => {
            setPassword(value);
            resetVerificationIfNeeded();
          }}
          visible={showPassword}
          onToggle={() => setShowPassword((current) => !current)}
          autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
          placeholder={mode === "sign-in" ? "Enter your password" : "Create a password"}
          error={submitted ? errors.password : ""}
        />

        {mode === "sign-up" ? (
          <PasswordField
            id="confirm-password"
            label="Confirm password"
            value={confirmPassword}
            onChange={(value) => {
              setConfirmPassword(value);
              resetVerificationIfNeeded();
            }}
            visible={showConfirmPassword}
            onToggle={() => setShowConfirmPassword((current) => !current)}
            autoComplete="new-password"
            placeholder="Confirm your password"
            error={submitted ? errors.confirmPassword : ""}
          />
        ) : null}

        {verificationStep ? (
          <div className="space-y-2">
            <Field
              label="Verification code"
              id="verification-code"
              value={verificationCode}
              onChange={(value) => setVerificationCode(value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              autoComplete="one-time-code"
              error={submitted ? errors.verificationCode : ""}
            />
            {debugVerificationCode ? (
              <p className="text-xs text-muted-foreground">
                Local test code: <span className="font-medium text-foreground">{debugVerificationCode}</span>
              </p>
            ) : null}
          </div>
        ) : null}

        <button
          type="submit"
          className="w-full rounded-xl bg-primary px-5 py-3 text-base font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={loading}
        >
          {loading
            ? "Working..."
            : mode === "sign-in"
              ? "Continue"
              : verificationStep
                ? "Create account"
                : "Send verification code"}
        </button>

        {verificationStep ? (
          <button
            type="button"
            onClick={handleResendCode}
            className="w-full rounded-xl border border-input bg-background px-5 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loading}
          >
            Send a new code
          </button>
        ) : null}
      </form>

      {serverMessage ? (
        <div
          className={[
            "mt-4 rounded-xl border px-4 py-3 text-sm",
            messageTone === "error" ? "border-destructive/20 bg-destructive/10 text-foreground" : "",
            messageTone === "success" ? "border-green-200 bg-green-50 text-foreground" : "",
            messageTone === "neutral" ? "border-border bg-secondary/50 text-muted-foreground" : ""
          ].join(" ")}
        >
          {serverMessage}
        </div>
      ) : null}

      <div className="my-6 flex items-center gap-4">
        <div className="h-px flex-1 bg-border" />
        <span className="text-sm text-muted-foreground">or</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <div className="space-y-3">
        <SocialAuthButton
          label={mode === "sign-in" ? "Continue with Google" : "Sign up with Google"}
          onClick={() => handleSocialClick("Google")}
          icon={<GoogleIcon />}
        />
        <SocialAuthButton
          label={mode === "sign-in" ? "Continue with Apple" : "Sign up with Apple"}
          onClick={() => handleSocialClick("Apple")}
          icon={<AppleIcon />}
        />
        {mode === "sign-in" ? (
          <SocialAuthButton
            label="Continue with Facebook"
            onClick={() => handleSocialClick("Facebook")}
            icon={<FacebookIcon />}
          />
        ) : null}
      </div>

      <p className="mt-8 text-sm text-muted-foreground">
        {mode === "sign-in" ? "New here? " : "Already have an account? "}
        <Link
          href={mode === "sign-in" ? "/auth/sign-up" : "/auth/sign-in"}
          className="font-medium text-foreground underline"
        >
          {mode === "sign-in" ? "Create an account" : "Sign in"}
        </Link>
      </p>

      <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
        {mode === "sign-in"
          ? "By proceeding, you consent to receive messages at the contact info you provide. Message and data rates may apply."
          : "By creating an account, you agree to the Terms of Service and acknowledge the Privacy Notice."}
      </p>

      <div className="mt-6 rounded-xl border border-border/70 bg-secondary/20 px-4 py-3">
        <p className="text-sm text-muted-foreground">
          {mode === "sign-in"
            ? "Restaurant and driver accounts use a separate portal."
            : "Restaurant and driver accounts need approval first."}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href={mode === "sign-in" ? "/auth/restaurant/sign-in" : "/auth/restaurant/sign-up"}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
          >
            <Store className="h-4 w-4" />
            {mode === "sign-in" ? "Restaurant portal" : "Restaurant apply"}
          </Link>
          <Link
            href={mode === "sign-in" ? "/auth/driver/sign-in" : "/auth/driver/sign-up"}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
          >
            <Truck className="h-4 w-4" />
            {mode === "sign-in" ? "Driver portal" : "Driver apply"}
          </Link>
        </div>
      </div>
    </div>
  );
}

interface FieldProps {
  label: string;
  id: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  error?: string;
}

function Field({
  label,
  id,
  value,
  onChange,
  type = "text",
  placeholder,
  autoComplete,
  error
}: FieldProps) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="h-12 w-full rounded-xl border border-input bg-background px-4 text-sm text-foreground outline-none transition-colors focus:border-ring"
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  visible: boolean;
  onToggle: () => void;
  autoComplete?: string;
  placeholder?: string;
  error?: string;
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  visible,
  onToggle,
  autoComplete,
  placeholder,
  error
}: PasswordFieldProps) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="h-12 w-full rounded-xl border border-input bg-background px-4 pr-12 text-sm text-foreground outline-none transition-colors focus:border-ring"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute inset-y-0 right-3 my-auto flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09A6.97 6.97 0 0 1 5.49 12c0-.73.13-1.43.35-2.09V7.07H2.18A10.97 10.97 0 0 0 1 12c0 1.78.43 3.46 1.18 4.93l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-foreground" aria-hidden="true">
      <path d="M16.37 1.43c0 1.14-.46 2.23-1.22 3.04-.8.86-2.12 1.52-3.2 1.43-.13-1.12.42-2.27 1.15-3.05.84-.88 2.23-1.53 3.27-1.42ZM20.5 17.27c-.55 1.27-.82 1.84-1.53 2.96-.99 1.55-2.39 3.48-4.13 3.5-1.55.02-1.95-1-4.05-1-2.1.01-2.54.99-4.09.97-1.74-.02-3.08-1.77-4.07-3.32C-.06 16.94-.34 11.7 2.13 9c1.27-1.39 2.95-2.21 4.59-2.24 1.49-.03 2.9 1.04 4.05 1.04 1.16 0 2.96-1.27 4.99-1.08.85.03 3.24.34 4.77 2.59-4.06 2.36-3.41 8.18-.03 7.96Z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        fill="#1877F2"
        d="M24 12a12 12 0 1 0-13.88 11.85v-8.38H7.08V12h3.04V9.36c0-3 1.79-4.66 4.53-4.66 1.31 0 2.68.23 2.68.23v2.95h-1.51c-1.49 0-1.95.92-1.95 1.87V12h3.32l-.53 3.47h-2.79v8.38A12 12 0 0 0 24 12Z"
      />
    </svg>
  );
}
