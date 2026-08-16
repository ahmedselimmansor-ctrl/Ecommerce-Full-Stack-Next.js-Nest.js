'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import Image from 'next/image';
import { CreditCard, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api, ClientApiError } from '@/lib/api-client';
import {
  buildCheckoutSchema,
  EGYPT_GOVERNORATES,
  governorateLabel,
  type CheckoutInput,
} from '@/schemas/checkout';
import { selectSubtotalCents, useCartStore } from '@/store/cart-store';
import { Link, useI18n } from '@/i18n/provider';
import { fmt, localized, localizePath } from '@/i18n';
import { formatPrice } from '@/lib/utils';
import { FLAT_SHIPPING_CENTS, FREE_SHIPPING_THRESHOLD_CENTS } from '@/lib/env';
import type { Address, KashierSession, Order, PaymentMethods, User } from '@/types';

interface CheckoutFormProps {
  user: User;
  addresses: Address[];
  paymentMethods: PaymentMethods;
}

export function CheckoutForm({ user, addresses, paymentMethods }: CheckoutFormProps) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const subtotal = useCartStore(selectSubtotalCents);
  const clearCart = useCartStore((state) => state.clear);

  const [isHydrated, setIsHydrated] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  useEffect(() => setIsHydrated(true), []);

  const defaultAddress = addresses.find((address) => address.isDefault) ?? addresses[0];

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutInput>({
    resolver: zodResolver(buildCheckoutSchema(t)),
    defaultValues: {
      fullName: defaultAddress?.fullName ?? `${user.firstName} ${user.lastName}`,
      phone: defaultAddress?.phone ?? user.phone ?? '',
      line1: defaultAddress?.line1 ?? '',
      line2: defaultAddress?.line2 ?? '',
      city: defaultAddress?.city ?? '',
      state: defaultAddress?.state ?? '',
      postalCode: defaultAddress?.postalCode ?? '',
      paymentMethod: 'CASH_ON_DELIVERY',
      notes: '',
    },
  });

  const paymentMethod = watch('paymentMethod');
  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD_CENTS ? 0 : FLAT_SHIPPING_CENTS;

  const onSubmit = handleSubmit(async (values) => {
    if (items.length === 0) {
      toast.error(t.checkout.emptyBagToast);
      return;
    }

    try {
      // The server re-prices every line and re-checks stock; what we send is a
      // request, not a quote.
      const order = await api.post<Order>('/orders', {
        items: items.map((item) => ({ variantId: item.variantId, quantity: item.quantity })),
        shippingAddress: {
          fullName: values.fullName,
          phone: values.phone,
          line1: values.line1,
          line2: values.line2 || undefined,
          city: values.city,
          state: values.state,
          postalCode: values.postalCode || undefined,
          country: 'EG',
        },
        paymentMethod: values.paymentMethod,
        notes: values.notes || undefined,
      });

      // The bag is cleared either way: the order now owns the reserved stock,
      // and an unpaid order stays payable from the order page.
      clearCart();

      if (values.paymentMethod === 'CARD') {
        setIsRedirecting(true);
        toast.loading(t.checkout.redirecting, { id: 'kashier' });

        try {
          const session = await api.post<KashierSession>(
            `/payments/kashier/session/${order.id}?locale=${locale}`,
          );
          window.location.href = session.checkoutUrl;
          return;
        } catch (error) {
          toast.dismiss('kashier');
          setIsRedirecting(false);
          toast.error(error instanceof ClientApiError ? error.message : t.checkout.redirectFailed);
          router.push(localizePath(`/orders/${order.id}`, locale));
          return;
        }
      }

      toast.success(fmt(t.checkout.orderConfirmed, { number: order.orderNumber }), {
        description: t.checkout.orderConfirmedBody,
      });
      router.push(localizePath(`/orders/${order.id}`, locale));
    } catch (error) {
      toast.error(error instanceof ClientApiError ? error.message : t.checkout.orderFailed);
    }
  });

  if (!isHydrated) {
    return <div className="py-20" aria-busy="true" />;
  }

  if (items.length === 0) {
    return (
      <div className="border border-dashed border-line px-6 py-20 text-center">
        <p className="text-sm text-ink-soft">{t.checkout.emptyBag}</p>
        <Link
          href="/products"
          className="mt-4 inline-block border-b border-ink pb-0.5 text-xs uppercase tracking-[0.14em] tracking-wide-latin"
        >
          {t.cart.browse}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-12 lg:grid-cols-[1fr_360px]">
      <div className="space-y-10">
        <section>
          <h2 className="eyebrow mb-5">{t.checkout.shippingAddress}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t.checkout.fullName} error={errors.fullName?.message} className="sm:col-span-2">
              <input {...register('fullName')} className="field" aria-invalid={Boolean(errors.fullName)} />
            </Field>

            <Field label={t.checkout.phone} error={errors.phone?.message}>
              <input {...register('phone')} inputMode="tel" dir="ltr" placeholder="01012345678" className="field" />
            </Field>

            <Field label={t.checkout.governorate} error={errors.state?.message}>
              <select {...register('state')} className="field">
                <option value="">{t.checkout.selectPlaceholder}</option>
                {EGYPT_GOVERNORATES.map((governorate) => (
                  <option key={governorate.value} value={governorate.value}>
                    {governorateLabel(governorate, locale)}
                  </option>
                ))}
              </select>
            </Field>

            <Field label={t.checkout.streetAddress} error={errors.line1?.message} className="sm:col-span-2">
              <input {...register('line1')} className="field" placeholder={t.checkout.streetPlaceholder} />
            </Field>

            <Field
              label={fmt(t.checkout.apartment, { optional: t.common.optional })}
              error={errors.line2?.message}
              className="sm:col-span-2"
            >
              <input {...register('line2')} className="field" />
            </Field>

            <Field label={t.checkout.city} error={errors.city?.message}>
              <input {...register('city')} className="field" />
            </Field>

            <Field
              label={fmt(t.checkout.postalCode, { optional: t.common.optional })}
              error={errors.postalCode?.message}
            >
              <input {...register('postalCode')} dir="ltr" className="field" />
            </Field>
          </div>
        </section>

        <section>
          <h2 className="eyebrow mb-5">{t.checkout.payment}</h2>
          <div className="space-y-3">
            <label className="flex cursor-pointer items-start gap-3 border border-line bg-surface p-4 has-[:checked]:border-ink">
              <input type="radio" value="CASH_ON_DELIVERY" {...register('paymentMethod')} className="mt-1" />
              <Truck className="mt-0.5 size-4 text-ink-soft" aria-hidden />
              <span>
                <span className="block text-sm">{t.checkout.codTitle}</span>
                <span className="block text-xs text-ink-soft">{t.checkout.codBody}</span>
              </span>
            </label>

            <label
              className={`flex items-start gap-3 border border-line p-4 ${
                paymentMethods.card
                  ? 'cursor-pointer bg-surface has-[:checked]:border-ink'
                  : 'cursor-not-allowed bg-paper-dim opacity-60'
              }`}
            >
              <input
                type="radio"
                value="CARD"
                disabled={!paymentMethods.card}
                {...register('paymentMethod')}
                className="mt-1"
              />
              <CreditCard className="mt-0.5 size-4 text-ink-soft" aria-hidden />
              <span>
                <span className="block text-sm">{t.checkout.cardTitle}</span>
                <span className="block text-xs text-ink-soft">
                  {paymentMethods.card ? t.checkout.cardBody : t.checkout.cardUnavailable}
                </span>
              </span>
            </label>
          </div>
          {errors.paymentMethod && <p className="mt-1 text-xs text-clay">{errors.paymentMethod.message}</p>}
        </section>

        <section>
          <h2 className="eyebrow mb-5">{fmt(t.checkout.notes, { optional: t.common.optional })}</h2>
          <textarea
            {...register('notes')}
            rows={3}
            className="field resize-none"
            placeholder={t.checkout.notesPlaceholder}
          />
          {errors.notes && <p className="mt-1 text-xs text-clay">{errors.notes.message}</p>}
        </section>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="border border-line bg-surface p-6">
          <h2 className="eyebrow mb-5">{t.checkout.yourOrder}</h2>

          <ul className="mb-5 space-y-4">
            {items.map((item) => (
              <li key={item.variantId} className="flex gap-3">
                <div className="relative aspect-portrait w-12 shrink-0 bg-paper-dim">
                  {item.imageUrl && <Image src={item.imageUrl} alt="" fill sizes="48px" className="object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs">{localized(locale, item.name, item.nameAr)}</p>
                  <p className="text-xs text-ink-faint">
                    {localized(locale, item.color, item.colorAr)} · {item.size} · ×{item.quantity}
                  </p>
                </div>
                <span className="text-xs tabular-nums">
                  {formatPrice(item.unitPriceCents * item.quantity, undefined, locale)}
                </span>
              </li>
            ))}
          </ul>

          <dl className="space-y-2 border-t border-line pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-soft">{t.common.subtotal}</dt>
              <dd className="tabular-nums">{formatPrice(subtotal, undefined, locale)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-soft">{t.common.shipping}</dt>
              <dd className="tabular-nums">
                {shipping === 0 ? t.common.free : formatPrice(shipping, undefined, locale)}
              </dd>
            </div>
            <div className="flex justify-between border-t border-line pt-2 text-base">
              <dt>{t.common.total}</dt>
              <dd className="tabular-nums">{formatPrice(subtotal + shipping, undefined, locale)}</dd>
            </div>
          </dl>

          <Button type="submit" size="lg" fullWidth isLoading={isSubmitting || isRedirecting} className="mt-6">
            {paymentMethod === 'CARD' ? t.checkout.payNow : t.checkout.placeOrder}
          </Button>
        </div>
      </aside>
    </form>
  );
}

function Field({
  label,
  error,
  className,
  children,
}: {
  label: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className="eyebrow mb-1.5 block">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-clay">{error}</p>}
    </div>
  );
}
