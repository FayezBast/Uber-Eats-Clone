import type { Metadata } from "next";

import { AuthShell } from "@/components/auth/auth-shell";
import { DriverApplicationForm } from "@/components/auth/driver-application-form";

export const metadata: Metadata = {
  title: "Driver application | Savora",
  description: "Submit your driver information and wait for account approval."
};

export default function DriverSignUpPage() {
  return (
    <AuthShell
      title="Driver application"
      description="Fill in the information needed for driver review. Access stays pending until approval."
    >
      <DriverApplicationForm />
    </AuthShell>
  );
}
