'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api, ClientApiError } from '@/lib/api-client';
import { useI18n } from '@/i18n/provider';
import type { KashierSession } from '@/types';

/**
 * Retry payment for an order that was placed but never paid — the case where a
 * shopper abandons the gateway or the card is declined.
 */
export function PayOrderButton({ orderId }: { orderId: string }) {
  const { t, locale } = useI18n();
  const [isPending, setIsPending] = useState(false);

  const pay = async () => {
    setIsPending(true);
    try {
      const session = await api.post<KashierSession>(`/payments/kashier/session/${orderId}?locale=${locale}`);
      window.location.href = session.checkoutUrl;
    } catch (error) {
      toast.error(error instanceof ClientApiError ? error.message : t.checkout.redirectFailed);
      setIsPending(false);
    }
  };

  return (
    <Button onClick={pay} isLoading={isPending} size="sm">
      <CreditCard className="size-4" aria-hidden />
      {t.payment.payForOrder}
    </Button>
  );
}
