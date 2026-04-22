"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CreditCard, MapPinned, ShieldCheck, Sparkles, WalletCards } from "lucide-react";

import { CartItemRow } from "@/components/cart/cart-item-row";
import { CheckoutSummary } from "@/components/cart/checkout-summary";
import { EmptyState } from "@/components/states/empty-state";
import { ErrorState } from "@/components/states/error-state";
import { useAuthStore } from "@/store/auth-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { apiClient } from "@/services/api/client";
import { useCartStore } from "@/store/cart-store";
import { type Address, type Restaurant, type User } from "@/types";

export default function CheckoutPage() {
  const sessionUser = useAuthStore((state) => state.user);
  const authHydrated = useAuthStore((state) => state.hydrated);
  const items = useCartStore((state) => state.items);
  const restaurantId = useCartStore((state) => state.restaurantId);
  const deliveryMode = useCartStore((state) => state.deliveryMode);
  const orderNotes = useCartStore((state) => state.orderNotes);
  const setOrderNotes = useCartStore((state) => state.setOrderNotes);
  const setDeliveryMode = useCartStore((state) => state.setDeliveryMode);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const promoCode = useCartStore((state) => state.promoCode);
  const clearCart = useCartStore((state) => state.clearCart);

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [submissionError, setSubmissionError] = useState("");

  useEffect(() => {
    let mounted = true;

    apiClient.getLandingData().then((landing) => {
      if (!mounted) return;
      setAddresses(landing.addresses);
      setUser(landing.user);
      setSelectedAddressId(landing.user.defaultAddressId);
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!restaurantId) {
      setRestaurant(null);
      return;
    }

    let mounted = true;
    apiClient.getRestaurantById(restaurantId).then((result) => {
      if (mounted) {
        setRestaurant(result);
      }
    });
    return () => {
      mounted = false;
    };
  }, [restaurantId]);

  const selectedAddress = useMemo(
    () => addresses.find((address) => address.id === selectedAddressId) ?? null,
    [addresses, selectedAddressId]
  );
  const itemCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  if (!items.length && !confirmation) {
    return (
      <div className="container py-14">
        <div className="section-shell p-8">
          <EmptyState
            title="Nothing to check out yet"
            description="Add dishes from a restaurant menu and the checkout flow will be ready."
            action={
              <Button asChild>
                <Link href="/restaurants">Browse restaurants</Link>
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  if (confirmation) {
    return (
      <div className="container py-14">
        <div className="section-shell mx-auto max-w-2xl p-8">
          <div className="relative z-10 space-y-5">
            <Badge className="w-fit gap-2">
              <Sparkles className="h-3.5 w-3.5" />
              Order placed
            </Badge>
            <div className="space-y-3">
              <h1 className="font-display text-4xl text-foreground">The confirmation flow is ready.</h1>
              <p className="text-sm leading-6 text-muted-foreground">{confirmation}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/orders">See orders</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/restaurants">Order something else</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container space-y-6 py-8 sm:py-10">
      <section className="section-shell p-6 sm:p-8">
        <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-3">
            <Badge className="w-fit gap-2">
              <Sparkles className="h-3.5 w-3.5" />
              Checkout
            </Badge>
            <h1 className="balance-text font-display text-5xl text-foreground sm:text-6xl">
              Review, confirm, and place the order.
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              A tighter checkout surface keeps delivery choices, payment context, and cart review readable at a glance.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="stat-pill min-w-[150px]">
              <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Items</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{itemCount}</p>
            </div>
            <div className="stat-pill min-w-[150px]">
              <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Mode</p>
              <p className="mt-2 text-lg font-semibold capitalize text-foreground">{deliveryMode}</p>
            </div>
            <div className="stat-pill min-w-[150px]">
              <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Drop-off</p>
              <p className="mt-2 text-lg font-semibold text-foreground">
                {selectedAddress?.label ?? "Choose address"}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-5">
          {submissionError ? <ErrorState description={submissionError} /> : null}
          <Card className="bg-white/85">
            <CardHeader className="border-b border-border/70 bg-surface/35">
              <CardTitle className="text-2xl">Order mode</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 pt-6 sm:grid-cols-2">
              {(["delivery", "pickup"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={cn(
                    "rounded-[24px] border p-4 text-left transition",
                    deliveryMode === mode
                      ? "border-primary bg-primary/6 shadow-sm"
                      : "border-border bg-white/75 hover:border-primary/30"
                  )}
                  onClick={() => setDeliveryMode(mode)}
                >
                  <p className="font-semibold capitalize text-foreground">{mode}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {mode === "delivery"
                      ? "Doorstep drop-off with saved addresses and live order tracking."
                      : "Skip the courier leg and collect directly from the restaurant."}
                  </p>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-white/85">
            <CardHeader className="border-b border-border/70 bg-surface/35">
              <CardTitle className="text-2xl">Items from {restaurant?.name ?? "your selected restaurant"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              {items.map((item) => (
                <CartItemRow
                  key={item.id}
                  item={item}
                  onQuantityChange={(value) => updateQuantity(item.id, value)}
                  onRemove={() => removeItem(item.id)}
                />
              ))}
            </CardContent>
          </Card>

          <Card className="bg-white/85">
            <CardHeader className="border-b border-border/70 bg-surface/35">
              <CardTitle className="flex items-center gap-2 text-2xl">
                <MapPinned className="h-5 w-5 text-primary" />
                Delivery address
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 pt-6 sm:grid-cols-2">
              {addresses.map((address) => {
                const active = selectedAddressId === address.id;
                return (
                  <button
                    key={address.id}
                    type="button"
                    className={cn(
                      "rounded-[24px] border p-4 text-left transition",
                      active
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border bg-white hover:border-primary/30"
                    )}
                    onClick={() => setSelectedAddressId(address.id)}
                  >
                    <p className="font-semibold text-foreground">{address.label}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{address.line1}</p>
                    <p className="text-sm text-muted-foreground">{address.city}</p>
                    {address.instructions ? (
                      <p className="mt-2 text-xs text-muted-foreground">{address.instructions}</p>
                    ) : null}
                  </button>
                );
              })}
            </CardContent>
          </Card>

          <Card className="bg-white/85">
            <CardHeader className="border-b border-border/70 bg-surface/35">
              <CardTitle className="flex items-center gap-2 text-2xl">
                <CreditCard className="h-5 w-5 text-primary" />
                Payment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-6 text-sm text-muted-foreground">
              <div className="frost-panel p-4">
                <p className="font-semibold text-foreground">Visa ending in 1842</p>
                <p className="mt-1">Saved cards appear here so payment details stay quick to confirm before submit.</p>
              </div>
              <div className="rounded-[24px] border border-dashed border-border bg-secondary/60 p-4">
                Wallets and saved payment methods live in this section alongside your primary card.
              </div>
              <div className="frost-panel flex items-start gap-3 p-4">
                <WalletCards className="mt-0.5 h-4 w-4 text-primary" />
                <p>Card verification, wallet actions, and payment prompts stay grouped here without crowding the summary rail.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/85">
            <CardHeader className="border-b border-border/70 bg-surface/35">
              <CardTitle className="text-2xl">Order notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-6">
              <div className="frost-panel flex items-start gap-3 p-4 text-sm text-muted-foreground">
                <ShieldCheck className="mt-0.5 h-4 w-4 text-primary" />
                <p>Use this for concierge instructions, gate codes, or kitchen requests that should travel with the order payload.</p>
              </div>
              <Textarea
                value={orderNotes}
                onChange={(event) => setOrderNotes(event.target.value)}
                placeholder="Gate code, allergy note, leave at concierge, etc."
              />
            </CardContent>
          </Card>
        </div>

        <CheckoutSummary
          deliveryFee={deliveryMode === "delivery" ? restaurant?.deliveryFee ?? 2.99 : 0}
          submitLabel={submitting ? "Placing order..." : "Place order"}
          disabled={submitting || !authHydrated || !sessionUser || sessionUser.role !== "customer"}
          onSubmit={async () => {
            if (!authHydrated || !sessionUser) {
              setSubmissionError("Sign in with a customer account before placing an order.");
              return;
            }

            if (sessionUser.role !== "customer") {
              setSubmissionError("Only customer accounts can place food orders.");
              return;
            }

            setSubmitting(true);
            setSubmissionError("");
            try {
              const result = await apiClient.checkout({
                items,
                deliveryMode,
                promoCode,
                notes: orderNotes,
                addressId: selectedAddress?.id,
                deliveryAddress: selectedAddress
                  ? `${selectedAddress.line1}, ${selectedAddress.city}`
                  : undefined
              });
              setConfirmation(
                `Checkout complete for ${sessionUser.fullName ?? user?.fullName ?? "guest"}. Order ${result.orderId} is now ${result.status.replaceAll("_", " ")}.`
              );
              clearCart();
            } catch (error) {
              setSubmissionError(error instanceof Error ? error.message : "Unable to place the order.");
            } finally {
              setSubmitting(false);
            }
          }}
        />
      </div>
    </div>
  );
}
