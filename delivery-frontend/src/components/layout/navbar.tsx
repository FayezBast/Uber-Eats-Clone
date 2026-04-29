"use client";

import Link from "next/link";
import { Clock3, Compass, LogOut, MapPin, ShieldCheck, Store, Truck, UserRound } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { CartDrawer } from "@/components/cart/cart-drawer";
import { useAuthStore } from "@/store/auth-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getAdminAppUrl, isExternalUrl } from "@/lib/admin-url";
import { cn } from "@/lib/utils";

interface NavLinkItem {
  href: string;
  label: string;
  external?: boolean;
}

const navLinks: NavLinkItem[] = [
  { href: "/", label: "Home" },
  { href: "/restaurants", label: "Discover" },
  { href: "/orders", label: "Orders" }
];

export function Navbar() {
  const pathname = usePathname();
  const isAuthRoute = pathname.startsWith("/auth/");
  const isAdminRoute = pathname.startsWith("/admin");
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const expiresAt = useAuthStore((state) => state.expiresAt);
  const hydrated = useAuthStore((state) => state.hydrated);
  const clearSession = useAuthStore((state) => state.clearSession);
  const [mounted, setMounted] = useState(false);
  const adminAppUrl = user && token ? getAdminAppUrl({ token, expiresAt, user }) : getAdminAppUrl();

  useEffect(() => {
    setMounted(true);
  }, []);

  const roleLinks = useMemo<NavLinkItem[]>(() => {
    if (!mounted || !hydrated || !user) {
      return [];
    }

    if (user.role === "driver") {
      return [{ href: "/driver", label: "Driver" }];
    }

    if (user.role === "admin") {
      return [{ href: adminAppUrl, label: "Admin Console", external: isExternalUrl(adminAppUrl) }];
    }

    if (user.role === "owner") {
      return [{ href: "/owner", label: "Restaurant Studio" }];
    }

    return [];
  }, [adminAppUrl, hydrated, mounted, user]);

  if (isAuthRoute || isAdminRoute) {
    return null;
  }

  return (
    <header className="sticky top-0 z-40 px-3 pt-3">
      <div className="container">
        <div className="section-shell flex min-h-[84px] flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-4 lg:gap-6">
            <Link href="/" className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-foreground text-white shadow-float">
                <Compass className="h-5 w-5" />
              </span>
              <span>
                <span className="block font-display text-3xl leading-none text-foreground">Savora</span>
                <span className="block text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                  City dining delivered
                </span>
              </span>
            </Link>
            <nav className="hidden items-center gap-1 rounded-full bg-white/72 p-1 md:flex">
              {[...navLinks, ...roleLinks].map((link) => {
                const active = !link.external && (link.href === "/" ? pathname === link.href : pathname.startsWith(link.href));
                const className = cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition hover:bg-white/70",
                  active ? "bg-foreground text-white shadow-sm" : "text-muted-foreground"
                );

                return link.external ? (
                  <a key={link.href} href={link.href} className={className}>
                    {link.label}
                  </a>
                ) : (
                  <Link key={link.href} href={link.href} className={className}>
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 xl:flex">
              <div className="stat-pill flex items-center gap-3">
                <MapPin className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                    Delivering to
                  </p>
                  <p className="text-sm font-semibold text-foreground">214 Cedar Row</p>
                </div>
              </div>
              <div className="stat-pill hidden items-center gap-2 lg:flex">
                <Clock3 className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">18-28 min</span>
              </div>
            </div>
            <CartDrawer />
            {mounted && hydrated && user ? (
              <>
                <div className="hidden items-center gap-2 rounded-full bg-white/74 px-3 py-2 sm:flex">
                  {user.role === "driver" ? (
                    <Truck className="h-4 w-4 text-primary" />
                  ) : user.role === "admin" ? (
                    <ShieldCheck className="h-4 w-4 text-primary" />
                  ) : user.role === "owner" ? (
                    <Store className="h-4 w-4 text-primary" />
                  ) : (
                    <UserRound className="h-4 w-4 text-primary" />
                  )}
                  <span className="text-sm font-semibold text-foreground">{user.fullName}</span>
                  <Badge variant="secondary" className="text-[10px] uppercase">
                    {user.role}
                  </Badge>
                </div>
                <Button
                  variant="outline"
                  className="hidden sm:inline-flex"
                  onClick={() => {
                    clearSession();
                    router.push("/");
                    router.refresh();
                  }}
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
              </>
            ) : (
              <Button asChild variant="outline" className="hidden sm:inline-flex">
                <Link href="/auth/sign-in">
                  <UserRound className="h-4 w-4" />
                  Sign in
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
