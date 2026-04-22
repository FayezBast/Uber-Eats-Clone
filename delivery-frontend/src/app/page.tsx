import Link from "next/link";
import { ArrowRight, Clock3, ShieldCheck, Sparkles } from "lucide-react";

import { AddressInput } from "@/components/common/address-input";
import { SectionHeading } from "@/components/common/section-heading";
import { CategoryChipRow } from "@/components/landing/category-chip-row";
import { PromoBanner } from "@/components/landing/promo-banner";
import { RestaurantCard } from "@/components/restaurants/restaurant-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiClient } from "@/services/api/client";

export default async function LandingPage() {
  const landing = await apiClient.getLandingData();

  return (
    <div className="pb-20">
      <section className="container py-8 sm:py-10 lg:py-14">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6 rounded-[36px] border border-white/60 bg-hero-radial p-8 shadow-glow sm:p-10">
            <Badge className="w-fit gap-2 bg-white/70 text-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Original premium delivery UI
            </Badge>
            <div className="space-y-4">
              <h1 className="max-w-3xl font-display text-5xl leading-tight text-foreground sm:text-6xl lg:text-7xl">
                Order dinner with the calm of a concierge and the speed of a city app.
              </h1>
              <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">
                Savora pairs polished restaurant discovery with fast checkout, dependable account
                flows, and delivery tracking that stays easy to navigate.
              </p>
            </div>
            <AddressInput />
            <div className="grid gap-3 sm:grid-cols-3">
              <Card className="bg-white/75">
                <CardContent className="p-5">
                  <Clock3 className="mb-3 h-5 w-5 text-primary" />
                  <p className="text-sm text-muted-foreground">Typical drop-off</p>
                  <p className="mt-1 text-xl font-semibold">18-28 min</p>
                </CardContent>
              </Card>
              <Card className="bg-white/75">
                <CardContent className="p-5">
                  <ShieldCheck className="mb-3 h-5 w-5 text-primary" />
                  <p className="text-sm text-muted-foreground">Checkout flow</p>
                  <p className="mt-1 text-xl font-semibold">Saved payment support</p>
                </CardContent>
              </Card>
              <Card className="bg-white/75">
                <CardContent className="p-5">
                  <Sparkles className="mb-3 h-5 w-5 text-primary" />
                  <p className="text-sm text-muted-foreground">House curation</p>
                  <p className="mt-1 text-xl font-semibold">Top-rated kitchens</p>
                </CardContent>
              </Card>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            {landing.featuredRestaurants.slice(0, 2).map((restaurant) => (
              <RestaurantCard key={restaurant.id} restaurant={restaurant} />
            ))}
          </div>
        </div>
      </section>

      <section className="container space-y-6 py-8">
        <SectionHeading
          eyebrow="Shortcuts"
          title="Browse by mood, not just cuisine."
          description="Original category groupings designed to feel editorial instead of generic."
        />
        <CategoryChipRow categories={landing.categories} />
      </section>

      <section className="container space-y-6 py-8">
        <SectionHeading
          eyebrow="Featured"
          title="Restaurants worth opening first."
          description="Top-rated kitchens with strong menus, delivery timing, and the details people check before they order."
          action={
            <Button asChild variant="outline">
              <Link href="/restaurants">
                Explore all
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          }
        />
        <div className="grid gap-5 lg:grid-cols-3">
          {landing.featuredRestaurants.map((restaurant) => (
            <RestaurantCard key={restaurant.id} restaurant={restaurant} />
          ))}
        </div>
      </section>

      <section className="container grid gap-5 py-8 lg:grid-cols-2">
        {landing.promos.map((promo) => (
          <PromoBanner key={promo.id} promo={promo} />
        ))}
      </section>

      <section className="container space-y-6 py-8">
        <SectionHeading
          eyebrow="Order again"
          title="Pick up where last week left off."
          description="A dedicated reorder rail for high-frequency customers."
        />
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {landing.orderAgain.map((restaurant) => (
            <RestaurantCard key={restaurant.id} restaurant={restaurant} />
          ))}
        </div>
      </section>
    </div>
  );
}
