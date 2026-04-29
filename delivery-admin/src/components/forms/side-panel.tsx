import type { PropsWithChildren, ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";

export function SidePanel({
  open,
  title,
  description,
  onClose,
  actions,
  children
}: PropsWithChildren<{ open: boolean; title: string; description?: string; onClose: () => void; actions?: ReactNode }>) {
  if (!open) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end bg-foreground/50">
      <div className="flex h-full w-full max-w-2xl flex-col border-l border-border bg-background shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">{title}</h3>
            {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
          </div>
          <div className="flex items-center gap-2">
            {actions}
            <Button onClick={onClose} size="sm" variant="ghost">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="scrollbar-subtle flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>,
    document.body
  );
}
