'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useT } from '@/i18n/provider';
import type { Order } from '@/types';

const POLL_INTERVAL_MS = 3000;
const MAX_ATTEMPTS = 10; // ~30 seconds, then stop and let the shopper move on.

/**
 * Waits for the Kashier webhook to land.
 *
 * The redirect usually beats the server-to-server callback by a second or two.
 * Rather than showing a permanent "pending", this polls the order a bounded
 * number of times and refreshes the page as soon as the status settles.
 */
export function PaymentPoller({ orderId }: { orderId: string }) {
  const t = useT();
  const router = useRouter();
  const [isPolling, setIsPolling] = useState(true);
  const attempts = useRef(0);

  useEffect(() => {
    let cancelled = false;

    const timer = setInterval(async () => {
      attempts.current += 1;

      if (attempts.current > MAX_ATTEMPTS) {
        clearInterval(timer);
        if (!cancelled) setIsPolling(false);
        return;
      }

      try {
        const order = await api.get<Order>(`/orders/${orderId}`);
        if (order.paymentStatus === 'PAID' || order.paymentStatus === 'FAILED') {
          clearInterval(timer);
          if (!cancelled) router.refresh();
        }
      } catch {
        // A transient failure is fine; the next tick tries again.
      }
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [orderId, router]);

  if (!isPolling) return null;

  return (
    <p className="flex items-center gap-2 text-xs text-ink-faint">
      <Loader2 className="size-3.5 animate-spin" aria-hidden />
      {t.payment.verifying}
    </p>
  );
}
