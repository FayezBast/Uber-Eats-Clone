import {
  type Address,
  type CategoryChip,
  type Order,
  type PromoBanner,
  type Restaurant,
  type User
} from "@/types";

const sharedSauces = [
  { id: "sauce-tahini", name: "Tahini drizzle", priceDelta: 0 },
  { id: "sauce-chili", name: "Smoked chili oil", priceDelta: 1.5 },
  { id: "sauce-herb", name: "Green herb dressing", priceDelta: 1 }
];

export const addresses: Address[] = [
  {
    id: "address-home",
    label: "Home",
    line1: "214 Cedar Row",
    city: "Brooklyn, NY",
    instructions: "Buzz 4B, leave at door",
    latitude: 40.6795,
    longitude: -73.9681
  },
  {
    id: "address-studio",
    label: "Studio",
    line1: "88 Grand Street",
    city: "Brooklyn, NY",
    instructions: "Front desk drop-off"
  }
];

export const currentUser: User = {
  id: "user-01",
  fullName: "Lina Morrell",
  email: "lina@example.com",
  phone: "+1 555-210-9987",
  favoriteCuisine: ["Mediterranean", "Japanese", "Pizza"],
  defaultAddressId: "address-home",
  role: "customer"
};

export const categoryChips: CategoryChip[] = [
  {
    id: "fresh",
    name: "Fresh bowls",
    description: "Bright greens, grains, and protein-packed lunches"
  },
  {
    id: "wood-fired",
    name: "Wood-fired",
    description: "Charred edges, slow dough, and warm ovens"
  },
  {
    id: "comfort",
    name: "Comfort classics",
    description: "Saucy plates built for late evenings"
  },
  {
    id: "desserts",
    name: "Dessert run",
    description: "Shortlist of pastries, gelato, and cookies"
  },
  {
    id: "wellness",
    name: "Wellness picks",
    description: "Lighter, balanced meals with clean ingredients"
  }
];

export const promoBanners: PromoBanner[] = [
  {
    id: "promo-01",
    eyebrow: "Weeknight upgrade",
    title: "Save $8 on your first curated dinner bundle.",
    subtitle: "A premium pick for two with dessert included.",
    ctaLabel: "See bundles",
    imageTheme: "saffron"
  },
  {
    id: "promo-02",
    eyebrow: "Pickup spotlight",
    title: "Skip the fee on pickup orders before 7 PM.",
    subtitle: "Perfect for quick handoff on the way home.",
    ctaLabel: "Browse pickup",
    imageTheme: "mint"
  }
];

