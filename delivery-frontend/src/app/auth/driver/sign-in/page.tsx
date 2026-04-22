import type { Metadata } from "next";

import { AuthShell } from "@/components/auth/auth-shell";
import { RoleSignInForm } from "@/components/auth/role-sign-in-form";

export const metadata: Metadata = {
  title: "Driver sign in | Savora",
  description: "Sign in to the driver portal after your driver application has been approved."
};

export default function DriverSignInPage() {
  return (
    <AuthShell
      title="Driver sign in"
      description="Use this portal once your driver account has been approved."
    >
      <RoleSignInForm
        expectedRole="driver"
        signUpHref="/auth/driver/sign-up"
        signUpLabel="Apply as a driver"
      />
    </AuthShell>
  );
}
