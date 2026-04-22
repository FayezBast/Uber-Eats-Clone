"use client";

import Link from "next/link";
import { ArrowUpRight, MapPin, Sparkles } from "lucide-react";
import { usePathname } from "next/navigation";

export function SiteFooter() {
  const pathname = usePathname();

  if (pathname.startsWith("/auth/") || pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <footer className="pb-8 pt-12">
      <div className="container">
        <div className="section-shell px-6 py-8 sm:px-8 sm:py-10">
          <div className="grid gap-10 lg:grid-cols-[1.4fr_0.8fr_0.8fr_1fr]">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/72 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                Savora service
              </div>
              <div className="space-y-3">
                <p className="font-display text-4xl text-foreground">Dining flows with a calmer UI.</p>
                <p className="max-w-xl text-sm leading-6 text-muted-foreground">
                  A premium delivery experience shaped for easier discovery, reliable ordering, and
                  faster repeat checkout.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="stat-pill">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                    Coverage
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">Downtown to waterfront</p>
                </div>
                <div className="stat-pill">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Support</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">7 AM to midnight</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-foreground/70">Explore</p>
              <div className="space-y-2 text-sm text-muted-foreground">
                <Link className="flex items-center justify-between hover:text-foreground" href="/restaurants">
                  Restaurants
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
                <Link className="flex items-center justify-between hover:text-foreground" href="/checkout">
                  Checkout
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
                <Link className="flex items-center justify-between hover:text-foreground" href="/orders">
                  Orders
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-foreground/70">Account</p>
              <div className="space-y-2 text-sm text-muted-foreground">
                <Link className="flex items-center justify-between hover:text-foreground" href="/auth/sign-in">
                  Sign in
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
                <Link className="flex items-center justify-between hover:text-foreground" href="/auth/sign-up">
                  Create account
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-foreground/70">Current city</p>
              <div className="frost-panel space-y-3 p-4 text-sm text-muted-foreground">
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 text-primary" />
                  <div>
                    <p className="font-semibold text-foreground">214 Cedar Row, Brooklyn</p>
                    <p className="mt-1">Delivery, pickup, and reorder flows tuned for dense neighborhoods.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 border-t border-white/60 pt-6 text-sm text-muted-foreground">
            Savora brings ordering, delivery tracking, and repeat checkout into one consistent flow.
          </div>
        </div>
      </div>
    </footer>
  );
}
