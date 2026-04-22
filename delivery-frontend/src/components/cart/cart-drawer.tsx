"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";

import { CartItemRow } from "@/components/cart/cart-item-row";
import { CheckoutSummary } from "@/components/cart/checkout-summary";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from "@/components/ui/sheet";
import { useCartStore } from "@/store/cart-store";

export function CartDrawer() {
  const items = useCartStore((state) => state.items);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="subtle" className="rounded-full">
          <ShoppingBag className="h-4 w-4" />
          Cart
          <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
            {items.reduce((sum, item) => sum + item.quantity, 0)}
          </span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-[min(92vw,30rem)] flex-col gap-4">
        <SheetHeader>
          <SheetTitle>Your cart</SheetTitle>
          <SheetDescription>
            Review items, edit quantity, then move to checkout.
          </SheetDescription>
        </SheetHeader>
        {items.length ? (
          <>
            <div className="flex-1 space-y-3 overflow-y-auto pr-1">
              {items.map((item) => (
                <CartItemRow
                  key={item.id}
                  item={item}
                  compact
                  onQuantityChange={(value) => updateQuantity(item.id, value)}
                  onRemove={() => removeItem(item.id)}
                />
              ))}
            </div>
            <CheckoutSummary compact submitLabel="Continue to checkout" actionHref="/checkout" />
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-[28px] border border-dashed border-border bg-secondary/50 p-8 text-center">
            <ShoppingBag className="h-10 w-10 text-primary" />
            <div className="space-y-2">
              <h3 className="font-display text-2xl">Your cart is empty</h3>
              <p className="text-sm text-muted-foreground">
                Add a few dishes from discovery or a restaurant menu to get started.
              </p>
            </div>
            <Button asChild>
              <Link href="/restaurants">Browse restaurants</Link>
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
