"use client";

import Link from "next/link";
import { ArrowRight, Bike, Dot, Star } from "lucide-react";
import { motion } from "framer-motion";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatEta, formatRating } from "@/lib/format";
import { type Restaurant } from "@/types";

import { MockImage } from "../common/mock-image";

interface RestaurantCardProps {
  restaurant: Restaurant;
}

export function RestaurantCard({ restaurant }: RestaurantCardProps) {
  const cuisineLabel = restaurant.cuisines[0] ?? "Featured";

  return (
    <motion.div whileHover={{ y: -6 }} transition={{ duration: 0.22 }}>
      <Link href={`/restaurants/${restaurant.id}`} className="group block">
        <Card className="overflow-hidden border-white/80 bg-white/82 backdrop-blur">
          <div className="relative">
            <MockImage
              title={restaurant.name}
              subtitle={restaurant.heroTagline}
              theme={restaurant.imageTheme}
              badgeLabel={null}
              className="h-60 rounded-none rounded-t-[28px]"
            />
            <div className="absolute left-4 right-4 top-4 flex flex-wrap gap-2">
              <Badge className="max-w-full bg-white/82 text-foreground">
                {cuisineLabel}
              </Badge>
              {restaurant.supportsPickup ? (
                <Badge variant="secondary">
                  Pickup ready
                </Badge>
              ) : null}
            </div>
          </div>
          <CardContent className="space-y-4 p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
                  {restaurant.heroTagline}
                </p>
                <h3 className="text-lg font-semibold text-foreground">{restaurant.name}</h3>
                <p className="text-sm text-muted-foreground">{restaurant.shortDescription}</p>
              </div>
              <div className="rounded-full bg-secondary/90 px-3 py-1 text-sm font-semibold">
                {restaurant.priceLevel}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 font-semibold text-foreground">
                <Star className="h-4 w-4 fill-current text-amber-500" />
                {formatRating(restaurant.rating)}
              </span>
              <span className="inline-flex items-center gap-1">
                {formatEta(restaurant.etaMin, restaurant.etaMax)}
              </span>
              <Dot className="h-4 w-4" />
              <span>{formatCurrency(restaurant.deliveryFee)} fee</span>
              <Dot className="h-4 w-4" />
              <span className="inline-flex items-center gap-1">
                <Bike className="h-4 w-4" />
                Min {formatCurrency(restaurant.minimumOrder)}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {restaurant.tags.map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-border/70 pt-4">
              <span className="text-sm font-semibold text-foreground">Open menu</span>
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/85 text-foreground transition group-hover:bg-primary group-hover:text-primary-foreground">
                <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}
