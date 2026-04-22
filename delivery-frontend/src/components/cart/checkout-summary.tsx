"use client";

import Link from "next/link";
import { ShieldCheck, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/store/cart-store";

interface CheckoutSummaryProps {
  deliveryFee?: number;
  compact?: boolean;
  submitLabel: string;
  actionHref?: string;
  onSubmit?: () => void | Promise<void>;
  disabled?: boolean;
  showPromoField?: boolean;
}

export function getCartPricing(subtotal: number, deliveryFee: number, promoCode?: string) {
  const serviceFee = subtotal > 0 ? Math.max(2.25, subtotal * 0.08) : 0;
  const discount = (promoCode?.trim().toUpperCase() ?? "") === "WELCOME8" ? 8 : 0;
  const total = Math.max(0, subtotal + deliveryFee + serviceFee - discount);

  return { serviceFee, discount, total };
}

export function CheckoutSummary({
  deliveryFee = 2.99,
  compact = false,
  submitLabel,
  actionHref,
  onSubmit,
  disabled = false,
  showPromoField = true
}: CheckoutSummaryProps) {
  const items = useCartStore((state) => state.items);
  const promoCode = useCartStore((state) => state.promoCode);
  const setPromoCode = useCartStore((state) => state.setPromoCode);
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const pricing = getCartPricing(subtotal, items.length ? deliveryFee : 0, promoCode);

  return (
    <Card className={cn("sticky top-28 overflow-hidden bg-white/85 backdrop-blur-xl", compact && "top-4")}>
      <CardHeader className={cn("space-y-3", compact ? "p-5" : undefined)}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
              Cart total
            </p>
            <CardTitle className={compact ? "mt-2 text-2xl" : "mt-2"}>Order summary</CardTitle>
          </div>
          <Badge variant="secondary">{itemCount} items</Badge>
        </div>
        {!compact ? (
          <div className="frost-panel relative z-10 flex items-start gap-3 p-4 text-sm text-muted-foreground">
            <Sparkles className="mt-0.5 h-4 w-4 text-primary" />
            <div>
              <p className="font-semibold text-foreground">Delivery summary</p>
              <p className="mt-1">Review fees, timing, and promo savings before you place the order.</p>
            </div>
          </div>
        ) : null}
      </CardHeader>
      <CardContent className={compact ? "space-y-4 p-5 pt-0" : "space-y-5"}>
        {showPromoField ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Promo code</p>
            <Input
              value={promoCode}
              onChange={(event) => setPromoCode(event.target.value)}
              className="bg-white/86"
              placeholder="Add a promo code"
            />
          </div>
        ) : null}
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Delivery fee</span>
            <span>{formatCurrency(items.length ? deliveryFee : 0)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Service fee</span>
            <span>{formatCurrency(pricing.serviceFee)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Discount</span>
            <span className="text-success">-{formatCurrency(pricing.discount)}</span>
          </div>
        </div>
        <Separator />
        <div className="flex items-center justify-between text-base font-semibold">
          <span>Total</span>
          <span>{formatCurrency(pricing.total)}</span>
        </div>
        {actionHref ? (
          disabled || !items.length ? (
            <Button className="w-full" disabled>
              {submitLabel}
            </Button>
          ) : (
            <Button asChild className="w-full">
              <Link href={actionHref}>{submitLabel}</Link>
            </Button>
          )
        ) : (
          <Button className="w-full" disabled={disabled || !items.length} onClick={onSubmit}>
            {submitLabel}
          </Button>
        )}
        <div className="frost-panel flex items-start gap-3 p-4 text-sm text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 text-primary" />
          <div>
            <p className="font-semibold text-foreground">Clear totals before checkout</p>
            <p className="mt-1">Pricing, promo savings, and the final amount stay visible from one summary rail.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