export const restaurants: Restaurant[] = [
  {
    id: "rest-saffron-lane",
    slug: "saffron-lane-kitchen",
    name: "Saffron Lane Kitchen",
    shortDescription: "Modern Levantine plates with charcoal-grilled proteins.",
    longDescription:
      "Layered spices, warm flatbreads, bright salads, and family-style plates built for sharing.",
    cuisines: ["Mediterranean", "Levantine"],
    rating: 4.8,
    reviewCount: 1240,
    etaMin: 18,
    etaMax: 26,
    deliveryFee: 2.99,
    minimumOrder: 15,
    priceLevel: "$$",
    tags: ["Top rated", "Popular mezze", "Good for groups"],
    heroTagline: "Fire-kissed skewers, bright herbs, soft pita.",
    imageTheme: "saffron",
    address: "122 Atlantic Ave, Brooklyn",
    distanceMiles: 1.3,
    isFeatured: true,
    supportsPickup: true,
    coordinates: { lat: 40.6902, lng: -73.9958 },
    openingHours: ["Mon-Thu 11:00 AM - 10:00 PM", "Fri-Sun 11:00 AM - 11:30 PM"],
    infoBullets: [
      "Hand-cut vegetables delivered daily",
      "Halal-friendly menu with vegetarian range",
      "Popular for dinner and group orders"
    ],
    menuSections: [
      {
        id: "section-mezze",
        title: "Signature mezze",
        description: "Cold and warm starters with house-baked pita.",
        items: [
          {
            id: "item-whipped-feta",
            restaurantId: "rest-saffron-lane",
            sectionId: "section-mezze",
            name: "Whipped feta + roasted peppers",
            description: "Silky feta mousse, charred peppers, dill oil, seeded crispbread.",
            price: 11,
            tags: ["Vegetarian", "Best seller"],
            popular: true,
            calories: 340,
            imageTheme: "saffron",
            optionGroups: [
              {
                id: "group-bread",
                name: "Bread pairing",
                required: true,
                options: [
                  { id: "bread-pita", name: "Warm pita", priceDelta: 0 },
                  { id: "bread-cracker", name: "Sesame crackers", priceDelta: 1 }
                ]
              }
            ]
          },
          {
            id: "item-crispy-halloumi",
            restaurantId: "rest-saffron-lane",
            sectionId: "section-mezze",
            name: "Crispy halloumi bites",
            description: "Orange blossom honey, crushed pistachio, sumac salt.",
            price: 13,
            tags: ["Vegetarian"],
            calories: 410,
            imageTheme: "berry"
          }
        ]
      },
      {
        id: "section-grill",
        title: "From the charcoal grill",
        description: "Protein-forward plates with rice, herbs, and sauces.",
        items: [
          {
            id: "item-chicken-shawarma-plate",
            restaurantId: "rest-saffron-lane",
            sectionId: "section-grill",
            name: "Chicken shawarma plate",
            description: "Saffron rice, toum, pickled cucumber, burnt lemon.",
            price: 19.5,
            tags: ["High protein", "Most ordered"],
            popular: true,
            calories: 780,
            imageTheme: "saffron",
            optionGroups: [
              {
                id: "group-protein-size",
                name: "Portion",
                required: true,
                options: [
                  { id: "portion-regular", name: "Regular", priceDelta: 0 },
                  { id: "portion-large", name: "Large", priceDelta: 5.5 }
                ]
              },
              {
                id: "group-sauces",
                name: "Extra sauce",
                multiSelect: true,
                options: sharedSauces
              }
            ]
          },
          {
            id: "item-lamb-kofta",
            restaurantId: "rest-saffron-lane",
            sectionId: "section-grill",
            name: "Lamb kofta feast",
            description: "Cumin lamb skewers, cucumber yogurt, saffron pickled onions.",
            price: 23,
            tags: ["Spiced", "Chef's pick"],
            calories: 860,
            imageTheme: "ember",
            optionGroups: [
              {
                id: "group-side",
                name: "Choose a side",
                required: true,
                options: [
                  { id: "side-rice", name: "Saffron rice", priceDelta: 0 },
                  { id: "side-salad", name: "Herb salad", priceDelta: 0 },
                  { id: "side-fries", name: "Za'atar fries", priceDelta: 2 }
                ]
              }
            ]
          }
        ]
      },
      {
        id: "section-sweets",
        title: "Sweet finish",
        description: "Light desserts and house-made drinks.",
        items: [
          {
            id: "item-baklava-soft-serve",
            restaurantId: "rest-saffron-lane",
            sectionId: "section-sweets",
            name: "Baklava soft serve",
            description: "Tahini caramel, pistachio dust, crisp filo shards.",
            price: 8,
            tags: ["Dessert"],
            calories: 380,
            imageTheme: "coast"
          }
        ]
      }
    ],
    reviews: [
      {
        id: "review-01",
        author: "Amira",
        rating: 5,
        date: "2026-04-14T19:30:00Z",
        title: "Balanced and actually delivered hot",
        body: "The shawarma plate tasted fresh, and the pita stayed soft the whole ride over."
      },
      {
        id: "review-02",
        author: "Jon",
        rating: 4,
        date: "2026-04-10T18:20:00Z",
        title: "Great spreads",
        body: "Order the mezze and add one extra sauce. Worth it."
      }
    ]
  },
  {
    id: "rest-ember-dough",
    slug: "ember-and-dough",
    name: "Ember & Dough",
    shortDescription: "Wood-fired pies, charred vegetables, and slow-fermented crust.",
    longDescription:
      "A modern pizza counter with crisp salads, molten edges, and a low-intervention wine list.",
    cuisines: ["Pizza", "Italian"],
    rating: 4.7,
    reviewCount: 980,
    etaMin: 20,
    etaMax: 32,
    deliveryFee: 1.49,
    minimumOrder: 18,
    priceLevel: "$$",
    tags: ["Wood-fired", "Late night", "Fan favorite"],
    heroTagline: "Blistered crust, bright tomato, and quiet swagger.",
    imageTheme: "ember",
    address: "60 Wythe Ave, Brooklyn",
    distanceMiles: 2.1,
    isFeatured: true,
    supportsPickup: true,
    coordinates: { lat: 40.7191, lng: -73.9636 },
    openingHours: ["Daily 12:00 PM - 11:00 PM"],
    infoBullets: [
      "Long-fermented dough made every morning",
      "Vegetarian and gluten-aware swaps available",
      "Pickup window usually under 15 minutes"
    ],
    menuSections: [
      {
        id: "section-pizza",
        title: "Fire deck pizzas",
        description: "High-heat pies with premium toppings.",
        items: [
          {
            id: "item-hot-honey-soppressata",
            restaurantId: "rest-ember-dough",
            sectionId: "section-pizza",
            name: "Hot honey soppressata",
            description: "Tomato, mozzarella, fennel salami, fermented chili honey.",
            price: 22,
            tags: ["Best seller"],
            popular: true,
            calories: 1020,
            imageTheme: "ember",
            optionGroups: [
              {
                id: "group-crust",
                name: "Crust style",
                required: true,
                options: [
                  { id: "crust-classic", name: "Classic", priceDelta: 0 },
                  { id: "crust-thin", name: "Thin & crisp", priceDelta: 0 },
                  { id: "crust-gluten-friendly", name: "Gluten-friendly", priceDelta: 3 }
                ]
              }
            ]
          },
          {
            id: "item-burrata-garden",
            restaurantId: "rest-ember-dough",
            sectionId: "section-pizza",
            name: "Burrata garden pie",
            description: "Roasted zucchini, basil oil, confit tomato, torn burrata.",
            price: 24,
            tags: ["Vegetarian", "Fresh"],
            calories: 980,
            imageTheme: "mint"
          }
        ]
      },
      {
        id: "section-sides",
        title: "Sides + salads",
        description: "Crunch, greens, and oven-finished small plates.",
        items: [
          {
            id: "item-little-gem-caesar",
            restaurantId: "rest-ember-dough",
            sectionId: "section-sides",
            name: "Little gem caesar",
            description: "Parmesan breadcrumbs, confit garlic, lemon caesar.",
            price: 13,
            tags: ["Salad"],
            calories: 320,
            imageTheme: "mint"
          },
          {
            id: "item-oven-meatballs",
            restaurantId: "rest-ember-dough",
            sectionId: "section-sides",
            name: "Oven-finished meatballs",
            description: "Slow tomato sugo, ricotta cloud, basil.",
            price: 15,
            tags: ["Comfort"],
            calories: 520,
            imageTheme: "berry"
          }
        ]
      }
    ],
    reviews: [
      {
        id: "review-ember-01",
        author: "Hugo",
        rating: 5,
        date: "2026-04-12T20:15:00Z",
        title: "Still crisp after delivery",
        body: "The hot honey pie arrived with a proper crust and zero sogginess."
      }
    ]
  },
  {
    id: "rest-mint-press",
    slug: "mint-press-bowls",
    name: "Mint Press Bowls",
    shortDescription: "Bright grain bowls, grilled salmon, and green juices.",
    longDescription:
      "A clean, fresh menu built around seasonal vegetables and citrus-driven dressings.",
    cuisines: ["Healthy", "Bowls", "Seafood"],
    rating: 4.9,
    reviewCount: 760,
    etaMin: 16,
    etaMax: 24,
    deliveryFee: 3.49,
    minimumOrder: 14,
    priceLevel: "$$",
    tags: ["Healthy", "Fast prep", "Great lunch"],
    heroTagline: "Cool greens, warm grains, and citrus that lands.",
    imageTheme: "mint",
    address: "301 Pacific St, Brooklyn",
    distanceMiles: 0.8,
    isFeatured: true,
    supportsPickup: true,
    coordinates: { lat: 40.6869, lng: -73.9803 },
    openingHours: ["Daily 10:30 AM - 9:30 PM"],
    infoBullets: [
      "Protein-focused bowls under 30 minutes",
      "Juices pressed twice daily",
      "Popular with office lunch orders"
    ],
    menuSections: [
      {
        id: "section-bowls",
        title: "Main bowls",
        description: "Grain bowls with seasonal greens and premium proteins.",
        items: [
          {
            id: "item-miso-salmon-bowl",
            restaurantId: "rest-mint-press",
            sectionId: "section-bowls",
            name: "Miso salmon market bowl",
            description: "Brown rice, charred broccoli, avocado, cucumber ribbon, sesame crunch.",
            price: 21,
            tags: ["Omega-rich", "Popular"],
            popular: true,
            calories: 690,
            imageTheme: "coast",
            optionGroups: [
              {
                id: "group-base",
                name: "Base",
                required: true,
                options: [
                  { id: "base-brown-rice", name: "Brown rice", priceDelta: 0 },
                  { id: "base-greens", name: "Mixed greens", priceDelta: 0 },
                  { id: "base-half-half", name: "Half & half", priceDelta: 0 }
                ]
              },
              {
                id: "group-sauce",
                name: "Finish with",
                required: true,
                options: [
                  { id: "finish-miso", name: "Miso citrus", priceDelta: 0 },
                  { id: "finish-yuzu", name: "Yuzu herb", priceDelta: 0 }
                ]
              }
            ]
          },
          {
            id: "item-falafel-crunch",
            restaurantId: "rest-mint-press",
            sectionId: "section-bowls",
            name: "Falafel crunch bowl",
            description: "Quinoa, roasted cauliflower, pickled fennel, mint tahini.",
            price: 18,
            tags: ["Vegetarian", "Fiber-rich"],
            calories: 640,
            imageTheme: "mint"
          }
        ]
      },
      {
        id: "section-drinks",
        title: "Pressed drinks",
        description: "Fresh juices and no-sugar coolers.",
        items: [
          {
            id: "item-celery-lime-tonic",
            restaurantId: "rest-mint-press",
            sectionId: "section-drinks",
            name: "Celery lime tonic",
            description: "Celery, lime, cucumber, green apple, sea salt.",
            price: 7,
            tags: ["Cold pressed"],
            calories: 110,
            imageTheme: "mint"
          }
        ]
      }
    ],
    reviews: [
      {
        id: "review-mint-01",
        author: "Priya",
        rating: 5,
        date: "2026-04-08T13:05:00Z",
        title: "Reliable lunch rotation",
        body: "Clean flavors, not boring, and the salmon stays tender."
      }
    ]
  },
  {
    id: "rest-coastline-ramen",
    slug: "coastline-ramen",
    name: "Coastline Ramen",
    shortDescription: "Silky broth, crisp gyoza, and compact late-night bowls.",
    longDescription:
      "Japanese comfort food with clean broths, sharp aromatics, and fast-moving service.",
    cuisines: ["Japanese", "Noodles"],
    rating: 4.6,
    reviewCount: 690,
    etaMin: 24,
    etaMax: 36,
    deliveryFee: 2.49,
    minimumOrder: 16,
    priceLevel: "$$",
    tags: ["Late night", "Rich broth", "Gyoza"],
    heroTagline: "Steam, broth, and a proper midnight reset.",
    imageTheme: "night",
    address: "15 Kent Ave, Brooklyn",
    distanceMiles: 2.6,
    supportsPickup: false,
    coordinates: { lat: 40.7216, lng: -73.9585 },
    openingHours: ["Daily 5:00 PM - 1:00 AM"],
    infoBullets: [
      "Broths simmered daily in small batches",
      "Late-night menu available until close",
      "Best with add-on gyoza or soft egg"
    ],
    menuSections: [
      {
        id: "section-ramen",
        title: "Broth bowls",
        description: "Classic ramen with add-on finishes.",
        items: [
          {
            id: "item-black-garlic-tonkotsu",
            restaurantId: "rest-coastline-ramen",
            sectionId: "section-ramen",
            name: "Black garlic tonkotsu",
            description: "Creamy pork broth, spring noodles, ajitama, scallion.",
            price: 19,
            tags: ["Rich", "Best seller"],
            popular: true,
            calories: 840,
            imageTheme: "night",
            optionGroups: [
              {
                id: "group-addons",
                name: "Add-ons",
                multiSelect: true,
                options: [
                  { id: "addon-egg", name: "Extra soft egg", priceDelta: 2 },
                  { id: "addon-nori", name: "Nori sheets", priceDelta: 1 },
                  { id: "addon-pork", name: "Extra chashu", priceDelta: 4 }
                ]
              }
            ]
          }
        ]
      }
    ],
    reviews: [
      {
        id: "review-coast-01",
        author: "Mae",
        rating: 4,
        date: "2026-04-16T23:40:00Z",
        title: "Solid late-night comfort",
        body: "Broth is rich and the noodles held up surprisingly well."
      }
    ]
  },
  {
    id: "rest-berry-bakery",
    slug: "berryline-bakery",
    name: "Berryline Bakery",
    shortDescription: "Laminated pastries, cookies, and soft-serve affogato.",
    longDescription:
      "A polished all-day bakery serving flaky viennoiserie, cookies, and sweet afternoon picks.",
    cuisines: ["Bakery", "Desserts", "Coffee"],
    rating: 4.8,
    reviewCount: 430,
    etaMin: 14,
    etaMax: 22,
    deliveryFee: 0.99,
    minimumOrder: 10,
    priceLevel: "$",
    tags: ["Dessert run", "Coffee", "Fast ETA"],
    heroTagline: "Butter, sugar, and a reason to reopen the app.",
    imageTheme: "berry",
    address: "91 Nassau Ave, Brooklyn",
    distanceMiles: 1.1,
    supportsPickup: true,
    coordinates: { lat: 40.7246, lng: -73.9512 },
    openingHours: ["Daily 7:00 AM - 8:00 PM"],
    infoBullets: [
      "Small-batch laminated pastries",
      "Excellent afternoon snack stop",
      "Seasonal cookies rotate weekly"
    ],
    menuSections: [
      {
        id: "section-pastries",
        title: "Pastries + sweets",
        description: "Morning favorites and late-day sugar.",
        items: [
          {
            id: "item-pistachio-croissant",
            restaurantId: "rest-berry-bakery",
            sectionId: "section-pastries",
            name: "Pistachio silk croissant",
            description: "Brown butter layers, pistachio frangipane, citrus glaze.",
            price: 6.5,
            tags: ["Bakery"],
            popular: true,
            calories: 430,
            imageTheme: "berry"
          },
          {
            id: "item-soft-serve-affogato",
            restaurantId: "rest-berry-bakery",
            sectionId: "section-pastries",
            name: "Soft-serve affogato",
            description: "Vanilla bean soft serve with dark espresso and cocoa nibs.",
            price: 8.5,
            tags: ["Dessert", "Coffee"],
            calories: 360,
            imageTheme: "coast"
          }
        ]
      }
    ],
    reviews: [
      {
        id: "review-berry-01",
        author: "Talia",
        rating: 5,
        date: "2026-04-11T09:15:00Z",
        title: "The croissant actually stayed crisp",
        body: "Rare bakery delivery win. Great coffee too."
      }
    ]
  }
];

