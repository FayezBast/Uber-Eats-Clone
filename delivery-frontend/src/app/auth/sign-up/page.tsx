import type { Metadata } from "next";

import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = {
  title: "Customer sign up | Savora",
  description: "Create a customer account to start ordering food delivery."
};

export default function SignUpPage() {
  return (
    <AuthShell
      title="Create your customer account"
      description="Create an account to order food from your favorite local restaurants."
    >
      <AuthForm mode="sign-up" />
    </AuthShell>
  );
}
