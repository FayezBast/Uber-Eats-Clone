import type { Metadata } from "next";

import { AuthShell } from "@/components/auth/auth-shell";
import { RestaurantApplicationForm } from "@/components/auth/restaurant-application-form";

export const metadata: Metadata = {
  title: "Restaurant application | Savora",
  description: "Submit your restaurant information and wait for account approval."
};

export default function RestaurantSignUpPage() {
  return (
    <AuthShell
      title="Restaurant application"
      description="Fill in your restaurant details. Access stays pending until the team reviews and approves the account."
    >
      <RestaurantApplicationForm />
    </AuthShell>
  );
}
