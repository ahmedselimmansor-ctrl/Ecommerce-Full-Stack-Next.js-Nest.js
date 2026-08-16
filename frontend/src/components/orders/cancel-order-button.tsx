'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { api, ClientApiError } from '@/lib/api-client';
import { useT } from '@/i18n/provider';

export function CancelOrderButton({ orderId }: { orderId: string }) {
  const t = useT();
  const router = useRouter();
  const [isConfirming, setIsConfirming] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const cancel = async () => {
    setIsPending(true);
    try {
      await api.patch(`/orders/${orderId}/cancel`);
      toast.success(t.orders.cancelled, { description: t.orders.cancelledBody });
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ClientApiError ? error.message : t.orders.cancelFailed);
    } finally {
      setIsPending(false);
      setIsConfirming(false);
    }
  };

  // Two-step confirm: cancelling is irreversible from the customer's side.
  if (!isConfirming) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setIsConfirming(true)}>
        {t.orders.cancelOrder}
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-ink-soft">{t.orders.cancelConfirm}</span>
      <Button variant="danger" size="sm" isLoading={isPending} onClick={cancel}>
        {t.orders.cancelYes}
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setIsConfirming(false)}>
        {t.orders.cancelNo}
      </Button>
    </div>
  );
}
