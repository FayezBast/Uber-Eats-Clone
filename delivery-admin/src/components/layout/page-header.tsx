import type { ComponentProps, PropsWithChildren, ReactNode } from "react";

import { Button } from "@/components/ui/button";

export function PageHeader({
  title,
  subtitle,
  primaryAction,
  secondaryAction,
  children
}: PropsWithChildren<{
  title: string;
  subtitle: string;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
}>) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {secondaryAction}
          {primaryAction}
        </div>
      </div>
      {children}
    </div>
  );
}

export function PageHeaderAction({ children, ...props }: ComponentProps<typeof Button>) {
  return <Button {...props}>{children}</Button>;
}
