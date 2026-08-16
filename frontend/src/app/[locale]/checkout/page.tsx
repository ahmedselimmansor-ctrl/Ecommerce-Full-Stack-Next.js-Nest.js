import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { CheckoutForm } from '@/components/forms/checkout-form';
import { getAddresses, getCurrentUser, getPaymentMethods } from '@/lib/queries';
import { getDictionary, toLocale } from '@/i18n';
import type { Address, PaymentMethods } from '@/types';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const t = getDictionary(toLocale((await params).locale));
  return { title: t.checkout.title, robots: { index: false, follow: false } };
}

export default async function CheckoutPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = toLocale((await params).locale);
  const t = getDictionary(locale);

  const user = await getCurrentUser();
  // Guests are sent to sign in and returned here afterwards.
  if (!user) redirect(`/${locale}/login?next=/${locale}/checkout`);

  const [addresses, paymentMethods] = await Promise.all([
    getAddresses().catch((): Address[] => []),
    getPaymentMethods().catch(
      (): PaymentMethods => ({ cashOnDelivery: true, card: false, provider: null }),
    ),
  ]);

  return (
    <div className="container-page py-10">
      <h1 className="mb-8 font-display text-4xl">{t.checkout.title}</h1>
      <CheckoutForm user={user} addresses={addresses} paymentMethods={paymentMethods} />
    </div>
  );
}
