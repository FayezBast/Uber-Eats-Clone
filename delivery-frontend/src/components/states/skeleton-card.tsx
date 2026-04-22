import { cn } from "@/lib/utils";

interface SkeletonCardProps {
  className?: string;
}

export function SkeletonCard({ className }: SkeletonCardProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[28px] border border-border/60 bg-white/80 shadow-float",
        className
      )}
    >
      <div className="h-48 animate-pulse bg-secondary" />
      <div className="space-y-3 p-5">
        <div className="h-4 w-24 animate-pulse rounded-full bg-secondary" />
        <div className="h-6 w-2/3 animate-pulse rounded-full bg-secondary" />
        <div className="h-4 w-full animate-pulse rounded-full bg-secondary" />
        <div className="h-4 w-5/6 animate-pulse rounded-full bg-secondary" />
      </div>
    </div>
  );
}
