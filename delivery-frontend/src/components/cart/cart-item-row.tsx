"use client";

import { Trash2 } from "lucide-react";

import { QuantityStepper } from "@/components/common/quantity-stepper";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { type CartItem } from "@/types";

interface CartItemRowProps {
  item: CartItem;
  onQuantityChange: (value: number) => void;
  onRemove: () => void;
  compact?: boolean;
}

export function CartItemRow({
  item,
  onQuantityChange,
  onRemove,
  compact = false
}: CartItemRowProps) {
  return (
    <div
      className={cn(
        "rounded-[24px] border border-border/70 bg-white/80 p-4",
        compact ? "space-y-3" : "space-y-4"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h4 className="font-semibold text-foreground">{item.name}</h4>
          {item.selectedOptions.length ? (
            <p className="text-xs text-muted-foreground">
              {item.selectedOptions.map((selection) => selection.optionName).join(" • ")}
            </p>
          ) : null}
          {item.notes ? <p className="text-xs text-muted-foreground">Note: {item.notes}</p> : null}
        </div>
        <div className="text-right">
          <p className="font-semibold text-foreground">
            {formatCurrency(item.unitPrice * item.quantity)}
          </p>
          <p className="text-xs text-muted-foreground">{formatCurrency(item.unitPrice)} each</p>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <QuantityStepper quantity={item.quantity} onChange={onQuantityChange} />
        <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
          <Trash2 className="h-4 w-4" />
          Remove
        </Button>
      </div>
    </div>
  );
}
