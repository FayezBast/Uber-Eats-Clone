import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium", {
  variants: {
    variant: {
      default: "border-border bg-muted text-muted-foreground",
      success: "border-success/20 bg-success/10 text-success",
      warning: "border-warning/20 bg-warning/15 text-foreground",
      danger: "border-destructive/20 bg-destructive/10 text-destructive",
      info: "border-info/20 bg-info/10 text-info"
    }
  },
  defaultVariants: {
    variant: "default"
  }
});

export function Badge({ className, variant, ...props }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
