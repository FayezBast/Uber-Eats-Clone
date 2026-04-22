import type { Metadata } from "next";

import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = {
  title: "Sign in | Savora",
  description: "Sign in to continue to your account."
};

export default function SignInPage() {
  return (
    <AuthShell
      title="Sign in"
      description="Use your email and password to continue to your account."
    >
      <AuthForm mode="sign-in" />
    </AuthShell>
  );
}
