import type { PropsWithChildren } from "react";

import { PermissionState } from "@/components/feedback/permission-state";
import { useAuthStore } from "@/store/auth-store";
import type { Permission } from "@/types";

export function PermissionGuard({
  permission,
  fallbackDescription = "Your role does not currently have access to this module.",
  children
}: PropsWithChildren<{ permission: Permission; fallbackDescription?: string }>) {
  const hasPermission = useAuthStore((state) => state.hasPermission);

  if (!hasPermission(permission)) {
    return <PermissionState description={fallbackDescription} />;
  }

  return <>{children}</>;
}
