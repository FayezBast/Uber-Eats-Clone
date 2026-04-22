"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Clock3, MapPinned, Navigation, Sparkles } from "lucide-react";

import { FilterDrawer } from "@/components/discovery/filter-drawer";
import { FilterSidebar } from "@/components/discovery/filter-sidebar";
import { SearchHeader } from "@/components/discovery/search-header";
import { RestaurantCard } from "@/components/restaurants/restaurant-card";
import { EmptyState } from "@/components/states/empty-state";
import { ErrorState } from "@/components/states/error-state";
import { SkeletonCard } from "@/components/states/skeleton-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient } from "@/services/api/client";
import { type Restaurant, type RestaurantFilters } from "@/types";

const defaultFilters: RestaurantFilters = {
  search: "",
  cuisines: [],
  sort: "recommended",
  deliveryMode: "delivery"
};

export default function RestaurantsPage() {
  const [filters, setFilters] = useState<RestaurantFilters>(defaultFilters);
  const [items, setItems] = useState<Restaurant[]>([]);
  const [allRestaurants, setAllRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadMeta() {
      try {
        const data = await apiClient.getRestaurants();
        if (mounted) {
          setAllRestaurants(data);
        }
      } catch {
        // The filtered request below drives the visible error state.
      }
    }

    void loadMeta();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError("");

    apiClient
      .getRestaurants(filters)
      .then((data) => {
        if (mounted) {
          setItems(data);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Unable to load restaurants.");
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [filters]);

  const cuisines = useMemo(
    () =>
      Array.from(new Set(allRestaurants.flatMap((restaurant) => restaurant.cuisines))).sort((a, b) =>
        a.localeCompare(b)
      ),
    [allRestaurants]
  );
  const averageEta = useMemo(() => {
    if (!allRestaurants.length) return 0;
    const total = allRestaurants.reduce(
      (sum, restaurant) => sum + (restaurant.etaMin + restaurant.etaMax) / 2,
      0
    );

    return Math.round(total / allRestaurants.length);
  }, [allRestaurants]);
  const mapRestaurants = items.length ? items.slice(0, 3) : allRestaurants.slice(0, 3);

  return (
    <div className="container space-y-6 py-8 sm:py-10">
      <section className="section-shell p-6 sm:p-8">
        <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-3">
            <Badge className="w-fit gap-2">
              <Sparkles className="h-3.5 w-3.5" />
              Discovery
            </Badge>
            <h1 className="balance-text font-display text-5xl text-foreground sm:text-6xl">
              Find the right kitchen fast.
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              Search, filter, sort, and compare restaurants with a calmer discovery shell, clearer
              categories, and a desktop map panel that still works on mobile.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="stat-pill min-w-[150px]">
              <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Open kitchens</p>
              <p className="mt-2 text-lg font-semibold text-foreground">
                {items.length || allRestaurants.length}
              </p>
            </div>
            <div className="stat-pill min-w-[150px]">
              <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Typical ETA</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{averageEta || 24} min</p>
            </div>
            <div className="stat-pill min-w-[150px]">
              <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Modes</p>
              <p className="mt-2 text-lg font-semibold text-foreground">Delivery + pickup</p>
            </div>
          </div>
        </div>
      </section>

      <SearchHeader
        search={filters.search ?? ""}
        onSearchChange={(search) => setFilters((current) => ({ ...current, search }))}
        resultsCount={items.length}
        onOpenFilters={() => setMobileFiltersOpen(true)}
      />

      <section className="section-shell p-4">
        <div className="relative z-10 flex flex-col gap-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
              Quick cuisine filters
            </p>
            <p className="text-sm text-muted-foreground">Tap any cuisine to narrow the board instantly.</p>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {cuisines.map((cuisine) => {
              const active = filters.cuisines?.includes(cuisine);
              return (
                <Button
                  key={cuisine}
                  type="button"
                  size="sm"
                  variant={active ? "default" : "outline"}
                  className="rounded-full"
                  onClick={() =>
                    setFilters((current) => ({
                      ...current,
                      cuisines: active
                        ? (current.cuisines ?? []).filter((entry) => entry !== cuisine)
                        : [...(current.cuisines ?? []), cuisine]
                    }))
                  }
                >
                  {cuisine}
                </Button>
              );
            })}
          </div>
        </div>
      </section>

      <FilterDrawer
        cuisines={cuisines}
        filters={filters}
        onFiltersChange={setFilters}
        open={mobileFiltersOpen}
        onOpenChange={setMobileFiltersOpen}
      />

      <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
        <FilterSidebar
          cuisines={cuisines}
          filters={filters}
          onFiltersChange={setFilters}
          className="hidden h-fit xl:block"
        />

        <div className="space-y-5">
          {error ? (
            <ErrorState
              description={error}
              action={
                <Button onClick={() => setFilters({ ...filters })} variant="outline">
                  Try again
                </Button>
              }
            />
          ) : loading ? (
            <div className="grid gap-5 md:grid-cols-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <SkeletonCard key={index} />
              ))}
            </div>
          ) : items.length ? (
            <div className="grid gap-5 md:grid-cols-2">
              {items.map((restaurant) => (
                <RestaurantCard key={restaurant.id} restaurant={restaurant} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No restaurants match this filter set"
              description="Try removing one or two filters, or search a broader cuisine label."
              action={
                <Button onClick={() => setFilters(defaultFilters)} variant="outline">
                  Clear filters
                </Button>
              }
            />
          )}
        </div>

        <Card className="hidden h-fit overflow-hidden xl:block">
          <CardHeader className="border-b border-border/70 bg-surface/35">
            <CardTitle className="flex items-center gap-2 text-2xl">
              <MapPinned className="h-5 w-5 text-primary" />
              Nearby panel
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-slate-950 via-emerald-950/90 to-orange-400 p-5 text-white">
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px)] bg-[size:34px_34px] opacity-25" />
              <div className="relative grid gap-4">
                <div className="rounded-[20px] bg-white/10 p-4 backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/70">Current drop-off</p>
                  <p className="mt-2 font-semibold">214 Cedar Row, Brooklyn</p>
                </div>
                {mapRestaurants.map((restaurant) => (
                  <div
                    key={restaurant.id}
                    className="flex items-center justify-between rounded-[20px] bg-white/12 px-4 py-3 backdrop-blur"
                  >
                    <div>
                      <p className="font-semibold">{restaurant.name}</p>
                      <p className="text-xs text-white/70">
                        {restaurant.distanceMiles} miles away • {(restaurant.etaMin + restaurant.etaMax) / 2} min
                      </p>
                    </div>
                    <Navigation className="h-4 w-4" />
                  </div>
                ))}
              </div>
            </div>
            <div className="frost-panel flex items-start gap-3 p-4 text-sm text-muted-foreground">
              <Clock3 className="mt-0.5 h-4 w-4 text-primary" />
              <p>Use the filter rail to move between fast delivery, top-rated spots, and lower-fee orders.</p>
            </div>
            <Button asChild className="w-full">
              <Link href={items[0] ? `/restaurants/${items[0].id}` : "/restaurants"}>
                Jump into a menu
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
