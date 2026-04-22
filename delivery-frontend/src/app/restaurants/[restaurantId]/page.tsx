import { notFound } from "next/navigation";
import { Clock3, DollarSign, MapPin, Sparkles, Star } from "lucide-react";

import { MockImage } from "@/components/common/mock-image";
import { MenuSection } from "@/components/restaurants/menu-section";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckoutSummary } from "@/components/cart/checkout-summary";
import { formatCurrency, formatEta, formatRating } from "@/lib/format";
import { apiClient } from "@/services/api/client";

interface RestaurantDetailsPageProps {
  params: { restaurantId: string };
}

export default async function RestaurantDetailsPage({ params }: RestaurantDetailsPageProps) {
  const { restaurantId } = params;
  const restaurant = await apiClient.getRestaurantById(restaurantId);

  if (!restaurant) {
    notFound();
  }

  return (
    <div className="container space-y-8 py-8 sm:py-10">
      <section className="section-shell shadow-glow">
        <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="p-6 sm:p-8">
            <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-1">
              <Badge className="w-fit shrink-0 gap-2">
                <Sparkles className="h-3.5 w-3.5" />
                {restaurant.cuisines.slice(0, 2).join(" • ")}
              </Badge>
              {restaurant.supportsPickup ? (
                <Badge variant="secondary" className="shrink-0">
                  Pickup available
                </Badge>
              ) : null}
            </div>
            <h1 className="balance-text font-display text-5xl leading-tight text-foreground sm:text-6xl">
              {restaurant.name}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
              {restaurant.longDescription}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <div className="stat-pill text-sm font-medium">
                <Star className="mr-2 inline-flex h-4 w-4 fill-current text-amber-500" />
                {formatRating(restaurant.rating)} ({restaurant.reviewCount})
              </div>
              <div className="stat-pill text-sm font-medium">
                <Clock3 className="mr-2 inline-flex h-4 w-4 text-primary" />
                {formatEta(restaurant.etaMin, restaurant.etaMax)}
              </div>
              <div className="stat-pill text-sm font-medium">
                <DollarSign className="mr-2 inline-flex h-4 w-4 text-primary" />
                {formatCurrency(restaurant.deliveryFee)} delivery fee
              </div>
              <div className="stat-pill text-sm font-medium">
                <MapPin className="mr-2 inline-flex h-4 w-4 text-primary" />
                {restaurant.address}
              </div>
            </div>
          </div>
          <MockImage
            title={restaurant.name}
            subtitle={restaurant.heroTagline}
            theme={restaurant.imageTheme}
            className="min-h-[320px] rounded-none lg:min-h-[420px]"
          />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Tabs defaultValue="menu">
          <TabsList>
            <TabsTrigger value="menu">Menu</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
            <TabsTrigger value="info">Info</TabsTrigger>
          </TabsList>
          <TabsContent value="menu" className="space-y-8">
            {restaurant.menuSections.map((section) => (
              <MenuSection key={section.id} restaurantId={restaurant.id} section={section} />
            ))}
          </TabsContent>
          <TabsContent value="reviews">
            <div className="grid gap-4">
              {restaurant.reviews.map((review) => (
                <Card key={review.id} className="overflow-hidden bg-white/85">
                  <CardHeader className="border-b border-border/70 bg-surface/35">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <CardTitle className="text-2xl">{review.title}</CardTitle>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {review.author} • {review.date.slice(0, 10)}
                        </p>
                      </div>
                      <Badge variant="outline">{review.rating.toFixed(1)} / 5</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 text-sm text-muted-foreground">{review.body}</CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="info">
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="overflow-hidden bg-white/85">
                <CardHeader className="border-b border-border/70 bg-surface/35">
                  <CardTitle className="text-2xl">Hours</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-0 text-sm text-muted-foreground">
                  {restaurant.openingHours.map((entry) => (
                    <p key={entry}>{entry}</p>
                  ))}
                </CardContent>
              </Card>
              <Card className="overflow-hidden bg-white/85">
                <CardHeader className="border-b border-border/70 bg-surface/35">
                  <CardTitle className="text-2xl">What to expect</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-0 text-sm text-muted-foreground">
                  {restaurant.infoBullets.map((entry) => (
                    <p key={entry}>{entry}</p>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        <div className="space-y-4">
          <CheckoutSummary
            deliveryFee={restaurant.deliveryFee}
            submitLabel="Go to checkout"
            actionHref="/checkout"
            showPromoField={false}
          />
          <Card className="overflow-hidden bg-white/85">
            <CardHeader className="border-b border-border/70 bg-surface/35">
              <CardTitle className="text-2xl">Quick facts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-6 text-sm text-muted-foreground">
              <div className="frost-panel p-4">
                <p>Minimum order: {formatCurrency(restaurant.minimumOrder)}</p>
              </div>
              <div className="frost-panel p-4">
                <p>Distance: {restaurant.distanceMiles.toFixed(1)} miles</p>
              </div>
              <div className="frost-panel p-4">
                <p>Pickup available: {restaurant.supportsPickup ? "Yes" : "No"}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
