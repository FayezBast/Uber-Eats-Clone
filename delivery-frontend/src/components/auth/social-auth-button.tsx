import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

interface SocialAuthButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  label: string;
}

export function SocialAuthButton({
  icon,
  label,
  className,
  type = "button",
  ...props
}: SocialAuthButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border border-input bg-background px-4 py-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
      {...props}
    >
      <span className="flex h-5 w-5 items-center justify-center">
        {icon}
      </span>
      <span>{label}</span>
    </button>
  );
}
