"use client";

import Link from "next/link";
import { type ChangeEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  type LucideIcon,
  ArrowUpRight,
  BellRing,
  Camera,
  ChefHat,
  ChartColumn,
  ClipboardList,
  Clock3,
  CircleDollarSign,
  ImagePlus,
  Layers3,
  MessageSquare,
  Plus,
  Receipt,
  Sparkles,
  Star,
  Store,
  Trash2,
  TrendingUp,
  TriangleAlert,
  Users,
  Wallet
} from "lucide-react";

import { MockImage } from "@/components/common/mock-image";
import { EmptyState } from "@/components/states/empty-state";
import { SkeletonCard } from "@/components/states/skeleton-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatOrderTime, formatStatusLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import { restaurants } from "@/mocks/data";
import { useAuthStore } from "@/store/auth-store";
import type { AppRole, ImageTheme, MenuItem, Restaurant } from "@/types";

type OwnerItemStatus = "live" | "draft" | "sold_out";
type PhotoCategory = "cover" | "dish" | "ambience";
type ServiceTicketStatus = "new" | "preparing" | "ready" | "pickup";
type OwnerActionPriority = "good" | "watch" | "urgent";

interface OwnerMenuItem extends MenuItem {
  status: OwnerItemStatus;
  prepTimeMinutes: number;
  photoId?: string;
}

interface OwnerMenuSection {
  id: string;
  title: string;
  description: string;
  items: OwnerMenuItem[];
}

interface RestaurantPhotoAsset {
  id: string;
  title: string;
  caption: string;
  theme: ImageTheme;
  category: PhotoCategory;
  addedAt: string;
  url?: string;
}

interface InsightMetric {
  label: string;
  value: string;
  footnote: string;
  icon: LucideIcon;
}

interface ServiceTicket {
  id: string;
  guest: string;
  channel: "Delivery" | "Pickup";
  items: string[];
  promisedAt: string;
  total: number;
  status: ServiceTicketStatus;
  note: string;
}

interface RevenueDay {
  label: string;
  revenue: number;
  orders: number;
}

interface OwnerActionItem {
  title: string;
  description: string;
  cta: string;
  priority: OwnerActionPriority;
  icon: LucideIcon;
}

const ownerRestaurant = restaurants[0];

const busyHours = [
  { label: "11 AM", value: 48 },
  { label: "1 PM", value: 86 },
  { label: "4 PM", value: 38 },
  { label: "7 PM", value: 100 },
  { label: "9 PM", value: 72 }
];

const performanceOffsets = ["+14%", "+11%", "+8%"];

const selectFieldClassName =
  "h-11 w-full rounded-full border border-border/80 bg-white/82 px-4 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function resolveWorkspaceHref(role: AppRole) {
  switch (role) {
    case "driver":
      return "/driver";
    case "admin":
      return "/admin";
    case "owner":
      return "/owner";
    default:
      return "/orders";
  }
}

function createInitialGallery(restaurant: Restaurant): RestaurantPhotoAsset[] {
  const menuPhotos = restaurant.menuSections.flatMap((section) =>
    section.items.map((item, index) => ({
      id: `photo-${item.id}`,
      title: item.name,
      caption: item.description,
      theme: item.imageTheme ?? restaurant.imageTheme,
      category: "dish" as const,
      addedAt: `2026-04-${String(12 + index).padStart(2, "0")}T12:30:00Z`
    }))
  );

  return [
    {
      id: `photo-${restaurant.id}-cover`,
      title: `${restaurant.name} cover shot`,
      caption: restaurant.heroTagline,
      theme: restaurant.imageTheme,
      category: "cover",
      addedAt: "2026-04-18T09:20:00Z"
    },
    {
      id: `photo-${restaurant.id}-dining-room`,
      title: "Dining room lighting",
      caption: "Warm ambient shot for the storefront hero and pickup section.",
      theme: "night",
      category: "ambience",
      addedAt: "2026-04-17T18:45:00Z"
    },
    ...menuPhotos
  ];
}

function createInitialSections(restaurant: Restaurant): OwnerMenuSection[] {
  return restaurant.menuSections.map((section, sectionIndex) => ({
    id: section.id,
    title: section.title,
    description: section.description,
    items: section.items.map((item, itemIndex) => ({
      ...item,
      imageTheme: item.imageTheme ?? restaurant.imageTheme,
      photoId: `photo-${item.id}`,
      prepTimeMinutes: 8 + sectionIndex * 3 + itemIndex * 2,
      status: item.popular || itemIndex === 0 ? "live" : itemIndex % 2 === 0 ? "draft" : "live"
    }))
  }));
}

function itemStatusVariant(status: OwnerItemStatus) {
  switch (status) {
    case "live":
      return "success" as const;
    case "draft":
      return "outline" as const;
    default:
      return "secondary" as const;
  }
}

function serviceTicketVariant(status: ServiceTicketStatus) {
  switch (status) {
    case "new":
      return "outline" as const;
    case "preparing":
      return "default" as const;
    case "ready":
      return "success" as const;
    default:
      return "secondary" as const;
  }
}

function ownerActionVariant(priority: OwnerActionPriority) {
  switch (priority) {
    case "good":
      return "success" as const;
    case "watch":
      return "outline" as const;
    default:
      return "default" as const;
  }
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
      {children}
    </p>
  );
}

function InsightCard({ label, value, footnote, icon: Icon }: InsightMetric) {
  return (
    <Card className="overflow-hidden bg-white/86">
      <CardContent className="p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="rounded-2xl bg-primary/12 p-3 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <Badge variant="outline">{label}</Badge>
        </div>
        <p className="mt-5 font-display text-4xl leading-none text-foreground">{value}</p>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{footnote}</p>
      </CardContent>
    </Card>
  );
}