export const orders: Order[] = [
  {
    id: "order-active-01",
    restaurantId: "rest-saffron-lane",
    restaurantName: "Saffron Lane Kitchen",
    status: "on_the_way",
    placedAt: "2026-04-19T16:50:00Z",
    etaMinutes: 12,
    total: 37.24,
    itemsSummary: ["Chicken shawarma plate", "Whipped feta + roasted peppers"],
    deliveryMode: "delivery",
    address: addresses[0],
    paymentLabel: "Visa ending in 1842",
    timeline: [
      {
        id: "event-01",
        label: "Order placed",
        timestamp: "2026-04-19T16:50:00Z",
        complete: true
      },
      {
        id: "event-02",
        label: "Kitchen confirmed",
        timestamp: "2026-04-19T16:53:00Z",
        note: "Started prepping your order",
        complete: true
      },
      {
        id: "event-03",
        label: "Courier picked up",
        timestamp: "2026-04-19T17:10:00Z",
        note: "Approaching Pacific St",
        complete: true
      },
      {
        id: "event-04",
        label: "Arriving soon",
        timestamp: "2026-04-19T17:22:00Z",
        complete: false
      }
    ]
  },
  {
    id: "order-past-01",
    restaurantId: "rest-ember-dough",
    restaurantName: "Ember & Dough",
    status: "delivered",
    placedAt: "2026-04-14T22:10:00Z",
    etaMinutes: 0,
    total: 46.8,
    itemsSummary: ["Hot honey soppressata", "Little gem caesar", "Oven-finished meatballs"],
    deliveryMode: "delivery",
    address: addresses[0],
    paymentLabel: "Visa ending in 1842",
    timeline: [
      {
        id: "past-01-1",
        label: "Delivered",
        timestamp: "2026-04-14T22:48:00Z",
        complete: true
      }
    ]
  },
  {
    id: "order-past-02",
    restaurantId: "rest-mint-press",
    restaurantName: "Mint Press Bowls",
    status: "delivered",
    placedAt: "2026-04-10T18:20:00Z",
    etaMinutes: 0,
    total: 29.5,
    itemsSummary: ["Miso salmon market bowl", "Celery lime tonic"],
    deliveryMode: "pickup",
    address: addresses[1],
    paymentLabel: "Amex ending in 7301",
    timeline: [
      {
        id: "past-02-1",
        label: "Picked up",
        timestamp: "2026-04-10T18:42:00Z",
        complete: true
      }
    ]
  }
];
