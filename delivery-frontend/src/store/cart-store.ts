"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { type CartItem, type CartSelection, type DeliveryMode, type MenuItem } from "@/types";

interface AddToCartPayload {
  restaurantId: string;
  menuItem: MenuItem;
  quantity: number;
  selectedOptions: CartSelection[];
  notes?: string;
}

interface CartState {
  restaurantId: string | null;
  items: CartItem[];
  deliveryMode: DeliveryMode;
  promoCode: string;
  orderNotes: string;
  addItem: (payload: AddToCartPayload) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  setPromoCode: (promoCode: string) => void;
  setOrderNotes: (notes: string) => void;
  setDeliveryMode: (mode: DeliveryMode) => void;
}

function buildCartItemId(menuItemId: string, selectedOptions: CartSelection[], notes?: string) {
  const optionSignature = selectedOptions.map((entry) => entry.optionId).sort().join("-");
  return [menuItemId, optionSignature, notes?.trim() ?? ""].join("::");
}

export function getCartItemUnitPrice(basePrice: number, selections: CartSelection[]) {
  return basePrice + selections.reduce((sum, selection) => sum + selection.priceDelta, 0);
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      restaurantId: null,
      items: [],
      deliveryMode: "delivery",
      promoCode: "",
      orderNotes: "",
      addItem: ({ restaurantId, menuItem, quantity, selectedOptions, notes }) =>
        set((state) => {
          const switchingRestaurants = state.restaurantId && state.restaurantId !== restaurantId;
          const itemId = buildCartItemId(menuItem.id, selectedOptions, notes);
          const existing = state.items.find((entry) => entry.id === itemId);
          const nextItems = switchingRestaurants ? [] : [...state.items];

          if (existing) {
            return {
              restaurantId: restaurantId,
              items: nextItems.map((entry) =>
                entry.id === itemId ? { ...entry, quantity: entry.quantity + quantity } : entry
              ),
              promoCode: switchingRestaurants ? "" : state.promoCode,
              orderNotes: switchingRestaurants ? "" : state.orderNotes
            };
          }

          nextItems.push({
            id: itemId,
            restaurantId,
            menuItemId: menuItem.id,
            name: menuItem.name,
            quantity,
            unitPrice: getCartItemUnitPrice(menuItem.price, selectedOptions),
            selectedOptions,
            notes,
            imageTheme: menuItem.imageTheme
          });

          return {
            restaurantId: restaurantId,
            items: nextItems,
            promoCode: switchingRestaurants ? "" : state.promoCode,
            orderNotes: switchingRestaurants ? "" : state.orderNotes
          };
        }),
      removeItem: (itemId) =>
        set((state) => {
          const nextItems = state.items.filter((item) => item.id !== itemId);
          return {
            items: nextItems,
            restaurantId: nextItems[0]?.restaurantId ?? null
          };
        }),
      updateQuantity: (itemId, quantity) =>
        set((state) => {
          if (quantity <= 0) {
            const nextItems = state.items.filter((item) => item.id !== itemId);
            return {
              items: nextItems,
              restaurantId: nextItems[0]?.restaurantId ?? null
            };
          }

          return {
            items: state.items.map((item) => (item.id === itemId ? { ...item, quantity } : item))
          };
        }),
      clearCart: () => ({
        restaurantId: null,
        items: [],
        promoCode: "",
        orderNotes: ""
      }),
      setPromoCode: (promoCode) => set({ promoCode }),
      setOrderNotes: (orderNotes) => set({ orderNotes }),
      setDeliveryMode: (deliveryMode) => set({ deliveryMode })
    }),
    {
      name: "delivery-cart"
    }
  )
);
