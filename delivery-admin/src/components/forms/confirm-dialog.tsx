import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive,
  onConfirm,
  onClose
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  if (!open) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4">
      <Card className="w-full max-w-md p-5">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button onClick={onClose} variant="outline">
            {cancelLabel}
          </Button>
          <Button onClick={onConfirm} variant={destructive ? "danger" : "default"}>
            {confirmLabel}
          </Button>
        </div>
      </Card>
    </div>,
    document.body
  );
}
