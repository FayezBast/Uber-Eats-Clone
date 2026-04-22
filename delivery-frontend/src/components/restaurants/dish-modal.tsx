"use client";

import { useEffect, useMemo, useState } from "react";
import { Flame, PlusCircle } from "lucide-react";

import { MockImage } from "@/components/common/mock-image";
import { QuantityStepper } from "@/components/common/quantity-stepper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/format";
import { useCartStore } from "@/store/cart-store";
import { type CartSelection, type MenuItem } from "@/types";

interface DishModalProps {
  restaurantId: string;
  item: MenuItem;
}

function buildDefaultSelection(item: MenuItem) {
  return Object.fromEntries(
    (item.optionGroups ?? []).map((group) => [
      group.id,
      group.required && !group.multiSelect ? [group.options[0]?.id ?? ""] : []
    ])
  ) as Record<string, string[]>;
}

export function DishModal({ restaurantId, item }: DishModalProps) {
  const addItem = useCartStore((state) => state.addItem);
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [selectionState, setSelectionState] = useState<Record<string, string[]>>(
    buildDefaultSelection(item)
  );

  useEffect(() => {
    if (open) {
      setQuantity(1);
      setNotes("");
      setSelectionState(buildDefaultSelection(item));
    }
  }, [item, open]);

  const selectedOptions = useMemo<CartSelection[]>(() => {
    return (item.optionGroups ?? []).flatMap((group) =>
      group.options
        .filter((option) => selectionState[group.id]?.includes(option.id))
        .map((option) => ({
          groupId: group.id,
          groupName: group.name,
          optionId: option.id,
          optionName: option.name,
          priceDelta: option.priceDelta
        }))
    );
  }, [item.optionGroups, selectionState]);

  const totalPrice =
    (item.price + selectedOptions.reduce((sum, selection) => sum + selection.priceDelta, 0)) * quantity;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <PlusCircle className="h-4 w-4" />
          Add
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item.name}</DialogTitle>
          <DialogDescription>{item.description}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <MockImage
            title={item.name}
            subtitle={item.tags.join(" • ")}
            theme={item.imageTheme ?? "saffron"}
            className="min-h-[280px]"
          />
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              {item.tags.map((tag) => (
                <Badge key={tag}>{tag}</Badge>
              ))}
              {item.calories ? (
                <Badge variant="outline" className="gap-1">
                  <Flame className="h-3.5 w-3.5" />
                  {item.calories} cal
                </Badge>
              ) : null}
            </div>
            {(item.optionGroups ?? []).map((group) => (
              <div key={group.id} className="space-y-3">
                <div>
                  <p className="font-semibold text-foreground">{group.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {group.multiSelect ? "Choose any that fit." : "Pick one option."}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {group.options.map((option) => {
                    const active = selectionState[group.id]?.includes(option.id);
                    return (
                      <Button
                        key={option.id}
                        type="button"
                        size="sm"
                        variant={active ? "default" : "outline"}
                        onClick={() =>
                          setSelectionState((current) => {
                            const currentGroup = current[group.id] ?? [];
                            if (group.multiSelect) {
                              return {
                                ...current,
                                [group.id]: active
                                  ? currentGroup.filter((entry) => entry !== option.id)
                                  : [...currentGroup, option.id]
                              };
                            }

                            return {
                              ...current,
                              [group.id]: [option.id]
                            };
                          })
                        }
                      >
                        {option.name}
                        {option.priceDelta ? ` (+${formatCurrency(option.priceDelta)})` : ""}
                      </Button>
                    );
                  })}
                </div>
              </div>
            ))}
            <div className="space-y-2">
              <p className="font-semibold text-foreground">Notes</p>
              <Textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="No onions, extra napkins, allergy note..."
                className="min-h-[96px]"
              />
            </div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <QuantityStepper quantity={quantity} onChange={setQuantity} />
              <Button
                className="sm:min-w-[220px]"
                onClick={() => {
                  addItem({
                    restaurantId,
                    menuItem: item,
                    quantity,
                    selectedOptions,
                    notes
                  });
                  setOpen(false);
                }}
              >
                Add to order • {formatCurrency(totalPrice)}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
