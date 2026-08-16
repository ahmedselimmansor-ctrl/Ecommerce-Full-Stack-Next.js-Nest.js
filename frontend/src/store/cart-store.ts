'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { CartLine, CartSummary } from '@/types';

export interface CartItem {
  variantId: string;
  productId: string;
  slug: string;
  name: string;
  /** Snapshotted so an Arabic bag stays Arabic without a refetch. */
  nameAr: string | null;
  sku: string;
  size: string;
  color: string;
  colorAr: string | null;
  colorHex: string | null;
  imageUrl: string | null;
  unitPriceCents: number;
  quantity: number;
  maxStock: number;
}

export const MAX_PER_VARIANT = 20;

interface CartState {
  items: CartItem[];
  isDrawerOpen: boolean;
  isSyncing: boolean;
  /** Bumped on every local mutation so the sync effect knows to push. */
  revision: number;

  addItem: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  removeItem: (variantId: string) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  clear: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  setSyncing: (value: boolean) => void;
  /** Replace local state with the server's authoritative cart. */
  replaceFromServer: (summary: CartSummary) => void;
}

function toCartItem(line: CartLine): CartItem {
  return {
    variantId: line.variantId,
    productId: line.productId,
    slug: line.slug,
    name: line.name,
    nameAr: line.nameAr,
    sku: line.sku,
    size: line.size,
    color: line.color,
    colorAr: line.colorAr,
    colorHex: line.colorHex,
    imageUrl: line.imageUrl,
    unitPriceCents: line.unitPriceCents,
    quantity: line.quantity,
    maxStock: line.availableStock,
  };
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      isDrawerOpen: false,
      isSyncing: false,
      revision: 0,

      addItem: (item, quantity = 1) =>
        set((state) => {
          const existing = state.items.find((line) => line.variantId === item.variantId);
          const ceiling = Math.min(MAX_PER_VARIANT, item.maxStock || MAX_PER_VARIANT);

          const items = existing
            ? state.items.map((line) =>
                line.variantId === item.variantId
                  ? { ...line, ...item, quantity: Math.min(ceiling, line.quantity + quantity) }
                  : line,
              )
            : [...state.items, { ...item, quantity: Math.min(ceiling, quantity) }];

          return { items, revision: state.revision + 1, isDrawerOpen: true };
        }),

      removeItem: (variantId) =>
        set((state) => ({
          items: state.items.filter((line) => line.variantId !== variantId),
          revision: state.revision + 1,
        })),

      setQuantity: (variantId, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((line) => line.variantId !== variantId)
              : state.items.map((line) =>
                  line.variantId === variantId
                    ? {
                        ...line,
                        quantity: Math.min(quantity, MAX_PER_VARIANT, line.maxStock || MAX_PER_VARIANT),
                      }
                    : line,
                ),
          revision: state.revision + 1,
        })),

      clear: () => set((state) => ({ items: [], revision: state.revision + 1 })),

      openDrawer: () => set({ isDrawerOpen: true }),
      closeDrawer: () => set({ isDrawerOpen: false }),
      setSyncing: (value) => set({ isSyncing: value }),

      // Does not bump `revision`: this state came *from* the server, so pushing
      // it straight back would be a pointless round trip.
      replaceFromServer: (summary) => set({ items: summary.items.map(toCartItem) }),
    }),
    {
      name: 'atelier-cart',
      storage: createJSONStorage(() => localStorage),
      // Bumped: older persisted bags lack nameAr/colorAr.
      version: 2,
      // Transient UI state is never persisted.
      partialize: (state) => ({ items: state.items }) as CartState,
    },
  ),
);

export const selectItemCount = (state: CartState): number =>
  state.items.reduce((total, line) => total + line.quantity, 0);

export const selectSubtotalCents = (state: CartState): number =>
  state.items.reduce((total, line) => total + line.unitPriceCents * line.quantity, 0);
