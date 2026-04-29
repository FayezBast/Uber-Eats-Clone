import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-xl border border-input bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
      {...props}
    />
  );
}
