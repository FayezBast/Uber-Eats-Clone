import { cn, initials } from "@/lib/utils";

export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <div className={cn("flex h-9 w-9 items-center justify-center rounded-full bg-sidebar-accent text-xs font-semibold text-sidebar-foreground", className)}>
      {initials(name)}
    </div>
  );
}