function PhotoSurface({
  photo,
  className,
  fallbackTitle,
  fallbackSubtitle,
  fallbackTheme,
  badgeLabel
}: {
  photo?: RestaurantPhotoAsset;
  className?: string;
  fallbackTitle: string;
  fallbackSubtitle?: string;
  fallbackTheme: ImageTheme;
  badgeLabel?: string | null;
}) {
  if (photo?.url) {
    return (
      <div
        aria-label={photo.title}
        role="img"
        className={cn(
          "relative overflow-hidden rounded-[28px] border border-white/60 bg-cover bg-center bg-no-repeat shadow-float",
          className
        )}
        style={{ backgroundImage: `url(${photo.url})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/45 via-foreground/10 to-transparent" />
        <div className="absolute left-5 top-5">
          {badgeLabel ? <Badge variant="outline">{badgeLabel}</Badge> : null}
        </div>
        <div className="absolute inset-x-5 bottom-5">
          <p className="font-display text-3xl leading-tight text-white">{photo.title}</p>
          <p className="mt-1 max-w-lg text-sm text-white/85">{photo.caption}</p>
        </div>
      </div>
    );
  }

  return (
    <MockImage
      title={photo?.title ?? fallbackTitle}
      subtitle={photo?.caption ?? fallbackSubtitle}
      theme={photo?.theme ?? fallbackTheme}
      className={className}
      badgeLabel={badgeLabel ?? null}
    />
  );
}

export default function OwnerPage() {
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [restaurantName, setRestaurantName] = useState(ownerRestaurant.name);
  const [heroTagline, setHeroTagline] = useState(ownerRestaurant.heroTagline);
  const [shortDescription, setShortDescription] = useState(ownerRestaurant.shortDescription);
  const [isOpenForOrders, setIsOpenForOrders] = useState(true);
  const [pickupEnabled, setPickupEnabled] = useState(Boolean(ownerRestaurant.supportsPickup));
  const [menuSections, setMenuSections] = useState<OwnerMenuSection[]>(() =>
    createInitialSections(ownerRestaurant)
  );
  const [gallery, setGallery] = useState<RestaurantPhotoAsset[]>(() =>
    createInitialGallery(ownerRestaurant)
  );
  const [photoTitle, setPhotoTitle] = useState("");
  const [photoCaption, setPhotoCaption] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoTheme, setPhotoTheme] = useState<ImageTheme>(ownerRestaurant.imageTheme);
  const [photoCategory, setPhotoCategory] = useState<PhotoCategory>("dish");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("saved");
  const [lastSavedAt, setLastSavedAt] = useState("2026-04-20T09:15:00Z");

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const flatItems = useMemo(
    () => menuSections.flatMap((section) => section.items.map((item) => ({ ...item, sectionTitle: section.title }))),
    [menuSections]
  );

  const coverPhoto = gallery.find((photo) => photo.category === "cover") ?? gallery[0];
  const liveItems = flatItems.filter((item) => item.status === "live");
  const draftItems = flatItems.filter((item) => item.status === "draft");
  const soldOutItems = flatItems.filter((item) => item.status === "sold_out");
  const itemsWithPhotos = flatItems.filter((item) => gallery.some((photo) => photo.id === item.photoId));
  const photoCoverage = flatItems.length ? Math.round((itemsWithPhotos.length / flatItems.length) * 100) : 0;
  const ordersToday = 54 + liveItems.length * 9;
  const weeklyRevenue = 8200 + liveItems.length * 735 + gallery.length * 85;
  const todayRevenue = Math.round(weeklyRevenue * 0.23);
  const ordersInFlight = Math.max(6, Math.round(ordersToday * 0.17));
  const averageOrderValue = weeklyRevenue / Math.max(1, ordersToday);
  const payoutPending = Math.round(weeklyRevenue * 0.18);
  const repeatGuests = 31 + Math.min(18, gallery.length + liveItems.length);
  const averagePrepTime = Math.round(
    flatItems.reduce((sum, item) => sum + item.prepTimeMinutes, 0) / Math.max(1, flatItems.length)
  );
  const readyForHandoff = Math.max(1, Math.round(ordersInFlight / 3));
  const estimatedMissedRevenue = soldOutItems.reduce((sum, item) => sum + item.price * 8, 0);

  const topItems = flatItems
    .filter((item) => item.status !== "draft")
    .slice(0, 3)
    .map((item, index) => ({
      ...item,
      sales: 36 - index * 7 + liveItems.length * 2,
      revenue: 640 - index * 88 + item.price * 28,
      delta: performanceOffsets[index] ?? "+6%"
    }));

  const serviceTickets: ServiceTicket[] = [
    {
      id: "ORD-4812",
      guest: "Maya H.",
      channel: "Delivery",
      items: [liveItems[0]?.name ?? "Mixed grill platter", liveItems[1]?.name ?? "Crispy potatoes"],
      promisedAt: "6:18 PM",
      total: (liveItems[0]?.price ?? 18) + (liveItems[1]?.price ?? 8),
      status: "preparing",
      note: "Extra garlic sauce on the side."
    },
    {
      id: "ORD-4815",
      guest: "Karim B.",
      channel: "Pickup",
      items: [liveItems[2]?.name ?? "Chicken shawarma wrap", liveItems[3]?.name ?? "Mint lemonade"],
      promisedAt: "6:24 PM",
      total: (liveItems[2]?.price ?? 13) + (liveItems[3]?.price ?? 5),
      status: "ready",
      note: "Guest is five minutes away."
    },
    {
      id: "ORD-4819",
      guest: "Lina S.",
      channel: "Delivery",
      items: [liveItems[4]?.name ?? "Family mezze box", liveItems[0]?.name ?? "House flatbread"],
      promisedAt: "6:31 PM",
      total: (liveItems[4]?.price ?? 24) + (liveItems[0]?.price ?? 18),
      status: "new",
      note: "Courier requested sealed drinks."
    },
    {
      id: "ORD-4821",
      guest: "Tarek A.",
      channel: "Pickup",
      items: [liveItems[1]?.name ?? "Charred halloumi bowl"],
      promisedAt: "6:37 PM",
      total: (liveItems[1]?.price ?? 11) * 2,
      status: "pickup",
      note: "Keep hot at the pickup shelf."
    }
  ];

  const revenueSeries: RevenueDay[] = [
    { label: "Mon", revenue: Math.round(weeklyRevenue * 0.11), orders: 34 },
    { label: "Tue", revenue: Math.round(weeklyRevenue * 0.12), orders: 38 },
    { label: "Wed", revenue: Math.round(weeklyRevenue * 0.13), orders: 41 },
    { label: "Thu", revenue: Math.round(weeklyRevenue * 0.14), orders: 46 },
    { label: "Fri", revenue: Math.round(weeklyRevenue * 0.16), orders: 54 },
    { label: "Sat", revenue: Math.round(weeklyRevenue * 0.18), orders: 59 },
    { label: "Sun", revenue: Math.round(weeklyRevenue * 0.16), orders: 51 }
  ];

  const strongestRevenueDay = revenueSeries.reduce((best, day) =>
    day.revenue > best.revenue ? day : best
  );

  const ownerActionItems: OwnerActionItem[] = [
    {
      title: soldOutItems.length ? "Restock sold-out menu items" : "Inventory is stable",
      description: soldOutItems.length
        ? `${soldOutItems.length} live item${soldOutItems.length === 1 ? "" : "s"} are hidden from the app and are likely costing dinner conversions.`
        : "No sold-out dishes are blocking the live storefront right now.",
      cta: soldOutItems.length ? "Update menu availability before the evening rush." : "Keep an eye on the dinner rush.",
      priority: soldOutItems.length ? "urgent" : "good",
      icon: TriangleAlert
    },
    {
      title: draftItems.length ? "Finish unpublished dishes" : "Menu publishing is current",
      description: draftItems.length
        ? `${draftItems.length} draft item${draftItems.length === 1 ? "" : "s"} still need pricing, copy, or approval before going live.`
        : "Every dish created so far is already visible to customers.",
      cta: draftItems.length ? "Complete descriptions and push the strongest item live." : "Use the menu editor for seasonal changes instead.",
      priority: draftItems.length ? "watch" : "good",
      icon: ClipboardList
    },
    {
      title: photoCoverage < 90 ? "Improve photo coverage" : "Visual storefront looks strong",
      description:
        photoCoverage < 90
          ? `${100 - photoCoverage}% of the menu still falls back to house art. Real photography usually lifts first-order clicks.`
          : "Best sellers and hero assets already have enough real visuals to support discovery.",
      cta:
        photoCoverage < 90
          ? "Assign gallery photos to top movers first."
          : "Refresh the cover image before the weekend campaign.",
      priority: photoCoverage < 90 ? "watch" : "good",
      icon: Camera
    }
  ];

  const growthHighlights = [
    {
      label: "Average rating",
      value: ownerRestaurant.rating.toFixed(1),
      detail: `${ownerRestaurant.reviewCount} public reviews in the app.`,
      icon: Star
    },
    {
      label: "Repeat guests",
      value: `${repeatGuests}%`,
      detail: "Reorders are strongest between 7 PM and close.",
      icon: Users
    },
    {
      label: "Reply coverage",
      value: `${Math.min(96, 78 + gallery.length)}%`,
      detail: "Most new reviews have been answered within the same day.",
      icon: MessageSquare
    }
  ];

  const insightMetrics: InsightMetric[] = [
    {
      label: "Revenue today",
      value: formatCurrency(todayRevenue),
      footnote: `${ordersInFlight} orders are currently in motion across delivery and pickup.`,
      icon: CircleDollarSign
    },
    {
      label: "Weekly sales",
      value: formatCurrency(weeklyRevenue),
      footnote: `${ordersToday} orders expected today with dinner pacing ahead of last week.`,
      icon: TrendingUp
    },
    {
      label: "Orders in progress",
      value: String(ordersInFlight),
      footnote: `${readyForHandoff} order${readyForHandoff === 1 ? "" : "s"} should be ready to hand off in the next few minutes.`,
      icon: ChefHat
    },
    {
      label: "Payout pending",
      value: formatCurrency(payoutPending),
      footnote: `Average ticket is ${formatCurrency(averageOrderValue)} with ${photoCoverage}% of the menu visually covered.`,
      icon: Wallet
    }
  ];

  function markDirty() {
    setSaveState("idle");
  }

  function handleSaveChanges() {
    setSaveState("saving");

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      setLastSavedAt(new Date().toISOString());
      setSaveState("saved");
    }, 500);
  }

  function updateSection(sectionId: string, patch: Partial<Pick<OwnerMenuSection, "title" | "description">>) {
    markDirty();
    setMenuSections((current) =>
      current.map((section) => (section.id === sectionId ? { ...section, ...patch } : section))
    );
  }

  function updateItem(
    sectionId: string,
    itemId: string,
    updater: (item: OwnerMenuItem) => OwnerMenuItem
  ) {
    markDirty();
    setMenuSections((current) =>
      current.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              items: section.items.map((item) => (item.id === itemId ? updater(item) : item))
            }
          : section
      )
    );
  }

  function addMenuItem(sectionId: string) {
    markDirty();
    setMenuSections((current) =>
      current.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              items: [
                ...section.items,
                {
                  id: `item-${Date.now()}`,
                  restaurantId: ownerRestaurant.id,
                  sectionId,
                  name: "New menu item",
                  description: "Add ingredients, portion notes, and what makes this item worth ordering.",
                  price: 0,
                  tags: ["New"],
                  popular: false,
                  imageTheme: ownerRestaurant.imageTheme,
                  status: "draft",
                  prepTimeMinutes: 12
                }
              ]
            }
          : section
      )
    );
  }

  function addSection() {
    markDirty();
    setMenuSections((current) => [
      ...current,
      {
        id: `section-${Date.now()}`,
        title: "New section",
        description: "Describe the section before pushing it live.",
        items: []
      }
    ]);
  }

  function addPhotoAsset(nextPhoto: RestaurantPhotoAsset) {
    markDirty();
    setGallery((current) => [nextPhoto, ...current]);
  }

  function handleAddPhotoByUrl() {
    if (!photoUrl.trim()) {
      return;
    }

    addPhotoAsset({
      id: `photo-upload-${Date.now()}`,
      title: photoTitle.trim() || "New gallery photo",
      caption: photoCaption.trim() || "Fresh upload for the app storefront.",
      url: photoUrl.trim(),
      theme: photoTheme,
      category: photoCategory,
      addedAt: new Date().toISOString()
    });
    setPhotoTitle("");
    setPhotoCaption("");
    setPhotoUrl("");
  }

  function handleFileUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);

    if (!files.length) {
      return;
    }

    files.forEach((file, index) => {
      addPhotoAsset({
        id: `photo-file-${Date.now()}-${index}`,
        title: file.name.replace(/\.[^/.]+$/, ""),
        caption: "Uploaded from the local device for a storefront preview.",
        url: URL.createObjectURL(file),
        theme: photoTheme,
        category: photoCategory,
        addedAt: new Date().toISOString()
      });
    });

    event.target.value = "";
  }

  function removePhoto(photoId: string) {
    markDirty();
    setGallery((current) => current.filter((photo) => photo.id !== photoId));
    setMenuSections((current) =>
      current.map((section) => ({
        ...section,
        items: section.items.map((item) =>
          item.photoId === photoId ? { ...item, photoId: undefined } : item
        )
      }))
    );
  }

  function setCoverPhoto(photoId: string) {
    markDirty();
    setGallery((current) =>
      current.map((photo) => ({
        ...photo,
        category:
          photo.id === photoId ? "cover" : photo.category === "cover" ? "dish" : photo.category
      }))
    );
  }

  if (!hydrated) {
    return (
      <div className="container grid gap-5 py-8 sm:py-10">
        <SkeletonCard className="h-[280px]" />
        <SkeletonCard className="h-[520px]" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container py-10">
        <EmptyState
          title="Sign in as a restaurant owner"
          description="The owner workspace is where you keep the live menu, photo gallery, and business performance in sync."
          action={
            <Button asChild>
              <Link href="/auth/restaurant/sign-in">Sign in</Link>
            </Button>
          }
        />
      </div>
    );
  }

  if (user.role !== "owner") {
    return (
      <div className="container py-10">
        <EmptyState
          title="Restaurant owner access required"
          description="This studio is reserved for owner accounts. Customer, driver, and admin roles keep their own workspaces."
          action={
            <Button asChild variant="outline">
              <Link href={resolveWorkspaceHref(user.role)}>Open your workspace</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="container space-y-8 py-8 sm:py-10">
      <section className="section-shell overflow-hidden p-6 sm:p-8">
        <div className="relative z-10 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-6">
            <Badge className="w-fit gap-2">
              <Store className="h-3.5 w-3.5" />
              Restaurant owner workspace
            </Badge>
            <div className="space-y-4">
              <h1 className="balance-text max-w-4xl font-display text-5xl text-foreground sm:text-6xl">
                Control your storefront, menu, and live service from one restaurant dashboard.
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                Update dishes, watch prep flow, manage visuals, and track revenue without leaving the owner panel.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="stat-pill min-w-[150px]">
                <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  Revenue today
                </p>
                <p className="mt-2 text-lg font-semibold text-foreground">
                  {formatCurrency(todayRevenue)}
                </p>
              </div>
              <div className="stat-pill min-w-[150px]">
                <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  Orders live
                </p>
                <p className="mt-2 text-lg font-semibold text-foreground">
                  {ordersInFlight}
                </p>
              </div>
              <div className="stat-pill min-w-[150px]">
                <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  Average ticket
                </p>
                <p className="mt-2 text-lg font-semibold text-foreground">
                  {formatCurrency(averageOrderValue)}
                </p>
              </div>
              <div className="stat-pill min-w-[150px]">
                <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  Last saved
                </p>
                <p className="mt-2 text-lg font-semibold text-foreground">
                  {formatOrderTime(lastSavedAt)}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button onClick={handleSaveChanges}>
                {saveState === "saving" ? "Saving..." : saveState === "saved" ? "Saved" : "Save changes"}
                <Sparkles className="h-4 w-4" />
              </Button>
              <Button asChild variant="outline">
                <Link href={`/restaurants/${ownerRestaurant.id}`}>
                  Preview storefront
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                <ImagePlus className="h-4 w-4" />
                Upload photos
              </Button>
              <Button variant="outline" onClick={addSection}>
                <Plus className="h-4 w-4" />
                Add section
              </Button>
            </div>
          </div>

          <div className="grid gap-4">
            <PhotoSurface
              photo={coverPhoto}
              fallbackTitle={restaurantName}
              fallbackSubtitle={heroTagline}
              fallbackTheme={ownerRestaurant.imageTheme}
              className="min-h-[320px] p-6"
              badgeLabel={isOpenForOrders ? `${ordersInFlight} live orders` : "Paused in app"}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="frost-panel p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Service mode
                  </p>
                  <BellRing className="h-4 w-4 text-primary" />
                </div>
                <p className="mt-2 text-2xl font-semibold text-foreground">
                  {isOpenForOrders ? "Open for orders" : "Orders paused"}
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Pickup is {pickupEnabled ? "visible" : "hidden"} and average prep is {averagePrepTime} minutes.
                </p>
              </div>
              <div className="frost-panel p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Next payout
                  </p>
                  <Wallet className="h-4 w-4 text-primary" />
                </div>
                <p className="mt-2 text-2xl font-semibold text-foreground">
                  {formatCurrency(payoutPending)}
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Estimated arrival {formatOrderTime("2026-04-23T12:00:00Z")} based on current settlement timing.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Tabs defaultValue="overview" className="space-y-0">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="menu">Menu editor</TabsTrigger>
          <TabsTrigger value="photos">Photo manager</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {insightMetrics.map((metric) => (
              <InsightCard key={metric.label} {...metric} />
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <Card className="overflow-hidden bg-white/88">
              <CardHeader className="border-b border-border/70 bg-surface/35">
                <CardTitle>Live service board</CardTitle>
                <CardDescription>
                  Track the active kitchen queue, handoff timing, and pickup readiness from one place.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="frost-panel p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        Orders in progress
                      </p>
                      <ChefHat className="h-4 w-4 text-primary" />
                    </div>
                    <p className="mt-2 text-2xl font-semibold text-foreground">{ordersInFlight}</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Across delivery and pickup workflows right now.
                    </p>
                  </div>
                  <div className="frost-panel p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        Ready soon
                      </p>
                      <Clock3 className="h-4 w-4 text-primary" />
                    </div>
                    <p className="mt-2 text-2xl font-semibold text-foreground">{readyForHandoff}</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Orders expected to hand off in the next few minutes.
                    </p>
                  </div>
                  <div className="frost-panel p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        Average prep
                      </p>
                      <BellRing className="h-4 w-4 text-primary" />
                    </div>
                    <p className="mt-2 text-2xl font-semibold text-foreground">{averagePrepTime} min</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Based on the current live catalog and queue mix.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {serviceTickets.map((ticket) => (
                    <div key={ticket.id} className="frost-panel space-y-3 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-foreground">{ticket.id}</p>
                            <Badge variant="outline">{ticket.channel}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{ticket.guest}</p>
                        </div>
                        <div className="flex flex-col items-start gap-2 text-left sm:items-end sm:text-right">
                          <Badge variant={serviceTicketVariant(ticket.status)}>
                            {formatStatusLabel(ticket.status)}
                          </Badge>
                          <p className="text-sm font-semibold text-foreground">{ticket.promisedAt}</p>
                        </div>
                      </div>
                      <p className="text-sm leading-6 text-muted-foreground">
                        {ticket.items.join(" • ")}
                      </p>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm text-muted-foreground">{ticket.note}</p>
                        <p className="font-semibold text-foreground">{formatCurrency(ticket.total)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-6">
              <Card className="overflow-hidden bg-white/88">
                <CardHeader className="border-b border-border/70 bg-surface/35">
                  <CardTitle>Revenue pulse</CardTitle>
                  <CardDescription>
                    A week view of net sales pacing, average ticket size, and expected payout flow.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="frost-panel p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                          Net sales today
                        </p>
                        <CircleDollarSign className="h-4 w-4 text-primary" />
                      </div>
                      <p className="mt-2 text-3xl font-semibold text-foreground">
                        {formatCurrency(todayRevenue)}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        Current average ticket is {formatCurrency(averageOrderValue)}.
                      </p>
                    </div>
                    <div className="frost-panel p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                          Pending payout
                        </p>
                        <Wallet className="h-4 w-4 text-primary" />
                      </div>
                      <p className="mt-2 text-3xl font-semibold text-foreground">
                        {formatCurrency(payoutPending)}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        Expected on {formatOrderTime("2026-04-23T12:00:00Z")} if settlement timing holds.
                      </p>
                    </div>
                  </div>

                  <div className="grid h-[220px] grid-cols-7 items-end gap-3">
                    {revenueSeries.map((day) => (
                      <div key={day.label} className="flex flex-col items-center gap-3">
                        <div className="flex h-[180px] w-full items-end rounded-[24px] bg-secondary/60 p-2">
                          <div
                            className="w-full rounded-[18px] bg-gradient-to-t from-success via-accent to-highlight"
                            style={{ height: `${Math.max(26, Math.round((day.revenue / strongestRevenueDay.revenue) * 100))}%` }}
                          />
                        </div>
                        <div className="text-center">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                            {day.label}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">{day.orders} orders</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="frost-panel flex items-start gap-3 p-4">
                    <Receipt className="mt-0.5 h-4 w-4 text-primary" />
                    <p className="text-sm leading-6 text-muted-foreground">
                      {strongestRevenueDay.label} is pacing highest this week, with dinner bundles and
                      featured items driving the strongest average ticket.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="overflow-hidden bg-white/88">
                <CardHeader className="border-b border-border/70 bg-surface/35">
                  <CardTitle>Owner action board</CardTitle>
                  <CardDescription>
                    The highest-value fixes before the next service window starts.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-6">
                  {ownerActionItems.map((item) => {
                    const Icon = item.icon;

                    return (
                      <div key={item.title} className="frost-panel p-4">
                        <div className="flex items-start gap-3">
                          <div className="rounded-2xl bg-primary/12 p-3 text-primary">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-foreground">{item.title}</p>
                              <Badge variant={ownerActionVariant(item.priority)}>
                                {formatStatusLabel(item.priority)}
                              </Badge>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                              {item.description}
                            </p>
                            <p className="mt-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                              {item.cta}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <div className="frost-panel flex items-start gap-3 p-4">
                    <TriangleAlert className="mt-0.5 h-4 w-4 text-primary" />
                    <p className="text-sm leading-6 text-muted-foreground">
                      Estimated missed revenue from sold-out items this week:{" "}
                      <span className="font-semibold text-foreground">
                        {formatCurrency(estimatedMissedRevenue)}
                      </span>
                      .
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="overflow-hidden bg-white/88">
                <CardHeader className="border-b border-border/70 bg-surface/35">
                  <CardTitle>Growth levers</CardTitle>
                  <CardDescription>
                    Signals that help decide whether to push offers, respond to reviews, or feature more dishes.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 pt-6 sm:grid-cols-3">
                  {growthHighlights.map((item) => {
                    const Icon = item.icon;

                    return (
                      <div key={item.label} className="frost-panel p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                            {item.label}
                          </p>
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <p className="mt-2 text-2xl font-semibold text-foreground">{item.value}</p>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.detail}</p>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <Card className="overflow-hidden bg-white/86">
              <CardHeader className="border-b border-border/70 bg-surface/35">
                <CardTitle>Storefront profile</CardTitle>
                <CardDescription>
                  These fields shape the headline block guests see before they open your menu.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="space-y-2">
                  <FieldLabel>Restaurant name</FieldLabel>
                  <Input
                    value={restaurantName}
                    onChange={(event) => {
                      markDirty();
                      setRestaurantName(event.target.value);
                    }}
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <FieldLabel>Hero line</FieldLabel>
                  <Input
                    value={heroTagline}
                    onChange={(event) => {
                      markDirty();
                      setHeroTagline(event.target.value);
                    }}
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <FieldLabel>Short description</FieldLabel>
                  <Textarea
                    value={shortDescription}
                    onChange={(event) => {
                      markDirty();
                      setShortDescription(event.target.value);
                    }}
                    className="min-h-[150px]"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    className={cn(
                      "frost-panel flex items-start justify-between gap-3 p-4 text-left transition",
                      isOpenForOrders ? "ring-2 ring-primary/25" : ""
                    )}
                    onClick={() => {
                      markDirty();
                      setIsOpenForOrders((current) => !current);
                    }}
                  >
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        Order intake
                      </p>
                      <p className="mt-2 text-lg font-semibold text-foreground">
                        {isOpenForOrders ? "Open for orders" : "Pause incoming orders"}
                      </p>
                    </div>
                    <Badge variant={isOpenForOrders ? "success" : "outline"}>
                      {isOpenForOrders ? "Live" : "Paused"}
                    </Badge>
                  </button>
                  <button
                    type="button"
                    className={cn(
                      "frost-panel flex items-start justify-between gap-3 p-4 text-left transition",
                      pickupEnabled ? "ring-2 ring-primary/25" : ""
                    )}
                    onClick={() => {
                      markDirty();
                      setPickupEnabled((current) => !current);
                    }}
                  >
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        Pickup mode
                      </p>
                      <p className="mt-2 text-lg font-semibold text-foreground">
                        {pickupEnabled ? "Pickup enabled" : "Pickup hidden"}
                      </p>
                    </div>
                    <Badge variant={pickupEnabled ? "success" : "outline"}>
                      {pickupEnabled ? "On" : "Off"}
                    </Badge>
                  </button>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-6">
              <Card className="overflow-hidden bg-white/86">
                <CardHeader className="border-b border-border/70 bg-surface/35">
                  <CardTitle>Peak ordering hours</CardTitle>
                  <CardDescription>
                    Dinner still leads, with lunch strongest when visuals are fresh and live items stay in stock.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid h-[220px] grid-cols-5 items-end gap-3">
                    {busyHours.map((hour) => (
                      <div key={hour.label} className="flex flex-col items-center gap-3">
                        <div className="flex h-[180px] w-full items-end rounded-[24px] bg-secondary/60 p-2">
                          <div
                            className="w-full rounded-[18px] bg-gradient-to-t from-primary via-orange-400 to-highlight"
                            style={{ height: `${hour.value}%` }}
                          />
                        </div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          {hour.label}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-6 lg:grid-cols-2">
                <Card className="overflow-hidden bg-white/86">
                  <CardHeader className="border-b border-border/70 bg-surface/35">
                    <CardTitle>Top movers</CardTitle>
                    <CardDescription>
                      Items currently doing the work for revenue and reorder lift.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-6">
                    {topItems.map((item) => (
                      <div key={item.id} className="frost-panel flex items-start justify-between gap-3 p-4">
                        <div>
                          <p className="font-semibold text-foreground">{item.name}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {item.sales} orders • {formatCurrency(item.revenue)}
                          </p>
                        </div>
                        <Badge variant="success">{item.delta}</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="overflow-hidden bg-white/86">
                  <CardHeader className="border-b border-border/70 bg-surface/35">
                    <CardTitle>Guest pulse</CardTitle>
                    <CardDescription>
                      Recent review themes, useful for deciding which dishes deserve more visibility.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-6">
                    {ownerRestaurant.reviews.map((review) => (
                      <div key={review.id} className="frost-panel p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold text-foreground">{review.title}</p>
                          <Badge variant="outline">
                            <Star className="mr-1 h-3.5 w-3.5" />
                            {review.rating}
                          </Badge>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">{review.body}</p>
                        <p className="mt-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                          {review.author} • {formatOrderTime(review.date)}
                        </p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="menu" className="space-y-6">
          <section className="section-shell p-6">
            <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-2">
                <Badge variant="outline" className="w-fit gap-2">
                  <Layers3 className="h-3.5 w-3.5" />
                  Menu composer
                </Badge>
                <h2 className="font-display text-4xl text-foreground">Edit sections and items without leaving the app.</h2>
                <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                  Keep descriptions tight, prices current, and visuals assigned so guests see a complete storefront.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <span className="stat-pill">{flatItems.length} total items</span>
                <span className="stat-pill">{liveItems.length} live now</span>
                <span className="stat-pill">{soldOutItems.length} sold out</span>
              </div>
            </div>
          </section>

          <div className="grid gap-6 2xl:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-6">
              {menuSections.map((section) => (
                <Card key={section.id} className="overflow-hidden bg-white/88">
                  <CardHeader className="border-b border-border/70 bg-surface/35">
                    <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr_auto] lg:items-start">
                      <div className="space-y-2">
                        <FieldLabel>Section title</FieldLabel>
                        <Input
                          value={section.title}
                          onChange={(event) => updateSection(section.id, { title: event.target.value })}
                          className="h-12"
                        />
                      </div>
                      <div className="space-y-2">
                        <FieldLabel>Section description</FieldLabel>
                        <Input
                          value={section.description}
                          onChange={(event) =>
                            updateSection(section.id, { description: event.target.value })
                          }
                          className="h-12"
                        />
                      </div>
                      <Button variant="outline" onClick={() => addMenuItem(section.id)}>
                        <Plus className="h-4 w-4" />
                        Add item
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-6">
                    {section.items.length ? (
                      section.items.map((item) => {
                        const assignedPhoto = gallery.find((photo) => photo.id === item.photoId);

                        return (
                          <div key={item.id} className="frost-panel grid gap-4 p-4 xl:grid-cols-[220px_1fr]">
                            <PhotoSurface
                              photo={assignedPhoto}
                              fallbackTitle={item.name}
                              fallbackSubtitle={item.description}
                              fallbackTheme={item.imageTheme ?? ownerRestaurant.imageTheme}
                              className="min-h-[220px] p-4"
                              badgeLabel={assignedPhoto ? formatStatusLabel(assignedPhoto.category) : "Preview"}
                            />

                            <div className="space-y-4">
                              <div className="grid gap-4 lg:grid-cols-[1fr_150px_160px]">
                                <div className="space-y-2">
                                  <FieldLabel>Item name</FieldLabel>
                                  <Input
                                    value={item.name}
                                    onChange={(event) =>
                                      updateItem(section.id, item.id, (current) => ({
                                        ...current,
                                        name: event.target.value
                                      }))
                                    }
                                    className="h-12"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <FieldLabel>Price</FieldLabel>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.5"
                                    value={item.price}
                                    onChange={(event) =>
                                      updateItem(section.id, item.id, (current) => ({
                                        ...current,
                                        price: Number(event.target.value || 0)
                                      }))
                                    }
                                    className="h-12"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <FieldLabel>Status</FieldLabel>
                                  <select
                                    value={item.status}
                                    onChange={(event) =>
                                      updateItem(section.id, item.id, (current) => ({
                                        ...current,
                                        status: event.target.value as OwnerItemStatus
                                      }))
                                    }
                                    className={selectFieldClassName}
                                  >
                                    <option value="live">Live</option>
                                    <option value="draft">Draft</option>
                                    <option value="sold_out">Sold out</option>
                                  </select>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <FieldLabel>Description</FieldLabel>
                                <Textarea
                                  value={item.description}
                                  onChange={(event) =>
                                    updateItem(section.id, item.id, (current) => ({
                                      ...current,
                                      description: event.target.value
                                    }))
                                  }
                                  className="min-h-[120px]"
                                />
                              </div>

                              <div className="grid gap-4 lg:grid-cols-3">
                                <div className="space-y-2">
                                  <FieldLabel>Tags</FieldLabel>
                                  <Input
                                    value={item.tags.join(", ")}
                                    onChange={(event) =>
                                      updateItem(section.id, item.id, (current) => ({
                                        ...current,
                                        tags: event.target.value
                                          .split(",")
                                          .map((entry) => entry.trim())
                                          .filter(Boolean)
                                      }))
                                    }
                                    className="h-12"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <FieldLabel>Prep time (min)</FieldLabel>
                                  <Input
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={item.prepTimeMinutes}
                                    onChange={(event) =>
                                      updateItem(section.id, item.id, (current) => ({
                                        ...current,
                                        prepTimeMinutes: Number(event.target.value || 1)
                                      }))
                                    }
                                    className="h-12"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <FieldLabel>Assigned photo</FieldLabel>
                                  <select
                                    value={item.photoId ?? ""}
                                    onChange={(event) =>
                                      updateItem(section.id, item.id, (current) => ({
                                        ...current,
                                        photoId: event.target.value || undefined
                                      }))
                                    }
                                    className={selectFieldClassName}
                                  >
                                    <option value="">Use house art</option>
                                    {gallery.map((photo) => (
                                      <option key={photo.id} value={photo.id}>
                                        {photo.title}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-3">
                                <Badge variant={itemStatusVariant(item.status)}>
                                  {formatStatusLabel(item.status)}
                                </Badge>
                                <Button
                                  variant={item.popular ? "default" : "outline"}
                                  size="sm"
                                  onClick={() =>
                                    updateItem(section.id, item.id, (current) => ({
                                      ...current,
                                      popular: !current.popular
                                    }))
                                  }
                                >
                                  <TrendingUp className="h-4 w-4" />
                                  {item.popular ? "Featured in app" : "Feature this item"}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    markDirty();
                                    setMenuSections((current) =>
                                      current.map((currentSection) =>
                                        currentSection.id === section.id
                                          ? {
                                              ...currentSection,
                                              items: currentSection.items.filter(
                                                (entry) => entry.id !== item.id
                                              )
                                            }
                                          : currentSection
                                      )
                                    );
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Remove
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <EmptyState
                        title="No items yet"
                        description="Add dishes, drinks, or bundles to make this section visible in the app."
                        action={
                          <Button onClick={() => addMenuItem(section.id)}>
                            <Plus className="h-4 w-4" />
                            Add first item
                          </Button>
                        }
                      />
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="space-y-6">
              <Card className="overflow-hidden bg-white/86">
                <CardHeader className="border-b border-border/70 bg-surface/35">
                  <CardTitle>Menu readiness</CardTitle>
                  <CardDescription>
                    Quick signals for what still needs owner attention before pushing updates.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                  <div className="frost-panel p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      Average prep time
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">
                      {Math.round(
                        flatItems.reduce((sum, item) => sum + item.prepTimeMinutes, 0) /
                          Math.max(1, flatItems.length)
                      )}{" "}
                      min
                    </p>
                  </div>
                  <div className="frost-panel p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      Draft items
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">
                      {flatItems.filter((item) => item.status === "draft").length}
                    </p>
                  </div>
                  <div className="frost-panel p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      Featured dishes
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">
                      {flatItems.filter((item) => item.popular).length}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="overflow-hidden bg-white/86">
                <CardHeader className="border-b border-border/70 bg-surface/35">
                  <CardTitle>Live storefront preview</CardTitle>
                  <CardDescription>
                    A compact read on what customers are about to browse in the app.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                  <PhotoSurface
                    photo={coverPhoto}
                    fallbackTitle={restaurantName}
                    fallbackSubtitle={shortDescription}
                    fallbackTheme={ownerRestaurant.imageTheme}
                    className="min-h-[240px] p-5"
                    badgeLabel="Storefront hero"
                  />
                  <div className="space-y-3">
                    {menuSections.map((section) => (
                      <div key={section.id} className="frost-panel p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-foreground">{section.title}</p>
                            <p className="mt-1 text-sm text-muted-foreground">{section.description}</p>
                          </div>
                          <Badge variant="outline">{section.items.length} items</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="photos" className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[0.88fr_1.12fr]">
            <Card className="overflow-hidden bg-white/88">
              <CardHeader className="border-b border-border/70 bg-surface/35">
                <CardTitle>Photo manager</CardTitle>
                <CardDescription>
                  Add menu photography, swap the hero image, and keep visuals current with what the kitchen is selling.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="space-y-2">
                  <FieldLabel>Photo title</FieldLabel>
                  <Input
                    value={photoTitle}
                    onChange={(event) => setPhotoTitle(event.target.value)}
                    className="h-12"
                    placeholder="Charcoal grill spread"
                  />
                </div>
                <div className="space-y-2">
                  <FieldLabel>Caption</FieldLabel>
                  <Textarea
                    value={photoCaption}
                    onChange={(event) => setPhotoCaption(event.target.value)}
                    className="min-h-[120px]"
                    placeholder="What should customers understand when they see this photo?"
                  />
                </div>
                <div className="space-y-2">
                  <FieldLabel>Image URL</FieldLabel>
                  <Input
                    value={photoUrl}
                    onChange={(event) => setPhotoUrl(event.target.value)}
                    className="h-12"
                    placeholder="https://..."
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <FieldLabel>Category</FieldLabel>
                    <select
                      value={photoCategory}
                      onChange={(event) => setPhotoCategory(event.target.value as PhotoCategory)}
                      className={selectFieldClassName}
                    >
                      <option value="dish">Dish photo</option>
                      <option value="cover">Storefront cover</option>
                      <option value="ambience">Ambience shot</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <FieldLabel>Fallback art theme</FieldLabel>
                    <select
                      value={photoTheme}
                      onChange={(event) => setPhotoTheme(event.target.value as ImageTheme)}
                      className={selectFieldClassName}
                    >
                      <option value="saffron">Saffron</option>
                      <option value="ember">Ember</option>
                      <option value="mint">Mint</option>
                      <option value="coast">Coast</option>
                      <option value="berry">Berry</option>
                      <option value="night">Night</option>
                    </select>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button onClick={handleAddPhotoByUrl} disabled={!photoUrl.trim()}>
                    <Plus className="h-4 w-4" />
                    Add from URL
                  </Button>
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                    <ImagePlus className="h-4 w-4" />
                    Upload from device
                  </Button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <div className="frost-panel flex items-start gap-3 p-4 text-sm text-muted-foreground">
                  <ChartColumn className="mt-0.5 h-4 w-4 text-primary" />
                  <p>
                    Photos with strong lighting and close framing usually lift click-through on menu items more than generic dining-room shots.
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="overflow-hidden bg-white/88">
                <CardHeader className="border-b border-border/70 bg-surface/35">
                  <CardTitle>Gallery</CardTitle>
                  <CardDescription>
                    Assign a cover image, keep dish shots discoverable, and remove visuals that no longer match the live menu.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 pt-6 md:grid-cols-2">
                  {gallery.map((photo) => (
                    <Card key={photo.id} className="overflow-hidden bg-white/88">
                      <PhotoSurface
                        photo={photo}
                        fallbackTitle={photo.title}
                        fallbackSubtitle={photo.caption}
                        fallbackTheme={photo.theme}
                        className="min-h-[220px] p-4"
                        badgeLabel={formatStatusLabel(photo.category)}
                      />
                      <CardContent className="space-y-3 pt-4">
                        <div>
                          <p className="font-semibold text-foreground">{photo.title}</p>
                          <p className="mt-1 text-sm leading-6 text-muted-foreground">{photo.caption}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={photo.category === "cover" ? "success" : "outline"}>
                            {formatStatusLabel(photo.category)}
                          </Badge>
                          <Badge variant="secondary">{formatOrderTime(photo.addedAt)}</Badge>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant={photo.category === "cover" ? "secondary" : "outline"}
                            onClick={() => setCoverPhoto(photo.id)}
                          >
                            {photo.category === "cover" ? "Current cover" : "Set as cover"}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => removePhoto(photo.id)}>
                            <Trash2 className="h-4 w-4" />
                            Remove
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </CardContent>
              </Card>

              <Card className="overflow-hidden bg-white/88">
                <CardHeader className="border-b border-border/70 bg-surface/35">
                  <CardTitle>Visual coverage</CardTitle>
                  <CardDescription>
                    Pairing photos with best sellers keeps the catalog from feeling thin or unfinished.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-6">
                  {flatItems.slice(0, 5).map((item) => {
                    const hasAssignedPhoto = gallery.some((photo) => photo.id === item.photoId);

                    return (
                      <div key={item.id} className="frost-panel flex items-start justify-between gap-3 p-4">
                        <div>
                          <p className="font-semibold text-foreground">{item.name}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{item.sectionTitle}</p>
                        </div>
                        <Badge variant={hasAssignedPhoto ? "success" : "outline"}>
                          {hasAssignedPhoto ? "Photo assigned" : "Needs image"}
                        </Badge>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
