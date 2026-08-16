'use client';

import { useEffect, useRef } from 'react';
import { api } from '@/lib/api-client';
import { useCartStore } from '@/store/cart-store';
import { useAuthStore } from '@/store/auth-store';
import type { CartSummary, User } from '@/types';

interface CartSyncProps {
  user: User | null;
}

const PUSH_DEBOUNCE_MS = 600;

/**
 * Keeps the persisted client cart and the server cart in agreement.
 *
 * - Guests: everything stays in localStorage, no requests at all.
 * - On sign-in: the local bag is merged into the account bag once, then the
 *   server response becomes the source of truth (live prices and stock).
 * - Afterwards: local edits are pushed with a debounce so rapid quantity
 *   clicking does not fan out into one request per click.
 */
export function CartSync({ user }: CartSyncProps) {
  const setUser = useAuthStore((state) => state.setUser);
  const hasMerged = useRef(false);
  const lastPushedRevision = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setUser(user);
  }, [user, setUser]);

  useEffect(() => {
    if (!user) {
      hasMerged.current = false;
      lastPushedRevision.current = null;
      return;
    }
    if (hasMerged.current) return;
    hasMerged.current = true;

    const { items, replaceFromServer, setSyncing } = useCartStore.getState();

    setSyncing(true);
    api
      .post<CartSummary>('/cart/merge', {
        items: items.map((item) => ({ variantId: item.variantId, quantity: item.quantity })),
      })
      .then((summary) => {
        replaceFromServer(summary);
        lastPushedRevision.current = useCartStore.getState().revision;
      })
      .catch(() => {
        // Offline or an expired session: the local bag still works, and the
        // next successful mutation will reconcile it.
      })
      .finally(() => setSyncing(false));
  }, [user]);

  useEffect(() => {
    if (!user) return;

    return useCartStore.subscribe((state, previous) => {
      if (state.revision === previous.revision) return;
      if (lastPushedRevision.current === null) return; // merge has not finished yet

      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        const current = useCartStore.getState();
        lastPushedRevision.current = current.revision;

        api
          .put<CartSummary>('/cart', {
            items: current.items.map((item) => ({ variantId: item.variantId, quantity: item.quantity })),
          })
          .catch(() => undefined);
      }, PUSH_DEBOUNCE_MS);
    });
  }, [user]);

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  return null;
}
