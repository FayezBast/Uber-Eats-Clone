import type { Metadata } from "next";

import { AuthShell } from "@/components/auth/auth-shell";
import { RoleSignInForm } from "@/components/auth/role-sign-in-form";

export const metadata: Metadata = {
  title: "Restaurant sign in | Savora",
  description: "Sign in to the restaurant portal after your restaurant application has been approved."
};

export default function RestaurantSignInPage() {
  return (
    <AuthShell
      title="Restaurant sign in"
      description="Use this portal once your restaurant account has been approved."
    >
      <RoleSignInForm
        expectedRole="owner"
        signUpHref="/auth/restaurant/sign-up"
        signUpLabel="Apply as a restaurant"
      />
    </AuthShell>
  );
}
